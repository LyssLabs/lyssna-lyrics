import { openDB } from "idb";
import { dbPromise, ObjectStores } from "./db.ts";
import { PersistedSettings, $currentLyricsData } from "./stores.ts";
import fetchLyrics, { SessionTTMLStore, getSongKey } from "./Lyrics/fetchLyrics.ts";
import { ApplyLyricsIfCurrent } from "./Lyrics/Global/Applyer.ts";
import { SpotifyPlayer } from "../components/Global/SpotifyPlayer.ts";
import { PersistedUiState } from "./uiState.ts";
import { $songOffsets, OFFSET_LIMIT_MS } from "./songOffsets.ts";
import { $ttmlReviewer, setTtmlReviewerMode, userSettingsForExport } from "./ttmlReviewer.ts";
import { ANIMATOR_PARAMETERS } from "./Lyrics/Animator/Tuning.ts";
import { lyricFileKind, parseLyricFile, type LyricFileKind } from "./Lyrics/manager/lyricFile.ts";
import { defaultSettings, getSettings, getCachedPlaylistFolders, setCachedPlaylistFolders, setSetting, type EnhancementKey, type PlaylistFolderEntry } from "../enhancements/config.ts";
import { isRecord, mergeLyrics, pluginPreferences, type SettingsTransfer, type SettingsRecord, type TransferLyrics } from "./transferFormat.ts";

let transferState: ReturnType<typeof openDB> | undefined;
function getTransferState() {
  return transferState ??= openDB("lyssna-settings-transfer", 1, { upgrade(db) { db.createObjectStore("state"); } }).catch(error => {
    transferState = undefined;
    throw error;
  });
}
let importing = false;

function isLocalLyric(item: TransferLyrics): item is TransferLyrics & { kind: LyricFileKind } {
  return Boolean(item.uri) && (item.kind === "ttml" || item.kind === "lrc");
}

export async function exportPluginSettings(): Promise<SettingsTransfer> {
  const state = await getTransferState();
  const preserved = await state.get("state", "preserved") as SettingsTransfer | undefined;
  const db = await dbPromise;
  const read = db.transaction(ObjectStores.LyricsStore, "readonly");
  const [keys, values] = await Promise.all([read.store.getAllKeys(), read.store.getAll()]);
  await read.done;
  const lyrics: TransferLyrics[] = keys.map((key, index) => {
    if (typeof key !== "string" || typeof values[index] !== "string") throw new Error("A local lyric entry could not be exported. Existing data was kept.");
    return { uri: key, kind: lyricFileKind(values[index]), text: values[index] };
  });
  const rawSettings: unknown = JSON.parse(Spicetify.LocalStorage.get("LL:settings") ?? "{}");
  if (!isRecord(rawSettings)) throw new Error("Existing settings could not be read; export was cancelled.");
  const settings = { ...rawSettings, ...userSettingsForExport() };
  settings.animatorEffectiveValues = Object.fromEntries(ANIMATOR_PARAMETERS.map(item => [item.id, item.defaultValue]));
  return {
    format: "lyssna-settings", version: 1, source: "plugin", exportedAt: new Date().toISOString(),
    standalone: preserved?.standalone,
    plugin: {
      settings: { ...preserved?.plugin?.settings, ...settings },
      uiState: Object.fromEntries([...PersistedUiState].filter(([key]) => key !== "lastFetchedUri").map(([key, entry]) => [key, entry.get()])),
      songOffsets: { ...$songOffsets.get() }, enhancements: { ...getSettings() }, playlistFolders: getCachedPlaylistFolders(),
    },
    lyrics: mergeLyrics(preserved?.lyrics ?? [], lyrics),
  };
}

