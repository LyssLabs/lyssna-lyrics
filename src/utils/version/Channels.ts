export const CHANNEL_PREFIX = "LyssnaLyrics-";
export const DEFAULT_BUILD_HOST = "ipixelgalaxy.com";
export type ChannelHosts = [string, string] | [string, string, string];

export function isAllowedBuildHost(host: string): boolean {
  try {
    const url = new URL(`https://${host}`);
    return !/(^|\.)(spicylyrics\.org|spikerko\.org)$/i.test(url.hostname)
      && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function readCustomChannels(): Record<string, ChannelHosts> {
  try {
    const own = Spicetify.LocalStorage.get(`${CHANNEL_PREFIX}customChannels`);
    const raw = own ?? Spicetify.LocalStorage.get("SpicyLyrics-customChannels");
    const parsed = JSON.parse(raw ?? "{}");
    const channels: Record<string, ChannelHosts> = {};
    for (const [name, hosts] of Object.entries(parsed)) {
      if (name === "Stable" || name === "Beta") continue;
      if (!Array.isArray(hosts) || (hosts.length !== 2 && hosts.length !== 3) || !hosts.every(h => typeof h === "string")) continue;
      if (!isAllowedBuildHost(hosts[0]) || !isAllowedBuildHost(hosts[1])) continue;
      channels[name] = hosts as ChannelHosts;
    }
    if (own === null || own === undefined) {
      Spicetify.LocalStorage.set(`${CHANNEL_PREFIX}customChannels`, JSON.stringify(channels));
      const oldSelection = Spicetify.LocalStorage.get("SpicyLyrics-buildChannel");
      if (oldSelection && Object.hasOwn(channels, oldSelection)) {
        Spicetify.LocalStorage.set(`${CHANNEL_PREFIX}buildChannel`, oldSelection);
      }
    }
    return channels;
  } catch {
    return {};
  }
}
