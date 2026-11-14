import { isLyricsVersion, readActiveLyricsApp, recordActiveLyricsApp } from "../../../builds/shared/app-state.mjs";

export const LYSSNA_VERSION_STATE_KEY = "LL:versionState";
type VersionState = {
  lastSeenVersion: string;
  lastAnnouncedVersion: string;
  spicyVersionSnapshot: string | null;
};

function readObject(key: string): Record<string, unknown> | null {
  const raw = Spicetify.LocalStorage.get(key);
  if (raw == null) return null;
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid version record: ${key}`);
  return value;
}

function spicyVersion(): string | null {
  try {
    const value = readObject("SL:uiState")?.fromVersion;
    return isLyricsVersion(value) && !String(value).startsWith("100.") ? value as string : null;
  } catch { return null; }
}

function legacyLyssnaVersion(): string | null {
  try {
    const state = readObject("LL:uiState");
    for (const value of [state?.fromVersion, state?.previousVersion]) {
      if (typeof value === "string" && /^100\.\d+\.\d+$/.test(value)) return value;
    }
  } catch { /* Leave legacy records intact. */ }
  return null;
}

export function recordLyssnaStartup(version: string) {
  let state: VersionState | null = null;
  let writable = true;
  try {
    const value = readObject(LYSSNA_VERSION_STATE_KEY);
    if (value) {
      if (!isLyricsVersion(value.lastSeenVersion) || !isLyricsVersion(value.lastAnnouncedVersion) ||
          (value.spicyVersionSnapshot !== null && !isLyricsVersion(value.spicyVersionSnapshot))) throw new Error("Invalid Lyssna version history");
      state = value as VersionState;
    }
  } catch (error) {
    writable = false;
    console.warn("Lyssna Lyrics preserved unreadable version history:", error);
  }

  const boot = window._lyssna_lyrics_metadata;
  const previousApp = boot?.PreviousApp ?? readActiveLyricsApp(Spicetify.LocalStorage)?.app;
  const upstream = spicyVersion();
  const switched = previousApp === "spicy" || !!(state && upstream && state.spicyVersionSnapshot !== upstream);
  const fromVersion = state?.lastSeenVersion ?? legacyLyssnaVersion();
  const updated = !!(fromVersion && fromVersion !== version && state?.lastAnnouncedVersion !== version);
  if (writable && isLyricsVersion(version)) {
    try {
      const json = JSON.stringify({
        lastSeenVersion: version,
        lastAnnouncedVersion: updated || !state ? version : state.lastAnnouncedVersion,
        spicyVersionSnapshot: upstream,
      } satisfies VersionState);
      Spicetify.LocalStorage.set(LYSSNA_VERSION_STATE_KEY, json);
      if (Spicetify.LocalStorage.get(LYSSNA_VERSION_STATE_KEY) !== json) throw new Error("Lyssna version history was not saved");
    } catch (error) {
      console.warn("Lyssna Lyrics could not save version history:", error);
    }
  }
  recordActiveLyricsApp(Spicetify.LocalStorage, "lyssna", version);
  return { fromVersion, updated, switched };
}
