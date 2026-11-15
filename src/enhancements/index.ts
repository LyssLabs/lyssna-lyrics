import "./styles.css";
import { $enhancements, ensureDefaultSettings, getSettings, hasStandaloneSpotifyPlus, setSetting, SETTINGS_CHANGED_EVENT } from "./config";
import { $removeSpotifyLyricsButton } from "../utils/stores.ts";
import { startProfileMenuController } from "./features/profileMenu";
import { startPlaylistMenuController } from "./features/playlistMenu";
import { startDisablePeekController } from "./features/disablePeek";
import { startDevicePickerController } from "./features/devicePicker";
import { startShareMenuController } from "./features/shareMenu";

let started = false;
export function startEnhancements() {
  if (started) return;
  started = true;
  const hadEnhancements = Spicetify.LocalStorage.get("LL:enhancements") != null;
  ensureDefaultSettings();
  // Keep the existing Spicy-compatible field, with one control in Enhancements.
  if (hadEnhancements) {
    if (getSettings().hideLyricsButton !== $removeSpotifyLyricsButton.get()) setSetting("hideLyricsButton", $removeSpotifyLyricsButton.get());
  } else {
    $removeSpotifyLyricsButton.set(getSettings().hideLyricsButton);
  }
  $enhancements.listen(settings => {
    if ($removeSpotifyLyricsButton.get() !== settings.hideLyricsButton) $removeSpotifyLyricsButton.set(settings.hideLyricsButton);
  });
  $removeSpotifyLyricsButton.listen(hidden => {
    if (getSettings().hideLyricsButton !== hidden) setSetting("hideLyricsButton", hidden);
  });
  // The standalone extension owns these handlers while installed; changes are forwarded by config.ts.
  if (hasStandaloneSpotifyPlus()) return;
  const updateHiding = () => {
    const settings = getSettings();
    for (const key of ["hideFriendActivityButton", "hideLyricsButton", "hideMiniplayerButton"] as const) {
      document.documentElement.classList.toggle(`ll-enhancements-${key}`, settings[key]);
    }
  };
  updateHiding();
  window.addEventListener(SETTINGS_CHANGED_EVENT, updateHiding);
  document.addEventListener("keydown", event => {
    if (event.key !== "F5" || event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, [contenteditable='true']")) return;
    event.preventDefault();
    window.location.reload();
  });
  for (const start of [startProfileMenuController, startPlaylistMenuController, startDisablePeekController, startDevicePickerController, startShareMenuController]) {
    try { start(); } catch (error) { console.warn("Lyssna Lyrics enhancement could not start:", error); }
  }
}