const ENUMS: Record<string, readonly unknown[]> = {
  rendererVisualStyle: ["spring", "bloom"], romanizationDisplay: ["replace", "underLine"],
  staticBackgroundMode: ["default", "off", "auto", "artistHeader", "coverArt", "color", "none", "legacy"],
  animatorPreset: ["Pixel", "Default", "Custom"], animatorDetail: ["Basic", "Advanced", "Full", "Full + Extras"],
  ttmlReviewerMode: ["off", "temporary", "always"], releaseYearPosition: ["off", "left", "right"],
  nextUpPlacement: ["off", "topLeft", "bottomLeft", "bottomRight"], pinnedCredits: ["off", "noWriters", "full"],
  pinnedFooterMode: ["Off", "No Writers", "Full"], alwaysShowInFullscreen: ["None", "Controls", "Time", "Both"],
  showVolumeSliderFullscreen: ["Off", "Left", "Right", "Below"], viewControlsPosition: ["Top", "Bottom"],
  escapeKeyFunction: ["Exit Fullscreen", "Exit to Cinema", "Exit Fully"], memeFormat: ["Off", "Gibberish", "all lowercase", "ALL UPPERCASE"],
  lyricsCacheAction: ["all-current", "current-state", "stored-cache"], syllableMerge: ["off", "full", "steady", "held"],
  motionArtworkPriority: ["motion", "canvas"], staticAutoScroll: ["off", "basic", "advanced"],
};
const RANGES: Record<string, [number, number]> = {
  lyricsSize: [60, 200], playbackOffset: [-10_000, 10_000], animationFpsCap: [15, 240], scrollLeadMs: [0, 800], staticBackgroundBlur: [0, 100],
};
function validateValue(key: string, value: unknown, defaultValue: unknown): void {
  const valid = defaultValue === null ? value === null || typeof value === "string"
    : Array.isArray(defaultValue) ? Array.isArray(value)
    : isRecord(defaultValue) ? isRecord(value)
    : defaultValue === undefined ? value === null || ["boolean", "string", "number"].includes(typeof value)
    : typeof value === typeof defaultValue;
  if (!valid || (typeof value === "number" && !Number.isFinite(value))) throw new Error(`Invalid setting: ${key}.`);
  if (ENUMS[key] && !ENUMS[key].includes(value)) throw new Error(`Unknown value for ${key}.`);
  if (typeof value === "number" && RANGES[key] && (value < RANGES[key][0] || value > RANGES[key][1])) throw new Error(`Out-of-range setting: ${key}.`);
  if (["lyricsSourceOrder", "disabledLyricsSources"].includes(key)) {
    const list: unknown = typeof value === "string" ? JSON.parse(value) : null;
    if (!Array.isArray(list) || list.some(item => typeof item !== "string")) throw new Error(`Invalid setting: ${key}.`);
  }
  if (key === "hiddenSettingIds" && (!Array.isArray(value) || value.some(item => typeof item !== "string"))) throw new Error("Invalid hidden settings.");
  if (key === "settingsMenuLocation" && (!isRecord(value) || !["settings", "hidden", "animator"].includes(String(value.route)) || typeof value.query !== "string" || typeof value.sectionFilter !== "string" || typeof value.scrollTop !== "number" || !Number.isFinite(value.scrollTop) || value.scrollTop < 0)) throw new Error("Invalid settings menu location.");
  if (key === "animatorCustom" && (!isRecord(value) || Object.values(value).some(item => typeof item !== "number" || !Number.isFinite(item)))) throw new Error("Invalid animator values.");
  if (key === "savedAnimatorPresets" && (!Array.isArray(value) || value.length > 200 || value.some(item => !isRecord(item) || typeof item.id !== "string" || typeof item.name !== "string" || !isRecord(item.values) || Object.values(item.values).some(number => typeof number !== "number" || !Number.isFinite(number))))) throw new Error("Invalid saved animator presets.");
}

export function preparePluginImport(file: SettingsTransfer) {
  const preferences = pluginPreferences(file);
  const settings: SettingsRecord = {}, uiState: SettingsRecord = {};
  let preserved = 0;
  for (const [key, value] of Object.entries(preferences.settings)) {
    // Build selection belongs to the installed plugin, not to a preferences file.
    if (key === "buildChannel" || !PersistedSettings.has(key)) { preserved++; continue; }
    validateValue(key, value, PersistedSettings.get(key)!.defaultValue);
    settings[key] = value;
  }
  for (const [key, value] of Object.entries(preferences.uiState)) {
    const entry = PersistedUiState.get(key);
    if (!entry || key === "lastFetchedUri") continue;
    validateValue(key, value, entry.defaultValue);
    uiState[key] = value;
  }
  for (const [uri, offset] of Object.entries(preferences.songOffsets)) if (!uri || uri.length > 512 || typeof offset !== "number" || !Number.isFinite(offset) || Math.abs(offset) > 10_000) throw new Error("Invalid per-song offsets.");
  for (const [key, value] of Object.entries(preferences.enhancements)) {
    if (!Object.hasOwn(defaultSettings, key)) continue;
    validateValue(key, value, defaultSettings[key as EnhancementKey]);
    if (Array.isArray(value) && value.some(item => typeof item !== "string")) throw new Error("Invalid playlist folder IDs.");
  }
  if (preferences.playlistFolders.some(folder => !isRecord(folder) || typeof folder.id !== "string" || typeof folder.label !== "string" || typeof folder.path !== "string" || !Array.isArray(folder.playlists) || folder.playlists.some(item => !isRecord(item) || typeof item.name !== "string" || !(item.uri === null || typeof item.uri === "string")))) throw new Error("Invalid playlist folder cache.");
  const lyrics = file.lyrics.filter(isLocalLyric);
  for (const item of lyrics) {
    try { parseLyricFile(item.text, item.kind); }
    catch { throw new Error(`Invalid ${item.kind.toUpperCase()} for ${item.uri}.`); }
  }
  return { file, preferences, settings, uiState, lyrics, preserved: preserved + file.lyrics.length - lyrics.length };
}

