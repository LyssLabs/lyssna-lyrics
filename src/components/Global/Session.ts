import { $lyssnaLyricsVersion } from "../../utils/stores.ts";
import { fetchSelectedChannelVersion } from "../../utils/version/ChannelVersion.ts";
import { compareLyssnaVersions } from "../../utils/version/VersionOrder.ts";
import Global from "./Global.ts";

interface Location {
  pathname: string;
  search?: string;
  hash?: string;
  state?: Record<string, any>;
}

type VersionParsedData =
  | {
      Text: string;
      Major: number;
      Minor: number;
      Patch: number;
    }
  | undefined;

let sessionHistory: Location[] = [];
const LYRICS_PATH = "/LyssnaLyrics";
const LYRICS_SESSION_KEY = "LL:lyricsViewSession";
let lyricsReturnLocation: Location | null = null;
let navigationInitialized = false;
let restoreLyricsOnStartup = false;
let navigatedDuringStartup = false;
let stopStartupTracking: (() => void) | undefined;

function savedReturnLocation(value: unknown): Location | null {
  if (!value || typeof value !== "object") return null;
  const route = value as Partial<Location>;
  if (typeof route.pathname !== "string" || !route.pathname.startsWith("/") || route.pathname.startsWith("//") ||
    route.pathname === LYRICS_PATH || route.pathname.startsWith(`${LYRICS_PATH}/`)) return null;
  return {
    pathname: route.pathname,
    search: typeof route.search === "string" ? route.search : "",
    hash: typeof route.hash === "string" ? route.hash : "",
  };
}

function saveLyricsSession(location: Location) {
  try {
    const value = JSON.stringify({ open: location.pathname === LYRICS_PATH, returnLocation: savedReturnLocation(lyricsReturnLocation) });
    if (Spicetify.LocalStorage.get(LYRICS_SESSION_KEY) !== value) Spicetify.LocalStorage.set(LYRICS_SESSION_KEY, value);
  } catch (error) { console.warn("Lyssna Lyrics could not save its view:", error); }
}

function sameLocation(a: Location, b: Location): boolean {
  return a.pathname === b.pathname && (a.search ?? "") === (b.search ?? "") && (a.hash ?? "") === (b.hash ?? "");
}

