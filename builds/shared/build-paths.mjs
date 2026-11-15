export const PLUGIN_DIRECTORY = "lyssna-plugin";
export const BUNDLES_DIRECTORY = "builds";
export const TEST_BUILD_VERSION = "0.0.0";

export function channelApp(channel) {
  return channel.name === "Spicy Lyrics" || new URL(`https://${channel.storageHost}`).hostname === "public.storage.spicylyrics.org"
    ? "spicy" : "lyssna";
}

const hostUrl = host => `https://${host.replace(/\/+$/, "")}`;

export function channelVersionUrl(channel) {
  return channelApp(channel) === "spicy"
    ? `${hostUrl(channel.apiHost)}/bp/loader/grabClientInfo`
    : `${hostUrl(channel.apiHost)}/${PLUGIN_DIRECTORY}/version`;
}

export async function readChannelVersion(channel, response) {
  if (channelApp(channel) === "spicy") {
    const info = await response.json();
    return Array.isArray(info?.branches)
      ? info.branches.find(branch => branch?.tag === "public")?.version
      : undefined;
  }
  return (await response.text()).trim();
}

export function channelBundleUrl(channel, version) {
  const official = channelApp(channel) === "spicy";
  if (official) return `${hostUrl(channel.apiHost)}/bp/loader/grabPluginFile`;
  return `${hostUrl(channel.storageHost)}/${PLUGIN_DIRECTORY}/${BUNDLES_DIRECTORY}/lyssna-lyrics@${encodeURIComponent(version)}.mjs`;
}
