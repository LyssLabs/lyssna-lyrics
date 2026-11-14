import { channelApp } from "./build-paths.mjs";

export const CHANNEL_PREFIX = "LyssnaLyrics-";
export const CHANNELS_CHANGED_EVENT = "lyssna-lyrics:channels-changed";
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

function parseChannels(raw) {
  try {
    const parsed = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const channels = Object.create(null);
    for (const [name, hosts] of Object.entries(parsed)) {
      if (!name.trim() || reserved.has(name) || !Array.isArray(hosts) || (hosts.length !== 2 && hosts.length !== 3)) continue;
      if (!hosts.every(host => typeof host === "string") || !isAllowedBuildHost(hosts[0]) || !isAllowedBuildHost(hosts[1])) continue;
      channels[name] = hosts;
    }
    return channels;
  } catch { return null; }
}

function preserveChannels(channels) {
  const json = JSON.stringify(channels);
  if (get("customChannels") !== json) set("customChannels", json);
  if (get("customChannels") !== json) throw new Error("Could not save Lyssna build channels");
}

export function readCustomChannels() {
  const raw = get("customChannels");
  const own = parseChannels(raw);
  const legacyRaw = storage().get("SpicyLyrics-customChannels");
  const legacy = parseChannels(legacyRaw);
  if (!own) return legacy ?? Object.create(null);
  try {
    if (raw == null) {
      const imported = legacy ?? own;
      preserveChannels(imported);
      return imported;
    }
  } catch (error) {
    console.warn("Lyssna Lyrics preserved build channels after a synchronization error:", error);
  }
  return own;
}

export function getChannelMap() {
  return { ...BUILT_IN_CHANNELS, ...readCustomChannels() };
}

export function getCurrentChannel() {
  const map = getChannelMap();
  let selected = get("buildChannel");
  const legacy = storage().get("SpicyLyrics-buildChannel");
  const legacySelection = legacy === "Stable" || legacy === "Beta" ? "Spicy Lyrics" : legacy;
  // Import an older launcher once; an independently enabled Spicy loader owns its keys.
  if (selected == null && typeof legacySelection === "string" && Object.hasOwn(map, legacySelection)) selected = legacySelection;
  if (typeof selected !== "string" || selected === "Stable" || selected === "Beta" || !Object.hasOwn(map, selected)) selected = DEFAULT_CHANNEL;
  if (get("buildChannel") !== selected) set("buildChannel", selected);
  return selected;
}

export function saveCustomChannels(channels) {
  preserveChannels(channels);
  globalThis.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT));
}

export function setCurrentChannel(name) {
  const map = getChannelMap();
  const selected = Object.hasOwn(map, name) ? name : DEFAULT_CHANNEL;
  set("buildChannel", selected);
  globalThis.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT));
}

export function selectedChannel() {
  const name = getCurrentChannel();
  const hosts = getChannelMap()[name];
  const runtime = globalThis._lyssna_lyrics_channel;
  const app = channelApp({ name, storageHost: hosts[1] });
  return {
    name,
    apiHost: hosts[0],
    storageHost: hosts[1],
    fixedVersion: typeof hosts[2] === "string" && hosts[2].trim() ? hosts[2].trim() : runtime?.name === name ? runtime.fixedVersion : null,
    app,
    bundleName: app === "spicy" ? "spicy-lyrics" : "lyssna-lyrics",
  };
}
