import React from "react";
import { showNotice } from "../components/ReactComponents/NoticeDialog.tsx";
import { hasStandaloneSpotifyPlus } from "./config";

const NOTICE_KEY = "LL:enhancementsIntegrationAnnounced";
let queued = false;

export function offerEnhancementsIntegrationNotice() {
  if (queued || Spicetify.LocalStorage.get(NOTICE_KEY) === "true") return;
  queued = true;
  const observer = new MutationObserver(() => tryShow());
  const tryShow = () => {
    if (document.querySelector(".ll-notice-host, .sl-notice-host, .LyssnaLyricsModal, .SpicyLyricsModal, .SpotifyPlusSettingsOverlay")) return;
    observer.disconnect();
    showNotice({
      title: "Spotify+ is now part of Lyssna Lyrics",
      content: [
        <p className="ll-notice-text">Hiding options, playlist features and F5 refresh are built in. Find the controls in the Enhancements tab.</p>,
        ...(hasStandaloneSpotifyPlus() ? [<p className="ll-notice-text">Spotify+ stays installed and automatically stands down while this Lyssna build is running. It resumes when you switch to another build.</p>] : []),
      ],
      primary: { label: "Got it", onClick: () => {} },
      secondaryLabel: "Close",
    });
    Spicetify.LocalStorage.set(NOTICE_KEY, "true");
  };
  observer.observe(document.body, { childList: true });
  queueMicrotask(tryShow);
}
