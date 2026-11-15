export const INTEGRATION_EVENT = "lyssna-lyrics:integration-state";
export const SPOTIFY_PLUS_RUNTIME_EVENT = "spotify-plus:runtime-state";

const state = () => globalThis.__LYSSNA_LYRICS_INTEGRATION__ ??= { protocol: 1, phase: "standalone", hasEnhancements: false };
const notify = () => globalThis.dispatchEvent(new Event(INTEGRATION_EVENT));

export function beginLyricsLoad() {
  Object.assign(state(), { phase: "loading", hasEnhancements: false });
  notify();
}

export function declareLyssnaEnhancements() {
  const integration = state();
  integration.hasEnhancements = true;
  if (integration.phase !== "loading") integration.phase = "integrated";
  notify();
}

export function finishLyricsLoad(isLyssna) {
  const integration = state();
  integration.phase = isLyssna && integration.hasEnhancements ? "integrated" : "standalone";
  notify();
}

export function standaloneOwnsEnhancements() {
  const runtime = globalThis.__SPOTIFY_PLUS_RUNTIME__;
  return !runtime || runtime.protocol !== 1 || runtime.state === "active";
}
