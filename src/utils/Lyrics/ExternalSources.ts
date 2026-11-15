import Defaults from "../../components/Global/Defaults.ts";
import type { LyricsSourceProviderId } from "./LyricsSourcePreferences.ts";
import type { ExternalLyricsResult } from "./Sources/Types.ts";
import { getTrackLyricsInfo } from "./Sources/Track.ts";
import { fetchLyssnaLyricsRaw, fetchSpicyLyrics, fetchAppleMusicLyrics } from "./Sources/Spicy.ts";
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

function withProviderTimeout<T>(
  promise: Promise<T | null>,
  ms: number
): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
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

  const prioritizeApple = Defaults.PrioritizeAppleMusicQuality;
  order = [...order];
  const appleIndex = order.indexOf("apple");
  const spicyIndex = order.indexOf("spicy");
  const lrcRedIndex = order.indexOf("lrcred");
  if (appleIndex >= 0 && spicyIndex > appleIndex && lrcRedIndex > spicyIndex) {
    order.splice(lrcRedIndex, 1);
    order.splice(appleIndex + 1, 0, "lrcred");
  }
  const preferredProviders = new Set<LyricsSourceProviderId>(
    prioritizeApple ? order.filter(provider => provider === "apple" || provider === "lrcred") : []
  );
  const pendingPreferred = new Set(preferredProviders);
  let spicyRawPromise: Promise<ExternalLyricsResult | null> | null = null;
  const getSpicyRaw = () => {
    if (!order.includes("spicy") && !order.includes("apple")) return Promise.resolve(null);
    spicyRawPromise ??= fetchLyssnaLyricsRaw(trackInfo.id);
    return spicyRawPromise;
  };

  function startProviderRequest(provider: LyricsSourceProviderId): Promise<ExternalLyricsResult | null> {
    switch (provider) {
      case "spicy": return fetchSpicyLyrics(getSpicyRaw());
      case "musixmatch": return fetchMusixmatchLyrics(trackInfo, getSpicyRaw);
      case "apple": return fetchAppleMusicLyrics(getSpicyRaw());
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
  let firstLyricsDelivered = false;
  for (const provider of order) {
    if (provider === "lrcred") continue;
    const request = startProviderRequest(provider).catch(() => null);
    providerRequests.set(provider, request);
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
  let bestProvider: LyricsSourceProviderId | null = null;
  for (const provider of order) {
    const result = await (providerRequests.get(provider) ?? startProviderRequest(provider));
    pendingPreferred.delete(provider);
    if (result?.status === 503) queuedResult = result;
    if (result?.lyrics) {
      const score = getLyricsTypeScore(result.lyrics);
      const preferredTie = preferredProviders.has(provider) && (!bestProvider || !preferredProviders.has(bestProvider));
      if (score > bestScore || (score > 0 && score === bestScore && preferredTie)) {
        bestResult = result;
        bestScore = score;
        bestProvider = provider;
      }
    }
    // Quality wins first; configured order breaks ties unless Apple preference is enabled.
    if (bestScore === 3 && (pendingPreferred.size === 0 || (bestProvider !== null && preferredProviders.has(bestProvider)))) return bestResult;
  }
  return bestResult ?? queuedResult;
}

