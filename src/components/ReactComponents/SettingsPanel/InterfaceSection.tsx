import { useStore } from "@nanostores/react";
import type { ReactNode } from "react";
import {
  $alwaysShowInFullscreen, $allowHidingSettings, $animateFullscreenClose,
  $disableNpvLyrics, $escapeKeyFunction, $externalCinemaLyricsAllowed,
  $hideNpvLyricsWhenUnavailable, $hiddenSettingIds, $lockedMediaBox,
  $releaseYearPosition, $showVolumeSliderFullscreen,
  $viewControlsPosition, $showNoLyricsNotice, $showQueueWhenNoLyrics,
} from "../../../utils/stores.ts";
import { $isGlobalNav } from "../../../utils/uiState.ts";
import { matches, Row, Select, SettingsSection, Toggle } from "./components.tsx";

type LayoutSetting = { id: string; label: string; description: string; control: ReactNode; accessory?: ReactNode; hidden?: boolean };

export default function InterfaceSection({ query, sectionFilter, showHidden = false }: { query: string; sectionFilter: string; showHidden?: boolean }) {
  const lockedMediaBox = useStore($lockedMediaBox);
  const allowHidingSettings = useStore($allowHidingSettings);
  const externalCinemaLyricsAllowed = useStore($externalCinemaLyricsAllowed);
  const viewControlsPosition = useStore($viewControlsPosition);
  const alwaysShowInFullscreen = useStore($alwaysShowInFullscreen);
  const volume = useStore($showVolumeSliderFullscreen);
  const releaseYearPosition = useStore($releaseYearPosition);
  const escapeKeyFunction = useStore($escapeKeyFunction);
  const animateFullscreenClose = useStore($animateFullscreenClose);
  const hideNpvLyricsWhenUnavailable = useStore($hideNpvLyricsWhenUnavailable);
  const disableNpvLyrics = useStore($disableNpvLyrics);
  const showNoLyricsNotice = useStore($showNoLyricsNotice);
  const showQueueWhenNoLyrics = useStore($showQueueWhenNoLyrics);
  const isGlobalNav = useStore($isGlobalNav);
  const hiddenIds = useStore($hiddenSettingIds);
  if (sectionFilter !== "All" && sectionFilter !== "Interface") return null;

  const settings: LayoutSetting[] = [
    { id: "interface-no-lyrics-notice", label: "No Lyrics Notice", description: "Explain why a song has no lyrics. Errors always show their notice.", control: <Toggle checked={showNoLyricsNotice} onChange={value => $showNoLyricsNotice.set(value)} /> },
    { id: "interface-auto-queue", label: "Show Queue When a Song Has No Lyrics", description: "Open the queue for missing lyrics in Fullscreen and Cinema View.", control: <Toggle checked={showQueueWhenNoLyrics} onChange={value => $showQueueWhenNoLyrics.set(value)} /> },
    { id: "interface-lock-media-box", label: "Lock Media Box Size in Compact Mode", description: "Prevent the media box from resizing in Forced Compact Mode.", control: <Toggle checked={lockedMediaBox} onChange={value => $lockedMediaBox.set(value)} /> },
    { id: "interface-cinema-window", label: "Enable Cinema Lyrics Window", description: "Show the Cinema Lyrics playback-bar button. Requires Spotify DevTools.", control: <Toggle checked={externalCinemaLyricsAllowed} onChange={value => $externalCinemaLyricsAllowed.set(value)} />, accessory: <a className="ll-sp-help-link" href="https://github.com/iPixelGalaxy/lyssna-lyrics/blob/dev/docs/devtools.md" target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>Help</a> },
    { id: "interface-view-controls", label: "View Controls Position", description: "Choose where lyric controls appear.", hidden: !isGlobalNav, control: <Select value={viewControlsPosition} options={["Top", "Bottom"]} onChange={value => $viewControlsPosition.set(value)} /> },
    { id: "interface-always-fullscreen", label: "Always Show In Fullscreen", description: "Keep fullscreen time or controls visible.", control: <Select value={alwaysShowInFullscreen === "All" ? "Both" : alwaysShowInFullscreen} options={["None", "Controls", "Time", "Both"]} onChange={value => $alwaysShowInFullscreen.set(value)} /> },
    { id: "interface-fullscreen-volume", label: "Fullscreen Volume Slider", description: "Show a volume slider in fullscreen and Cinema View.", control: <Select value={volume} options={["Off", "Left", "Right", "Below"]} onChange={value => $showVolumeSliderFullscreen.set(value)} /> },
    { id: "interface-release-year", label: "Release Year Position", description: "Show the release year near track metadata.", control: <Select value={releaseYearPosition} options={["Off", "Left", "Right"]} onChange={value => $releaseYearPosition.set(value)} /> },
    { id: "interface-animate-close", label: "Animate Closing Fullscreen", description: "Slide the lyrics page away when closing fullscreen.", control: <Toggle checked={animateFullscreenClose} onChange={value => $animateFullscreenClose.set(value)} /> },
    { id: "interface-escape-key", label: "Escape Key Function", description: "Choose where Escape and the fullscreen button take you.", control: <Select value={escapeKeyFunction} options={["Exit Fullscreen", "Exit to Cinema", "Exit Fully"]} onChange={value => $escapeKeyFunction.set(value)} /> },
    { id: "interface-disable-npv", label: "Disable NPV Lyrics", description: "Hide the lyrics card in the Now Playing sidebar.", control: <Toggle checked={disableNpvLyrics} onChange={value => $disableNpvLyrics.set(value)} /> },
    { id: "interface-hide-empty-npv", label: "Hide NPV Lyrics When No Lyrics Are Available", description: "Remove the sidebar lyrics card while lyrics are unavailable.", hidden: disableNpvLyrics, control: <Toggle checked={hideNpvLyricsWhenUnavailable} onChange={value => $hideNpvLyricsWhenUnavailable.set(value)} /> },
  ];
  const visible = settings.filter(setting => !setting.hidden && matches(query, setting.label, setting.description) &&
    (showHidden ? hiddenIds.includes(setting.id) : !allowHidingSettings || !hiddenIds.includes(setting.id) || Boolean(query.trim())));
  if (visible.length === 0) return null;
  return <SettingsSection title="Layout">{visible.map(setting => <Row key={setting.id} settingId={setting.id} label={setting.label} description={setting.description} labelAccessory={setting.accessory}>{setting.control}</Row>)}</SettingsSection>;
}
