import { atom } from "nanostores";

export const SETTINGS_CHANGED_EVENT = "lyssna-lyrics:enhancements-changed";
const STORAGE_KEY = "LL:enhancements";
export const PLAYLIST_FOLDER_CACHE_KEY = "LL:enhancement-playlist-folders";

export const defaultSettings = {
  hideYourUpdatesSection: true,
  hideHomeConfigMenuItem: true,
  hideAccountMenuItem: true,
  hideProfileMenuItem: false,
  hideRecentsMenuItem: true,
  hideSupportMenuItem: true,
  hidePrivateSessionMenuItem: false,
  hideLogOutMenuItem: false,
  hideFriendActivityButton: true,
  hideLyricsButton: true,
  hideMiniplayerButton: true,
  disablePeek: true,
  restoreOldDevicePicker: true,
  restoreOldShareMenu: true,
  overridePlaylistFolderBehavior: false,
  showPlaylistMenuCoverArt: false,
  playlistOverrideFolderIds: [] as string[],
  playlistBaseFolderId: "",
};
export type SpotifyPlusSettings = typeof defaultSettings;
export type EnhancementKey = keyof SpotifyPlusSettings;
export interface PlaylistFolderPlaylistEntry { name: string; uri: string | null }
export interface PlaylistFolderEntry { id: string; label: string; path: string; playlists: PlaylistFolderPlaylistEntry[] }
export const $enhancements = atom<SpotifyPlusSettings>({ ...defaultSettings });
let initialized = false;

export function standaloneSpotifyPlusFiles(): string[] {
  const configured = Spicetify.Config?.extensions ?? [];
  const extensions = Array.isArray(configured) ? configured : String(configured).split("|");
  return [...new Set(extensions.flatMap(name => {
    const match = name.trim().match(/(?:^|[/\\])(spotify-plus\.(?:js|mjs))$/i);
    return match ? [match[1]] : [];
  }))];
}
export function hasStandaloneSpotifyPlus(): boolean { return standaloneSpotifyPlusFiles().length > 0; }

function validSetting(key: EnhancementKey, value: unknown): boolean {
  return Array.isArray(defaultSettings[key])
    ? Array.isArray(value) && value.every(item => typeof item === "string")
    : typeof value === typeof defaultSettings[key];
}

function notify(key: EnhancementKey) {
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT, { detail: { key } }));
  if (hasStandaloneSpotifyPlus()) {
    Spicetify.LocalStorage.set(`spotify-plus-settings.${key}`, JSON.stringify({ value: getSetting(key) }));
    window.dispatchEvent(new CustomEvent("spotify-plus:settings-changed", { detail: { key, value: getSetting(key) } }));
  }
}

export function ensureDefaultSettings() {
  if (initialized) return;
  initialized = true;
  const settings = { ...defaultSettings };
  const existing = Spicetify.LocalStorage.get(STORAGE_KEY);
  let own: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(existing ?? "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) own = parsed;
  } catch { /* Preserve malformed storage until the user changes a setting. */ }
  for (const key of Object.keys(defaultSettings) as EnhancementKey[]) {
    let value = own[key];
    if (value === undefined) {
      try { value = JSON.parse(Spicetify.LocalStorage.get(`spotify-plus-settings.${key}`) ?? "null")?.value; } catch { /* Use the default. */ }
    }
    if (validSetting(key, value)) (settings as Record<string, unknown>)[key] = value;
  }
  if (!settings.playlistOverrideFolderIds.length && settings.playlistBaseFolderId) {
    settings.playlistOverrideFolderIds = [settings.playlistBaseFolderId];
  }
  $enhancements.set(settings);
  if (existing == null) Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(settings));
  if (hasStandaloneSpotifyPlus()) {
    for (const key of Object.keys(defaultSettings) as EnhancementKey[]) {
      const expected = JSON.stringify({ value: settings[key] });
      if (Spicetify.LocalStorage.get(`spotify-plus-settings.${key}`) !== expected) notify(key);
    }
  }
}

export function getSettings(): SpotifyPlusSettings { return $enhancements.get(); }
export function getSetting<Key extends EnhancementKey>(key: Key): SpotifyPlusSettings[Key] { return getSettings()[key]; }
export function setSetting<Key extends EnhancementKey>(key: Key, value: SpotifyPlusSettings[Key]) {
  if (!validSetting(key, value)) return;
  const settings = { ...getSettings(), [key]: value };
  Spicetify.LocalStorage.set(STORAGE_KEY, JSON.stringify(settings));
  $enhancements.set(settings);
  notify(key);
}

export function getCachedPlaylistFolders(): PlaylistFolderEntry[] {
  try {
    const own = Spicetify.LocalStorage.get(PLAYLIST_FOLDER_CACHE_KEY);
    const parsed = own != null ? JSON.parse(own) : JSON.parse(Spicetify.LocalStorage.get("spotify-plus.playlist-folders") ?? "null")?.value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(folder => folder && typeof folder.id === "string" && typeof folder.label === "string" && typeof folder.path === "string")
      .map(folder => ({ ...folder, playlists: Array.isArray(folder.playlists) ? folder.playlists.map((item: any) => typeof item === "string"
        ? { name: item, uri: null } : { name: String(item?.name ?? ""), uri: typeof item?.uri === "string" ? item.uri : null }) : [] }));
  } catch { return []; }
}

export function setCachedPlaylistFolders(folders: PlaylistFolderEntry[]) {
  Spicetify.LocalStorage.set(PLAYLIST_FOLDER_CACHE_KEY, JSON.stringify(folders));
  if (hasStandaloneSpotifyPlus()) Spicetify.LocalStorage.set("spotify-plus.playlist-folders", JSON.stringify({ value: folders }));
  notify("playlistOverrideFolderIds");
}
