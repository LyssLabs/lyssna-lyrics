import { ClientKey, LyssnaLogo, LyssnaMicrophonePaths } from "./project/assets.mjs";
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
  cssId: "slstyles",
  devModeVarName: "__SLdev__m",
  esbuildOptions: {
    legalComments: "inline",
    define: {
      __LYSSNA_BUILD_VERSION__: JSON.stringify(buildVersion),
      __LYSSNA_LYRICS_CLIENT_KEY__: JSON.stringify(ClientKey),
      __LYSSNA_LOGO__: JSON.stringify(LyssnaLogo),
      __LYSSNA_MICROPHONE_PATHS__: JSON.stringify(LyssnaMicrophonePaths),
    },
  },
});
