declare const __LYSSNA_LOGO__: string;

export const LYSSNA_LOGO = __LYSSNA_LOGO__;
document.documentElement.style.setProperty("--lyssna-logo", `url("${LYSSNA_LOGO}")`);
export const DISCORD_URL = "https://discord.gg/qfYAsFQawp";
export const STANDALONE_DOWNLOAD_URL = "https://clypdat.xyz/lyssna-latest/lyssna-setup.exe";
export const WEBSITE_URL = "https://github.com/Stormanzanii/Lyssna";

export function openExternal(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
