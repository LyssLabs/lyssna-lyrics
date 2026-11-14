import { PageContainer } from "./../Pages/PageView.ts";
import { GetCurrentLyricsContainerInstance } from "../../utils/Lyrics/Applyer/CreateLyricsContainer.ts";
import { SyncNoLyricsLayout } from "../../utils/Lyrics/LyricsNotice.ts";
import { $lockedMediaBox } from "../../utils/stores.ts";
import Global from "../Global/Global.ts";
import { Session_NowBar_SetSide } from "./NowBar.ts";
import { IsPIP } from "./PopupLyrics.ts";

let CompactMode = false;

export const EnableCompactMode = () => {
  const LyssnaLyricsPage = PageContainer;
  if (!LyssnaLyricsPage) return;

  LyssnaLyricsPage.classList.add("CompactMode", "NowBarSide__Left");
  LyssnaLyricsPage.classList.remove("NowBarSide__Right");
  const NowBar = LyssnaLyricsPage.querySelector<HTMLElement>(".ContentBox .NowBar");
  if (!NowBar) return;
  NowBar.classList.add("LeftSide");
  NowBar.classList.remove("RightSide");

  if (!IsPIP) {
    if ($lockedMediaBox.get()) {
      NowBar.classList.add("LockedMediaBox");
    } else {
      NowBar.classList.remove("LockedMediaBox");
    }
  }

  CompactMode = true;
  SyncNoLyricsLayout();
  GetCurrentLyricsContainerInstance()?.Resize();
  Global.Event.evoke("compact-mode:enable");
};

export const DisableCompactMode = () => {
  const LyssnaLyricsPage = PageContainer;
  if (!LyssnaLyricsPage) return;

  LyssnaLyricsPage.classList.remove("CompactMode");
  Session_NowBar_SetSide();
  CompactMode = false;
  SyncNoLyricsLayout();
  GetCurrentLyricsContainerInstance()?.Resize();

  Global.Event.evoke("compact-mode:disable");
};

export const IsCompactMode = () => {
  return CompactMode;
};

export const ToggleCompactMode = () => {
  if (CompactMode) DisableCompactMode();
  else EnableCompactMode();
};

$lockedMediaBox.listen((v) => {
  if (!CompactMode) return;
  const LyssnaLyricsPage = PageContainer;
  if (!LyssnaLyricsPage) return;
  if (IsPIP) return;
  const NowBar = LyssnaLyricsPage.querySelector<HTMLElement>(".ContentBox .NowBar");
  if (!NowBar) return;
  if (v) {
    NowBar.classList.add("LockedMediaBox");
  } else {
    NowBar.classList.remove("LockedMediaBox");
  }
});
