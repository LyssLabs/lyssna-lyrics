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
let lyricsReturnLocation: Location | null = null;

function sameLocation(a: Location, b: Location): boolean {
  return a.pathname === b.pathname && (a.search ?? "") === (b.search ?? "") && (a.hash ?? "") === (b.hash ?? "");
}

const Session = {
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
