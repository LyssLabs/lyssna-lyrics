import { LyssnaLogo, LyssnaMicrophonePaths } from "./project/assets.mjs";
import { defineConfig } from "@spicemod/creator";
import { ProjectName, ProjectVersion } from "./project/config";
const buildVersion = (globalThis as any).process?.env?.LYSSNA_LYRICS_BUILD_VERSION ?? ProjectVersion;

export default defineConfig({
  name: ProjectName,
  version: buildVersion,
  framework: "react",
  linter: "oxlint",
  template: "extension",
  packageManager: "bun",
  cssId: "lyssna-lyrics-styles",
  devModeVarName: "__LYSSNA_LYRICS_DEV__",
  esbuildOptions: {
    legalComments: "inline",
    define: {
      __LYSSNA_BUILD_VERSION__: JSON.stringify(buildVersion),
      __LYSSNA_LOGO__: JSON.stringify(LyssnaLogo),
      __LYSSNA_MICROPHONE_PATHS__: JSON.stringify(LyssnaMicrophonePaths),
    },
  },
});
