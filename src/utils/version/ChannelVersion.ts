import { selectedChannel } from "./Channels.ts";
import { channelVersionUrl, readChannelVersion } from "../../../builds/shared/build-paths.mjs";
import { fetchGitHubRelease } from "../../../builds/shared/github-release.mjs";
const VERSION_TIMEOUT_MS = 5000;
// A branch selection takes effect on reload; check updates for the app running now.
const loadedChannel = selectedChannel();

export async function fetchSelectedChannelVersion(): Promise<string | undefined> {
  const channel = loadedChannel;
  if (channel.fixedVersion) return undefined;
  if (channel.name === "Lyssna") {
    try { return (await fetchGitHubRelease("lyssna-lyrics", (value: string) => `lyssna-lyrics@${value}.mjs`)).version; }
    catch (error) { console.warn("GitHub release check unavailable; checking the Lyssna website:", error); }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), VERSION_TIMEOUT_MS);
  try {
    const response = await fetch(channelVersionUrl(channel), {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Version request failed with HTTP ${response.status}`);
    const version = await readChannelVersion(channel, response);
    if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version)) {
      throw new Error(`Unexpected version response: ${JSON.stringify(String(version).slice(0, 40))}`);
    }
    return version;
  } finally {
    window.clearTimeout(timeout);
  }
}
