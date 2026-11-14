export const PLUGIN_DIRECTORY = "lyssna-plugin";
export const BUNDLES_DIRECTORY = "builds";
export const TEST_BUILD_VERSION = "0.0.0";

export function channelApp(channel) {
  return channel.name === "Spicy Lyrics" || new URL(`https://${channel.storageHost}`).hostname === "public.storage.spicylyrics.org"
    ? "spicy" : "lyssna";
}

const hostUrl = host => `https://${host.replace(/\/+$/, "")}`;

export function channelVersionUrl(channel) {
  return `${hostUrl(channel.apiHost)}${channelApp(channel) === "spicy" ? "" : `/${PLUGIN_DIRECTORY}`}/version`;
}

export function channelBundleUrl(channel, version) {
  const official = channelApp(channel) === "spicy";
  const base = official ? "" : `/${PLUGIN_DIRECTORY}/${BUNDLES_DIRECTORY}`;
  return `${hostUrl(channel.storageHost)}${base}/${official ? "spicy-lyrics" : "lyssna-lyrics"}@${encodeURIComponent(version)}.mjs`;
}
