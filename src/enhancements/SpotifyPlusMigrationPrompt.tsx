import React from "react";
import { toast } from "sonner";
import { showNotice } from "../components/ReactComponents/NoticeDialog.tsx";
import { standaloneSpotifyPlusFiles } from "./config";

const DISMISS_KEY = "LL:spotifyPlusMigrationDismissed";
let offered = false;

export function offerSpotifyPlusMigration() {
  if (offered || Spicetify.LocalStorage.get(DISMISS_KEY) === "true") return;
  const files = standaloneSpotifyPlusFiles();
  if (!files.length) return;
  offered = true;
  const command = `spicetify config extensions ${files.map(file => `${file}-`).join(" ")}\nspicetify apply`;
  const observer = new MutationObserver(() => tryShow());
  const tryShow = () => {
    if (document.querySelector(".ll-notice-host, .sl-notice-host, .LyssnaLyricsModal, .SpicyLyricsModal, .SpotifyPlusSettingsOverlay")) return;
    observer.disconnect();
    const notice = showNotice({
      title: "Spotify+ is built into Lyssna Lyrics",
      content: [
        <p className="ll-notice-text">Hiding options, playlist features and F5 refresh now live in Lyssna Lyrics. Find the settings in Enhancements.</p>,
        <p className="ll-notice-text">Run this in a terminal to remove standalone Spotify+ from Spicetify. Spotify will reload.</p>,
        <pre className="ll-enhancements-uninstall-command"><code>{command}</code></pre>,
      ],
      primary: { label: "Copy uninstall command", onClick: () => {
        void (async () => {
          try {
            if (Spicetify.Platform.ClipboardAPI?.copy) await Spicetify.Platform.ClipboardAPI.copy(command);
            else await navigator.clipboard.writeText(command);
            toast.success("Uninstall command copied.");
          } catch { toast.error("Could not copy the command. It is also available in Enhancements."); }
        })();
      } },
      extraActions: [{ label: "Don’t remind me again", onClick: () => {
        Spicetify.LocalStorage.set(DISMISS_KEY, "true");
        notice.close();
      } }],
      secondaryLabel: "Not now",
      wide: true,
    });
  };
  observer.observe(document.body, { childList: true });
  // Startup/update notices are synchronous; give them first use of the shared notice surface.
  queueMicrotask(tryShow);
}
