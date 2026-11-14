export const ACTIVE_LYRICS_APP_KEY = "LL:activeLyricsApp";
export const isLyricsVersion = value => typeof value === "string" && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value);

export function readActiveLyricsApp(storage) {
  try {
    const state = JSON.parse(storage.get(ACTIVE_LYRICS_APP_KEY) ?? "null");
    return state && (state.app === "lyssna" || state.app === "spicy") && isLyricsVersion(state.version) ? state : null;
  } catch { return null; }
}

export function recordActiveLyricsApp(storage, app, version) {
  if ((app !== "lyssna" && app !== "spicy") || !isLyricsVersion(version)) return;
  try {
    storage.set(ACTIVE_LYRICS_APP_KEY, JSON.stringify({ app, version }));
  } catch (error) {
    console.warn("Lyssna Lyrics could not save the active app:", error);
  }
}
