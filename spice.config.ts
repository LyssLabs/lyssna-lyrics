import { ClientKey, LyssnaLogo, LyssnaMicrophonePaths } from "./project/assets.mjs";
import { defineConfig } from "@spicemod/creator";
import { ProjectName, ProjectVersion } from "./project/config";

export default defineConfig({
  name: ProjectName,
  version: process.env.SPICY_LYRICS_BUILD_VERSION ?? ProjectVersion,
  framework: "react",
  linter: "oxlint",
  template: "extension",
  packageManager: "bun",
  cssId: "slstyles",
  devModeVarName: "__SLdev__m",
  esbuildOptions: {
    legalComments: "inline",
    define: {
      __LYSSNA_LYRICS_CLIENT_KEY__: JSON.stringify(ClientKey),
      __LYSSNA_LOGO__: JSON.stringify(LyssnaLogo),
      __LYSSNA_MICROPHONE_PATHS__: JSON.stringify(LyssnaMicrophonePaths),
    },
  },
});