const Session = {
  InitializeNavigation: () => {
    if (navigationInitialized) return;
    navigationInitialized = true;
    // Branch handoffs already choose their destination; an older Lyssna session must not override it.
    if (window._lyssna_lyrics_metadata?.PreviousApp !== "spicy") {
      try {
        const saved = JSON.parse(Spicetify.LocalStorage.get(LYRICS_SESSION_KEY) ?? "null");
        restoreLyricsOnStartup = saved?.open === true;
        lyricsReturnLocation = savedReturnLocation(saved?.returnLocation);
      } catch { /* Ignore a damaged session record. */ }
    }
    stopStartupTracking = Spicetify.Platform.History.listen(() => { navigatedDuringStartup = true; });
    const saveBeforeReload = () => saveLyricsSession(Spicetify.Platform.History.location);
    window.addEventListener("beforeunload", saveBeforeReload);
    window.addEventListener("pagehide", saveBeforeReload);
  },
  RestoreLyricsView: () => {
    stopStartupTracking?.();
    stopStartupTracking = undefined;
    const shouldRestore = restoreLyricsOnStartup && !navigatedDuringStartup;
    restoreLyricsOnStartup = false;
    const history = Spicetify.Platform.History;
    const current = history.location;
    if (!shouldRestore || !current || current.pathname === LYRICS_PATH) return;
    if (current.pathname !== "/" && (!lyricsReturnLocation || !sameLocation(current, lyricsReturnLocation))) return;
    // Rebuild a real Back destination before reopening lyrics from Spotify's startup Home page.
    if (lyricsReturnLocation && !sameLocation(current, lyricsReturnLocation)) history.replace(lyricsReturnLocation);
    Session.Navigate({ pathname: LYRICS_PATH });
  },
  Navigate: (data: Location) => {
    const history = Spicetify.Platform.History;
    const current = history.location;
    if (current && sameLocation(current, data)) return;
    if (data.pathname === LYRICS_PATH && current && current.pathname !== LYRICS_PATH) {
      lyricsReturnLocation = { ...current };
    }
    history.push(data);
  },
  GoBack: () => {
    const history = Spicetify.Platform.History;
    if (history.location?.pathname === LYRICS_PATH) {
      // Fullscreen used to push this route again. Skip those entries when closing lyrics.
      if (Array.isArray(history.entries) && Number.isInteger(history.index)) {
        for (let index = history.index - 1; index >= 0; index--) {
          if (history.entries[index].pathname === LYRICS_PATH) continue;
          history.go(index - history.index);
          return;
        }
      }
      // If no earlier entry survives, restore the saved view instead of a no-op Back at index 0.
      history.replace(lyricsReturnLocation ?? { pathname: "/" });
      return;
    }
    const canGoBack = typeof history.canGo === "function"
      ? history.canGo(-1)
      : Number.isInteger(history.index) ? history.index > 0 : sessionHistory.length > 1;
    if (canGoBack) {
      history.goBack();
    } else {
      Session.Navigate({ pathname: "/" });
    }
  },
  /**
   * GoBack, but only while still on `pathname`. For flows that await something
   * (an exit animation) before navigating: if the user already went elsewhere
   * in the meantime, going back would undo *their* navigation instead.
   */
  GoBackFrom: (pathname: string) => {
    if (Spicetify.Platform.History.location?.pathname !== pathname) return;
    Session.GoBack();
  },
  GetPreviousLocation: () => {
    if (sessionHistory.length > 1) {
      return sessionHistory[sessionHistory.length - 2];
    }
    return null;
  },
  RecordNavigation: (data: Location) => {
    if (data.pathname !== LYRICS_PATH) lyricsReturnLocation = { ...data };
    saveLyricsSession(data);
    Session.PushToHistory(data);
    Global.Event.evoke("session:navigation", data);
  },
  FilterOutTheSameLocation: (data: Location) => {
    const filtered = sessionHistory.filter(
      (location) =>
        location.pathname !== data.pathname &&
        location.search !== data?.search &&
        location.hash !== data?.hash
    );
    sessionHistory = filtered;
  },
  PushToHistory: (data: Location) => {
    sessionHistory.push(data);
  },
  SpicyLyrics: {
    ParseVersion: (version: string): VersionParsedData => {
      const versionMatches = version.match(/(\d+)\.(\d+)\.(\d+)/);

      if (versionMatches === null) {
        return undefined;
      }

      return {
        Text: versionMatches[0],

        Major: parseInt(versionMatches[1]),
        Minor: parseInt(versionMatches[2]),
        Patch: parseInt(versionMatches[3]),
      };
    },
    GetCurrentVersion: (): VersionParsedData => {
      return Session.SpicyLyrics.ParseVersion($lyssnaLyricsVersion.get());
    },
    GetLatestVersion: async (): Promise<VersionParsedData> => {
      const version = await fetchSelectedChannelVersion();
      return version ? Session.SpicyLyrics.ParseVersion(version) : undefined;
    },
    /**
     * Compares two parsed versions.
     * Returns 1 if a > b, -1 if a < b, 0 if equal.
     */
    CompareVersions: (a: NonNullable<VersionParsedData>, b: NonNullable<VersionParsedData>): number => {
      return compareLyssnaVersions(a.Text, b.Text);
    },
    /**
     * Returns "outdated" if current < latest, "downgraded" if current > latest, or "current" if equal.
     */
    GetVersionStatus: async (): Promise<"outdated" | "downgraded" | "current"> => {
      const latestVersion = await Session.SpicyLyrics.GetLatestVersion();
      const currentVersion = Session.SpicyLyrics.GetCurrentVersion();

      if (latestVersion === undefined || currentVersion === undefined) return "current";

      const cmp = Session.SpicyLyrics.CompareVersions(latestVersion, currentVersion);
      if (cmp > 0) return "outdated";
      if (cmp < 0) return "downgraded";
      return "current";
    },
    IsBehind: (currentVersion: VersionParsedData, latestVersion: VersionParsedData): boolean => {
      return !!currentVersion && !!latestVersion && Session.SpicyLyrics.CompareVersions(currentVersion, latestVersion) < 0;
    },
    IsOutdated: async (): Promise<boolean> => {
      return (await Session.SpicyLyrics.GetVersionStatus()) === "outdated";
    },
  },
};

export default Session;
