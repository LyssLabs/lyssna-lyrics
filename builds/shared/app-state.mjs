export const ACTIVE_LYRICS_APP_KEY = "LL:activeLyricsApp";
const LYRICS_HANDOFF_KEY = "LL:lyricsViewHandoff";
const LYRICS_ROUTES = { lyssna: "/LyssnaLyrics", spicy: "/SpicyLyrics" };
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

export function rememberLyricsAppSwitch(storage, history, nextApp) {
  const previousApp = readActiveLyricsApp(storage)?.app;
  try {
    if (!previousApp || previousApp === nextApp || history.location?.pathname !== LYRICS_ROUTES[previousApp]) {
      storage.set(LYRICS_HANDOFF_KEY, "null");
      return;
    }
    storage.set(LYRICS_HANDOFF_KEY, JSON.stringify({ fromApp: previousApp, app: nextApp, createdAt: Date.now() }));
    // Spotify+ reads this before our network-loaded bundle starts. Give it the destination route before reload.
    if (storage.get("spotify-plus.last-location") != null) {
      storage.set("spotify-plus.last-location", JSON.stringify({ pathname: LYRICS_ROUTES[nextApp], search: "", hash: "" }));
    }
  } catch (error) {
    console.warn("Lyssna Lyrics could not preserve the lyrics view:", error);
  }
}

export function restoreLyricsAppView(storage, history, app) {
  let handoff;
  try { handoff = JSON.parse(storage.get(LYRICS_HANDOFF_KEY) ?? "null"); } catch { /* Use the current route. */ }
  const recentHandoff = handoff?.app === app && handoff.fromApp !== app && Object.hasOwn(LYRICS_ROUTES, handoff.fromApp) &&
    typeof handoff.createdAt === "number" && Date.now() - handoff.createdAt >= 0 && Date.now() - handoff.createdAt < 120_000;
  const previousApp = recentHandoff ? handoff.fromApp : readActiveLyricsApp(storage)?.app;
  if (!previousApp || previousApp === app) return;
  const pathname = history.location?.pathname;
  if (pathname !== LYRICS_ROUTES[previousApp] && !(recentHandoff && pathname === "/")) return;
  const target = { pathname: LYRICS_ROUTES[app], search: "", hash: "" };
  try {
    if (storage.get("spotify-plus.last-location") != null) storage.set("spotify-plus.last-location", JSON.stringify(target));
  } catch (error) { console.warn("Could not update the Spotify+ saved route:", error); }
  history.replace(target);
}

export function finishLyricsAppSwitch(storage) {
  try { storage.set(LYRICS_HANDOFF_KEY, "null"); } catch (error) { console.warn("Could not clear the lyrics view handoff:", error); }
}
