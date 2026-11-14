import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";
import { PLUGIN_DIRECTORY, BUNDLES_DIRECTORY, TEST_BUILD_VERSION } from "../builds/shared/build-paths.mjs";
import { isLyricsVersion } from "../builds/shared/app-state.mjs";

const require = createRequire(import.meta.url);

function parseArgs(args) {
  let version;
  let targetDir;
  let testBuild = false;
  const positional = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "-test" || arg === "--test") {
      testBuild = true;
      continue;
    }

    if (arg === "--version" || arg === "-v") {
      version = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--version=")) {
      version = arg.slice("--version=".length);
      continue;
    }

    if (arg === "--out" || arg === "--output" || arg === "--target-dir") {
      targetDir = args[i + 1];
      i += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      targetDir = arg.slice("--out=".length);
      continue;
    }

    if (arg.startsWith("--output=")) {
      targetDir = arg.slice("--output=".length);
      continue;
    }

    if (arg.startsWith("--target-dir=")) {
      targetDir = arg.slice("--target-dir=".length);
      continue;
    }

    positional.push(arg);
  }

  if (testBuild) {
    targetDir ??= positional[0];
  } else if (!version) {
    version = positional[0];
    targetDir ??= positional[1];
  } else {
    targetDir ??= positional[0];
  }

  return { version, targetDir, testBuild };
}

function readProjectName() {
  const configPath = resolve("project/config.ts");
  const config = existsSync(configPath) ? String(require("node:fs").readFileSync(configPath)) : "";
  const match = config.match(/ProjectName\s*=\s*["']([^"']+)["']/);
  return match?.[1] ?? "lyssna-lyrics";
}

function getBuiltJsFile(distDir, projectName) {
  const preferred = join(distDir, `${projectName}.js`);
  if (existsSync(preferred)) return preferred;

  const files = readdirSync(distDir).filter((file) => file.endsWith(".js"));
  if (files.length === 1) return join(distDir, files[0]);

  throw new Error(`Could not find built JS output in ${distDir}`);
}

function replaceOnPermissionError(path, write) {
  try {
    write();
    return;
  } catch (error) {
    if (!existsSync(path) || (error?.code !== "EACCES" && error?.code !== "EPERM")) {
      throw error;
    }

    unlinkSync(path);
    write();
  }
}

function copyFileReplacing(source, destination) {
  replaceOnPermissionError(destination, () => copyFileSync(source, destination));
}

function writeFileReplacing(destination, contents) {
  replaceOnPermissionError(destination, () => writeFileSync(destination, contents));
}

const parsedArgs = parseArgs(process.argv.slice(2));
const version = parsedArgs.testBuild ? TEST_BUILD_VERSION : parsedArgs.version;
const { targetDir } = parsedArgs;

if (!isLyricsVersion(version)) {
  console.error("Usage: bun run build --version <version> [outputDir]");
  console.error("   or: node project/build.mjs --version <version> [outputDir]");
  console.error("   or: node project/build.mjs -test [outputDir]");
  process.exit(1);
}

const projectName = readProjectName();
const defaultDist = resolve("dist");
const outputFile = `${projectName}@${version}.mjs`;
const outputFiles = [...new Set([outputFile, `spicy-lyrics@${version}.mjs`])];
const creatorBin = require.resolve("@spicemod/creator/bin");

const result = spawnSync(process.execPath, [creatorBin, "build", "--no-copy"], {
  cwd: resolve("."),
  env: {
    ...process.env,
    LYSSNA_LYRICS_BUILD_VERSION: version,
  },
  stdio: "inherit",
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const entrypointFile = join(defaultDist, "entrypoint.mjs");
const entrypointBuild = spawnSync("bun", [
  "build", "builds/main/entrypoint.mjs", "--target", "browser", "--format", "esm",
  "--outfile", entrypointFile,
], { stdio: "inherit", windowsHide: true });
if (entrypointBuild.status !== 0) process.exit(entrypointBuild.status ?? 1);

try {
  const builtFile = getBuiltJsFile(defaultDist, projectName);
  for (const filename of outputFiles) {
    copyFileReplacing(builtFile, join(defaultDist, filename));
  }
  const bridgeName = "lyssna-lyrics-bridge.html";
  const bridgeSource = readFileSync(resolve("website", bridgeName), "utf8");
  for (const script of bridgeSource.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    new Script(script[1], { filename: bridgeName });
  }
  const launcherFiles = ["lyssna-lyrics.mjs", "spicy-lyrics.mjs", "spicy-lyrics-pixel.mjs"];

  function publishOutput(dest) {
    const pluginDir = join(dest, PLUGIN_DIRECTORY);
    const bundlesDir = join(pluginDir, BUNDLES_DIRECTORY);
    mkdirSync(bundlesDir, { recursive: true });
    copyFileReplacing(resolve("website", "download.html"), join(pluginDir, "download.html"));

    // Copy existing releases before publishing the new manifest or entrypoint.
    // Canonical filenames take precedence when both older aliases exist.
    const existing = readdirSync(dest).filter(name => /^(?:lyssna|spicy)-lyrics@.+\.mjs$/.test(name)).sort();
    for (const filename of existing) {
      const releaseVersion = filename.match(/@(.+)\.mjs$/)?.[1];
      if (!isLyricsVersion(releaseVersion)) continue;
      for (const alias of [filename, `lyssna-lyrics@${releaseVersion}.mjs`]) {
        const migrated = join(bundlesDir, alias);
        if (!existsSync(migrated)) copyFileReplacing(join(dest, filename), migrated);
      }
    }
    for (const filename of outputFiles) {
      const source = join(defaultDist, filename);
      copyFileReplacing(source, join(bundlesDir, filename));
      if (resolve(dest) !== defaultDist) copyFileReplacing(source, join(dest, filename));
    }
    for (const directory of [pluginDir, dest]) {
      copyFileReplacing(resolve("website", bridgeName), join(directory, bridgeName));
      if (resolve(directory) !== defaultDist) copyFileReplacing(entrypointFile, join(directory, "entrypoint.mjs"));
      for (const filename of launcherFiles) copyFileReplacing(resolve("builds", filename), join(directory, filename));
    }
    if (!parsedArgs.testBuild) {
      writeFileReplacing(join(pluginDir, "version"), version);
      writeFileReplacing(join(dest, "version"), version);
    } else if (!existsSync(join(pluginDir, "version")) && existsSync(join(dest, "version"))) {
      const stableVersion = readFileSync(join(dest, "version"), "utf8").trim();
      if (isLyricsVersion(stableVersion) && existsSync(join(bundlesDir, `lyssna-lyrics@${stableVersion}.mjs`))) {
        copyFileReplacing(join(dest, "version"), join(pluginDir, "version"));
      }
    }
  }

  publishOutput(defaultDist);
  if (targetDir) {
    const dest = resolve(targetDir);
    if (dest !== defaultDist) publishOutput(dest);
    console.log(`Copied ${parsedArgs.testBuild ? "test " : ""}build to ${dest}`);
  }
} catch (error) {
  console.error("Error copying build output:", error);
  process.exit(1);
}
