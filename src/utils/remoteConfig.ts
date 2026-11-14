// Local tuning; values never come from a remote service.
export const DEFAULT_REMOTE_CONFIG = {
  query: {
    requestTimeoutMs: 15000,
  },
  breaker: {
    tripStatuses: [403, 408, 425, 429, 500, 502, 503, 504],
    failureThreshold: 2,
    ladderMs: [
      30000, 30000, 30000, 60000, 120000, 120000, 120000, 120000, 120000, 120000, 120000, 120000,
      300000,
    ],
    ladderJitterRatio: 0.5,
    openUntilSanityMs: 2700000,
    ladderDecayMs: 3600000,
    probeMinIntervalMs: 30000,
    probeStaleAfterMs: 60000,
  },
  lyricsQueue: {
    baseDelayMs: 2000,
    maxDelayMs: 10000,
    backoffFactor: 1.5,
  },
  lyricsFetch: {
    rapidSwitchWindowMs: 1000,
    rapidSwitchBackoffMs: 400,
    loaderRevealDelayMs: 2000,
    safetyNetRefetchDelayMs: 1000,
  },
  cache: {
    lyricsTtlDays: 3,
    artistVisualsTtlDays: 3,
    audioAnalysisTtlMonths: 1,
    audioAnalysisNotFoundTtlHours: 24,
    canvasMediaCacheSize: 4,
  },
  canvas: {
    loadTimeoutMs: 20000,
    // Pauses before each retry of a failed canvas download; empty disables retries.
    retryDelaysMs: [3000, 10000, 30000],
  },
  animatedArtwork: {
    // Kill switch for the looping cover video in the NowBar.
    enabled: false,
    metadataTimeoutMs: 10000,
    signTimeoutMs: 8000,
    // Pause before signing again after the signer failed or was unreachable.
    signRetryMs: 60000,
    // From setting the source to the first played frame.
    loadTimeoutMs: 20000,
    // How long an album whose video failed twice keeps the static cover.
    missTtlMs: 1800000,
    // Wait before checking whether an album has a video (only asked when it decides Canvas vs.
    // cover), so skipping tracks costs no requests; a Canvas waiting on it shows that much later.
    checkDelayMs: 400,
    checkTimeoutMs: 8000,
    // How long the Canvas Stage waits for the check before going ahead without it.
    stageHoldMs: 2500,
    // On a track change the cover keeps its video this long before dropping it for another album:
    // a relinked track first reports the album it was played from, then its own.
    albumSettleMs: 500,
  },
  updates: {
    checkIntervalMs: 120000,
    checkJitterRatio: 0.2,
    firstCheckDelayMs: 1000,
    latestVersionTimeoutMs: 15000,
  },
  session: {
    pingJitterRatio: 0.2,
    refreshJitterRatio: 0.1,
    backoffBaseMs: 5000,
    backoffMaxMs: 60000,
    createJitterRatio: 0.3,
    recreateJitterRatio: 0.3,
    recoverSpreadMs: 45000,
    pingFailureMaxMs: 1800000,
    pingFailureJitterRatio: 0.2,
    refreshFailureBaseMs: 60000,
    refreshFailureMaxMs: 900000,
    refreshFailureJitterRatio: 0.2,
  },
  token: {
    expiryMarginMs: 60000,
    renewCooldownMs: 10000,
    renewTimeoutMs: 10000,
    // Bounds each single source: the provider load and the Cosmos oauth lookup.
    sourceTimeoutMs: 4000,
    // Bounds the whole lookup, so keep it above 2 × sourceTimeoutMs +
    // renewTimeoutMs, or a slow chain never reaches the last-resort token.
    resolveTimeoutMs: 20000,
  },
  audioAnalysis: {
    timeoutMs: 15000,
  },
  romanization: {
    // How long lyrics wait for the Japanese dictionary before showing kana-only romaji.
    dictionaryWaitMs: 5000,
  },
};

export type RemoteConfig = typeof DEFAULT_REMOTE_CONFIG;

export function getRemoteConfig(): RemoteConfig {
  return DEFAULT_REMOTE_CONFIG;
}