export async function previousPluginBackup(): Promise<SettingsTransfer | undefined> {
  return (await getTransferState()).get("state", "backup");
}

export async function hasPluginBackup(): Promise<boolean> {
  return (await (await getTransferState()).count("state", "backup")) > 0;
}

export async function importPluginSettings(plan: ReturnType<typeof preparePluginImport>): Promise<string> {
  if (importing) throw new Error("Another settings import is running.");
  importing = true;
  try {
    const state = await getTransferState();
    const before = await exportPluginSettings();
    const previousPreserved = await state.get("state", "preserved");
    await state.put("state", before, "backup");
    const db = await dbPromise;
    const previousLyrics = new Map(await Promise.all(plan.lyrics.map(async item =>
      [item.uri, await db.get(ObjectStores.LyricsStore, item.uri)] as const
    )));
    const apply = (settings: SettingsRecord, uiState: SettingsRecord, offsets: Record<string, number>, enhancements: SettingsRecord, folders: unknown[]) => {
      setTtmlReviewerMode("off");
      if ($ttmlReviewer.get()) throw new Error("TTML Reviewer's original settings could not be restored.");
      if (typeof settings.dontSyncSpicySettings === "boolean") PersistedSettings.get("dontSyncSpicySettings")?.set(settings.dontSyncSpicySettings);
      for (const [key, value] of Object.entries(settings)) if (key !== "ttmlReviewerMode" && key !== "buildChannel" && key !== "dontSyncSpicySettings") PersistedSettings.get(key)?.set(value);
      for (const [key, value] of Object.entries(uiState)) PersistedUiState.get(key)?.set(value);
      $songOffsets.set(offsets);
      for (const [key, value] of Object.entries(enhancements)) if (Object.hasOwn(defaultSettings, key)) setSetting(key as EnhancementKey, value as never);
      setCachedPlaylistFolders(folders as PlaylistFolderEntry[]);
    };
    try {
      const preferences = plan.preferences;
      const offsets = { ...$songOffsets.get(), ...Object.fromEntries(Object.entries(preferences.songOffsets).map(([uri, value]) => [uri, Math.round(Math.min(OFFSET_LIMIT_MS, Math.max(-OFFSET_LIMIT_MS, value)))])) };
      apply(plan.settings, plan.uiState, offsets, preferences.enhancements, preferences.playlistFolders);
      const saved: unknown = JSON.parse(Spicetify.LocalStorage.get("LL:settings") ?? "{}");
      if (!isRecord(saved) || Object.keys(plan.settings).some(key => key !== "ttmlReviewerMode" && JSON.stringify(Object.hasOwn(saved, key) ? saved[key] : PersistedSettings.get(key)?.defaultValue) !== JSON.stringify(PersistedSettings.get(key)?.get()))) throw new Error("Settings storage could not save the import.");
      const write = db.transaction(ObjectStores.LyricsStore, "readwrite");
      for (const item of plan.lyrics) await write.store.put(item.text, item.uri);
      await write.done;
      await state.put("state", { ...plan.file, lyrics: plan.file.lyrics.filter(item => !isLocalLyric(item)) }, "preserved");
      if (typeof plan.settings.ttmlReviewerMode === "string") setTtmlReviewerMode(plan.settings.ttmlReviewerMode as "off" | "temporary" | "always");
    } catch (error) {
      try {
        const own = before.plugin!;
        apply(own.settings, own.uiState, own.songOffsets, own.enhancements, own.playlistFolders);
        const rollback = db.transaction(ObjectStores.LyricsStore, "readwrite");
        for (const item of plan.lyrics) {
          const previous = previousLyrics.get(item.uri);
          if (previous === undefined) await rollback.store.delete(item.uri);
          else await rollback.store.put(previous, item.uri);
        }
        await rollback.done;
        if (previousPreserved === undefined) await state.delete("state", "preserved");
        else await state.put("state", previousPreserved, "preserved");
        setTtmlReviewerMode(own.settings.ttmlReviewerMode as "off" | "temporary" | "always");
      } catch {
        throw new Error("Import failed and automatic recovery was incomplete. Download the previous backup before retrying.");
      }
      throw error;
    }
    for (const item of plan.lyrics) SessionTTMLStore.delete(getSongKey(item.uri));
    const uri = SpotifyPlayer.GetUri();
    if (uri) {
      $currentLyricsData.set("");
      void fetchLyrics(uri).then(lyrics => ApplyLyricsIfCurrent(uri, lyrics)).catch(error => console.warn("Lyssna Lyrics could not refresh lyrics after importing settings", error));
    }
    return `Imported ${Object.keys(plan.settings).length} settings and ${plan.lyrics.length} lyric files. ${plan.preserved ? `${plan.preserved} unsupported entries kept for future exports. ` : ""}Previous backup is available below.`;
  } finally {
    importing = false;
  }
}
