import { DEFAULT_LYRICS_SOURCE_ORDER } from "../../utils/Lyrics/LyricsSourcePreferences.ts";

export const isDev = false;

const Defaults = {
  CurrentLyricsType: "None",
  DeveloperMode: false,
  LyricsRenderer: "Spicy",
  RightAlignLyrics: false,
  EscapeKeyFunction: "Exit Fullscreen" as string,
  BuildChannel: "Stable" as string,
  CustomFontEnabled: false,
  CustomFont: "",
  AlwaysShowInFullscreen: "None" as string,
  ShowVolumeSliderFullscreen: "Off" as string,
  ReleaseYearPosition: "Off" as string,
  CoverArtAnimation: true,
  MemeFormat: "Off" as string,
  DisplayLyricsHoverPill: false,
  AnimateFullscreenClose: false,
  EnableExperimentalWordSync: false,
  LyricsSourceOrder: [...DEFAULT_LYRICS_SOURCE_ORDER],
  DisabledLyricsSourceIds: ["lrclib", "netease"] as string[],
  IgnoreMusixmatchWordSync: true,
};

export default Defaults;
