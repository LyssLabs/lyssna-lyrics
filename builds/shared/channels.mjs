export const CHANNEL_PREFIX = "LyssnaLyrics-";
export const CHANNELS_CHANGED_EVENT = "spicy-lyrics:channels-changed";
export const DEFAULT_CHANNEL = "Lyssna";
export const DEFAULT_BUILD_HOST = "ipixelgalaxy.com";
/** @type {Record<string, [string, string] | [string, string, string]>} */
export const BUILT_IN_CHANNELS = {
  Lyssna: [DEFAULT_BUILD_HOST, DEFAULT_BUILD_HOST],
  "Spicy Lyrics": ["api.spicylyrics.org", "public.storage.spicylyrics.org"],
};
const storage = () => globalThis.Spicetify.LocalStorage;
const get = key => storage().get(`${CHANNEL_PREFIX}${key}`);
const set = (key, value) => storage().set(`${CHANNEL_PREFIX}${key}`, value);
const reserved = new Set([...Object.keys(BUILT_IN_CHANNELS), "Stable", "Beta", "__proto__", "constructor", "prototype"]);
export const isReservedChannelName = name => reserved.has(name);

export function isAllowedBuildHost(host) {
  if (typeof host !== "string" || !host.trim()) return false;
  try {
    const url = new URL(`https://${host}`);
    return !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

export function readCustomChannels() {
  try {
    const raw = get("customChannels") ?? storage().get("SpicyLyrics-customChannels");
    const parsed = JSON.parse(raw ?? "{}");
    const channels = Object.create(null);
    for (const [name, hosts] of Object.entries(parsed)) {
      if (!name.trim() || reserved.has(name) || !Array.isArray(hosts) || (hosts.length !== 2 && hosts.length !== 3)) continue;
      if (!hosts.every(host => typeof host === "string") || !isAllowedBuildHost(hosts[0]) || !isAllowedBuildHost(hosts[1])) continue;
      channels[name] = hosts;
    }
    if (get("customChannels") == null) set("customChannels", JSON.stringify(channels));
    return channels;
  } catch { return Object.create(null); }
}

export function getChannelMap() {
  return { ...BUILT_IN_CHANNELS, ...readCustomChannels() };
}

export function getCurrentChannel() {
  const map = getChannelMap();
  let selected = get("buildChannel");
  if (selected == null) {
    const previous = storage().get("SpicyLyrics-buildChannel");
    selected = typeof previous === "string" && Object.hasOwn(map, previous) ? previous : DEFAULT_CHANNEL;
  }
  // The previous Lyssna loader used Stable and Beta for this fork's host.
  if (selected === "Stable" || selected === "Beta" || !Object.hasOwn(map, selected)) selected = DEFAULT_CHANNEL;
  if (get("buildChannel") !== selected) set("buildChannel", selected);
  return selected;
}

function mirrorLegacyChannels(channels) {
  const mirror = { ...channels, Lyssna: [...BUILT_IN_CHANNELS.Lyssna] };
  storage().set("SpicyLyrics-customChannels", JSON.stringify(mirror));
  // Older installed launchers expose custom branches only after this flag.
  storage().set("SpicyLyrics-customChannelsEnabled", "true");
}

export function saveCustomChannels(channels) {
  set("customChannels", JSON.stringify(channels));
  mirrorLegacyChannels(readCustomChannels());
  globalThis.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT));
}

export function setCurrentChannel(name) {
  const map = getChannelMap();
  const selected = Object.hasOwn(map, name) ? name : DEFAULT_CHANNEL;
  set("buildChannel", selected);
  mirrorLegacyChannels(readCustomChannels());
  storage().set("SpicyLyrics-buildChannel", selected === "Spicy Lyrics" ? "Stable" : selected);
  globalThis.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT));
}

export function selectedChannel() {
  const name = getCurrentChannel();
  const hosts = getChannelMap()[name];
  const runtime = globalThis._lyssna_lyrics_channel;
  return {
    name,
    apiHost: hosts[0],
    storageHost: hosts[1],
    fixedVersion: typeof hosts[2] === "string" && hosts[2].trim() ? hosts[2].trim() : runtime?.name === name ? runtime.fixedVersion : null,
    bundleName: name === "Lyssna" ? "lyssna-lyrics" : "spicy-lyrics",
  };
}
