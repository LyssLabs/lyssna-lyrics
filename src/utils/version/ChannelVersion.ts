import { selectedChannel } from "./Channels.ts";
const VERSION_TIMEOUT_MS = 5000;
// A branch selection takes effect on reload; check updates for the app running now.
const loadedChannel = selectedChannel();

export async function fetchSelectedChannelVersion(): Promise<string | undefined> {
  const channel = loadedChannel;
  if (channel.fixedVersion) return undefined;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), VERSION_TIMEOUT_MS);
  try {
    const response = await fetch(`https://${channel.apiHost}/version`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Version request failed with HTTP ${response.status}`);
    const version = (await response.text()).trim();
    if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
      throw new Error(`Unexpected version response: ${JSON.stringify(version.slice(0, 40))}`);
    }
    return version;
  } finally {
    window.clearTimeout(timeout);
  }
}
