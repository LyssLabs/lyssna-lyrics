import type { LyricsSourceProviderId } from "./LyricsSourcePreferences.ts";
import type { ExternalLyricsResult } from "./Sources/Types.ts";
import { getTrackLyricsInfo } from "./Sources/Track.ts";
import { readOfficialPluginLyrics } from "./Sources/OfficialPlugin.ts";
import { applySongWriters, tryGetSongWriters } from "./Sources/Shared.ts";
import { fetchMusixmatchLyrics } from "./Sources/Musixmatch.ts";
import { fetchSpotifyLyrics } from "./Sources/Spotify.ts";
import { fetchLRCLIBLyrics } from "./Sources/Lrclib.ts";
import { fetchNeteaseLyrics } from "./Sources/Netease.ts";
import { fetchLrcRedLyrics } from "./Sources/LrcRed.ts";

export { refreshMusixmatchToken } from "./Sources/Musixmatch.ts";

function getLyricsTypeScore(lyrics: any): number {
  if (!lyrics || typeof lyrics !== "object") {
    return 0;
  }

  if (lyrics.Type === "Syllable") {
    return 3;
  }

  if (lyrics.Type === "Line") {
    return 2;
  }

  if (lyrics.Type === "Static") {
    return 1;
  }

  return 0;
}

const FALLBACK_PROVIDER_TIMEOUT_MS = 4000;

type FetchLyricsFromProvidersOptions = {
  onFirstLyrics?: (lyrics: any) => void;
};

async function withProviderTimeout<T>(
  promise: Promise<T | null>,
  ms: number
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLyricsFromProviders(
  uri: string,
  order: LyricsSourceProviderId[],
  options: FetchLyricsFromProvidersOptions = {}
): Promise<ExternalLyricsResult | null> {
  const trackInfo = await getTrackLyricsInfo(uri);
  if (!trackInfo) {
    return null;
  }

  function startProviderRequest(provider: LyricsSourceProviderId): Promise<ExternalLyricsResult | null> {
    switch (provider) {
      case "spicy": return withProviderTimeout(readOfficialPluginLyrics(uri), FALLBACK_PROVIDER_TIMEOUT_MS);
      case "musixmatch": return fetchMusixmatchLyrics(trackInfo);
      case "lrcred": return fetchLrcRedLyrics(trackInfo);
      case "spotify": return fetchSpotifyLyrics(trackInfo);
      case "lrclib": return withProviderTimeout(fetchLRCLIBLyrics(trackInfo), FALLBACK_PROVIDER_TIMEOUT_MS);
      case "netease": return withProviderTimeout(fetchNeteaseLyrics(trackInfo), FALLBACK_PROVIDER_TIMEOUT_MS);
      default: return Promise.resolve(null);
    }
  }

  // Keep existing providers parallel. lrc.red starts only if earlier sources cannot win outright.
  const providerRequests = new Map<
    LyricsSourceProviderId,
    Promise<ExternalLyricsResult | null>
  >();
  const getProviderRequest = (provider: LyricsSourceProviderId) => {
    let request = providerRequests.get(provider);
    if (!request) {
      request = startProviderRequest(provider).catch(() => null);
      providerRequests.set(provider, request);
    }
    return request;
  };

  const finishResult = async (result: ExternalLyricsResult | null) => {
    if (!result?.lyrics || tryGetSongWriters(result.lyrics)) return result;
    const officialWriters = order.includes("spicy")
      ? tryGetSongWriters((await getProviderRequest("spicy"))?.lyrics) : null;
    if (officialWriters?.length) return { ...result, lyrics: applySongWriters(result.lyrics, officialWriters) };
    if (result.lyrics.fetchProvider !== "lrcred") return result;

    // Reuse enabled requests for lrc.red's remaining writer fallbacks.
    const writerRequests = order.filter(provider => provider !== "lrcred" && provider !== "spicy").map(provider =>
      withProviderTimeout(
        getProviderRequest(provider).then(value => tryGetSongWriters(value?.lyrics)),
        FALLBACK_PROVIDER_TIMEOUT_MS
      ).catch(() => null)
    );
    for (const request of writerRequests) {
      const writers = await request;
      if (writers?.length) return { ...result, lyrics: applySongWriters(result.lyrics, writers) };
    }
    return result;
  };
  let firstLyricsDelivered = false;
  for (const provider of order) {
    if (provider === "lrcred") continue;
    const request = getProviderRequest(provider);
    void request
      .then((result) => {
        if (firstLyricsDelivered || !result?.lyrics) return;
        firstLyricsDelivered = true;
        options.onFirstLyrics?.(result.lyrics);
      })
      .catch(() => {});
  }

  let bestResult: ExternalLyricsResult | null = null;
  let queuedResult: ExternalLyricsResult | null = null;
  let bestScore = 0;
  for (const provider of order) {
    const result = await getProviderRequest(provider);
    if (result?.status === 503) queuedResult = result;
    if (result?.lyrics) {
      if (provider === "spicy" && order[0] === provider) return result;
      const score = getLyricsTypeScore(result.lyrics);
      if (score > bestScore) {
        bestResult = result;
        bestScore = score;
      }
    }
    // Later providers cannot beat an earlier word sync at the same quality.
    if (bestScore === 3) return finishResult(bestResult);
  }
  return finishResult(bestResult ?? queuedResult);
}

