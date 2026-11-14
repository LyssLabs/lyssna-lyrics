import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { Script } from "node:vm";

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

const TEST_BUILD_VERSION = "100.10.0";
const parsedArgs = parseArgs(process.argv.slice(2));
const version = parsedArgs.testBuild ? TEST_BUILD_VERSION : parsedArgs.version;
const { targetDir } = parsedArgs;

if (!version) {
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
    SPICY_LYRICS_BUILD_VERSION: version,
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
  "--define", `__LYSSNA_ENTRY_TEST_VERSION__=${parsedArgs.testBuild ? JSON.stringify(version) : "null"}`,
], { stdio: "inherit", windowsHide: true });
if (entrypointBuild.status !== 0) process.exit(entrypointBuild.status ?? 1);

try {
  const builtFile = getBuiltJsFile(defaultDist, projectName);
  for (const filename of outputFiles) {
    copyFileReplacing(builtFile, join(defaultDist, filename));
  }
  const bridgeName = "lyssna-lyrics-bridge.html";
  const bridgeSource = readFileSync(resolve("website", bridgeName), "utf8");
  for (const script of bridgeSource.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    new Script(script[1], { filename: bridgeName });
  }
  copyFileReplacing(resolve("website", bridgeName), join(defaultDist, bridgeName));
  const launcherFiles = ["lyssna-lyrics.mjs", "spicy-lyrics.mjs", "spicy-lyrics-pixel.mjs"];
  for (const filename of launcherFiles) copyFileReplacing(resolve("builds", filename), join(defaultDist, filename));
  if (!parsedArgs.testBuild) {
    writeFileReplacing(join(defaultDist, "version"), version);
  }

  if (targetDir) {
    const dest = resolve(targetDir);
    mkdirSync(dest, { recursive: true });
    for (const filename of outputFiles) {
      copyFileReplacing(join(defaultDist, filename), join(dest, filename));
    }
    copyFileReplacing(resolve("website", bridgeName), join(dest, bridgeName));
    copyFileReplacing(entrypointFile, join(dest, "entrypoint.mjs"));
    for (const filename of launcherFiles) copyFileReplacing(join(defaultDist, filename), join(dest, filename));
    if (!parsedArgs.testBuild) {
      writeFileReplacing(join(dest, "version"), version);
    }
    console.log(`Copied ${parsedArgs.testBuild ? "test " : ""}build to ${dest}`);
  }
} catch (error) {
  console.error("Error copying build output:", error);
  process.exit(1);
}
