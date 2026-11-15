import { useStore } from "@nanostores/react";
import React, { useEffect, useState } from "react";
import {
  $lineHoverBackground,
  $syllableMerge,
  $syllablePace,
  $lyricsSize,
  $romanizationDisplay,
  $staticAutoScroll,
  type SyllableMerge,
  type RomanizationDisplay,
  type StaticAutoScroll,
  $enableExperimentalWordSync,
  $duetLinePadding,
  $creditsFollowLastLine,
  $allowHidingSettings,
  $hiddenSettingIds,
  $minimalLyricsMode,
  $playbackOffset,
  $seekFadeCompensation,
  $scrollLeadEnabled,
  $scrollLeadMs,
  $smoothScrolling,
  $rightAlignLyrics,
  $showScrollToActiveButton,
  $backgroundStyle,
  $coverArtAnimation,
  $memeFormat,
  $rendererVisualStyle,
  $spaceGravityMode,
  $popupLyricsAllowed,
  $nextUpPlacement,
  RENDERER_VISUAL_STYLES,
  RENDERER_VISUAL_STYLE_LABELS,
  type RendererVisualStyle,
  type NextUpPlacement,
} from "../../../utils/stores.ts";
import { matches, Row, SettingsSection, Slider, Toggle, Select } from "./components.tsx";
import { ExperimentSettings } from "./ExperimentsPanel.tsx";
import { $offsetScope, $songOffsets, getSongOffset, setSongOffset } from "../../../utils/songOffsets.ts";
import { useCurrentUri } from "../LyricsManager/hooks/useCurrentUri.ts";
import EffectsSection from "./EffectsSection.tsx";
import Global from "../../Global/Global.ts";
import { PageContainer } from "../../Pages/PageView.ts";

const SECTION_NAME = "Lyrics Display";
const uniqueWordFilterOptions = ["Off", "Gibberish", "all lowercase", "ALL UPPERCASE"];
interface Props { query: string; sectionFilter: string; showHidden?: boolean; onManageAnimator?: () => void; }

export default function LyricsSection({ query, sectionFilter, showHidden = false, onManageAnimator }: Props) {
  const minimalLyricsMode = useStore($minimalLyricsMode);
  const rightAlignLyrics = useStore($rightAlignLyrics);
  const showScrollToActiveButton = useStore($showScrollToActiveButton);
  const playbackOffset = useStore($playbackOffset);
  const seekFadeCompensation = useStore($seekFadeCompensation);
  const scrollLeadEnabled = useStore($scrollLeadEnabled);
  const scrollLeadMs = useStore($scrollLeadMs);
  const smoothScrolling = useStore($smoothScrolling);
  const lineHoverBackground = useStore($lineHoverBackground);
  const syllableMerge = useStore($syllableMerge);
  const syllablePace = useStore($syllablePace);
  const lyricsSize = useStore($lyricsSize);
  const romanizationDisplay = useStore($romanizationDisplay);
  const staticAutoScroll = useStore($staticAutoScroll);
  const uri = useCurrentUri();
  const offsetScope = useStore($offsetScope);
  useStore($songOffsets);
  const offset = offsetScope === "song" ? getSongOffset(uri) : playbackOffset;
  const experimentalWordSync = useStore($enableExperimentalWordSync);
  const duetLinePadding = useStore($duetLinePadding);
  const creditsFollowLastLine = useStore($creditsFollowLastLine);
  const allowHidingSettings = useStore($allowHidingSettings);
  const hiddenSettingIds = useStore($hiddenSettingIds);
  const backgroundStyle = useStore($backgroundStyle);
  const coverArtAnimation = useStore($coverArtAnimation);
  const memeFormat = useStore($memeFormat);
  const renderer = useStore($rendererVisualStyle);
  const gravity = useStore($spaceGravityMode);
  const popupAllowed = useStore($popupLyricsAllowed);
  const nextUp = useStore($nextUpPlacement);
  const [artworkStage, setArtworkStage] = useState(() => PageContainer?.classList.contains("CanvasImmersive") ?? false);
  useEffect(() => {
    const listener = Global.Event.listen("canvas-stage:change", () => setArtworkStage(PageContainer?.classList.contains("CanvasImmersive") ?? false));
    return () => Global.Event.unListen(listener);
  }, []);
  if (sectionFilter !== "All" && sectionFilter !== SECTION_NAME) return null;

  const visible = (id: string) => showHidden ? hiddenSettingIds.includes(id) : !allowHidingSettings || !hiddenSettingIds.includes(id) || Boolean(query.trim());
  const r3 = visible("lyrics-minimal-mode") && matches(query, "Minimal Lyrics Mode", "Hides sung lyrics lines in Fullscreen and Cinema Mode");
  const r4 = visible("lyrics-right-align") && matches(query, "Right Align Lyrics", "Flip duet/opposite lyric alignment.");
  const r5 = visible("lyrics-scroll-active") && matches(query, "Show Scroll to Active Button", "Show an arrow button when the active lyric is outside the viewport.");
  const r8 = visible("lyrics-playback-offset") && matches(query, "Playback Offset", "Shift lyrics timing earlier or later, in milliseconds.");
  const r9 = visible("lyrics-line-hover") && matches(query, "Line Hover Background", "Shows a highlight box behind a lyrics line when you hover over it");
  const r10 = visible("lyrics-wide-duet-padding") && matches(query, "Wide duet line padding", "Separate duet voices into wider columns. Disable for compact padding.");
  const seek = visible("lyrics-seek-compensation") && matches(query, "Seek Fade-in Compensation", "Click lyrics 300ms early to compensate for Spotify's fade-in.");
  const early = visible("lyrics-early-scroll") && matches(query, "Early Scroll", "Start scrolling before the next lyric becomes active.");
  const lead = visible("lyrics-early-scroll-time") && matches(query, "Early Scroll Time", "How early the next line is scrolled to, in milliseconds.");
  const smooth = visible("lyrics-smooth-scrolling") && matches(query, "Smooth Scrolling", "Use spring motion for scrolling and interlude transitions.");
  const skeleton = visible("lyrics-loading-skeleton") && matches(query, "Lyrics Loading Skeleton", "Show placeholder lines while lyrics load; disable to restore the spinner.");
  const credits = visible("lyrics-credits-follow-singer") && matches(query, "Credits Follow the Last Singer", "Align credits with the last duet line.");
  const joinSplit = matches(query, "Join Split Words", "Show a word that's sung in syllables as one word, when its parts line up evenly.");
  const wordSync = visible("lyrics-experimental-word-sync") && matches(query, "Experimental Word Sync", "Estimate word sync for line or static lyrics.");
  const size = matches(query, "Lyrics Size", "Make lyrics bigger or smaller in every view.");
  const romanization = matches(query, "Romanization", "Replace the line or show romanization under each line.");
  const writtenRomaji = visible("lyrics-romaji-written") && matches(query, "Romaji as Written", "Use familiar Japanese spellings such as kyou instead of kyō.");
  const refinedCredits = visible("lyrics-refined-credits") && matches(query, "Refined Credits", "Show compact source and contributor credits below the lyrics.");
  const pace = matches(query, "Keep Syllable Pace", "Keep each joined syllable's timing.");
  const unsynced = matches(query, "Unsynced Auto-scroll", "Scroll unsynced lyrics through the song using loudness or vocals.");
  const visualStyle = visible("lyrics-simple-mode") && matches(query, "Renderer Visual Style", "Choose Lyssna or Apple Music lyric animation.");
  const cover = visible("appearance-cover-art-animation") && matches(query, "Cover Art Animation", "Crossfade artwork when the song changes.");
  const muted = !artworkStage && ["dynamic", "artist", "cover", "color"].includes(backgroundStyle) && visible("lyrics-muted-background") && matches(query, "Muted Background", "Deeper artwork colors and crossfades in lyrics, Cinema View and fullscreen.");
  const largerCinema = renderer === "bloom" && visible("lyrics-larger-cinema") && matches(query, "Larger Cinema Lyrics", "Scale Apple Music lyrics for Cinema View and fullscreen.");
  const overlap = minimalLyricsMode && !gravity && visible("lyrics-keep-overlaps") && matches(query, "Keep Overlapping Lines", "Keep finished overlaps visible in wide Cinema View and fullscreen with Minimal Lyrics Mode.");
  const popup = visible("interface-disable-popup") && matches(query, "Enable Popup Player", "Open lyrics in a separate window.");
  const popupDock = popupAllowed && visible("lyrics-popup-dock") && matches(query, "Popup Player Dock", "Dock playback controls below popup lyrics.");
  const floating = visible("lyrics-space-gravity") && matches(query, "Space Gravity Mode", "Let lyric words float as they’re sung.");
  const words = visible("lyrics-word-filters") && matches(query, "Unique Word Filters", "Change the spelling or case of lyric words.");
  const nextTrack = visible("nextUpPlacement") && matches(query, "Up Next", "Show the next track in a page corner beside pinned credits in the final 30 seconds.");
  const effects = renderer === "spring"
    ? visible("effects-animator-presets") && matches(query, "Animator Presets", "Choose Lyssna, Spicy, or Custom animation.")
    : visible("lyrics-background-vocals") && matches(query, "Background Vocal Pop-Out", "Reveal tagged backing vocals while their group plays.");
  const display = [size, romanization, writtenRomaji, r3, r4, r5, r8, seek, visualStyle, cover, muted, largerCinema, overlap].some(Boolean);
  const scrolling = [early, lead, smooth].some(Boolean);
  const behavior = [skeleton, r9, r10, joinSplit, pace, unsynced, wordSync, credits, refinedCredits, popup, popupDock, floating, words, nextTrack].some(Boolean);
  if (!effects && !display && !scrolling && !behavior) return null;

  return <>
    <EffectsSection query={query} sectionFilter={sectionFilter} showHidden={showHidden} onManageAnimator={onManageAnimator} />
    {display && <SettingsSection title="Lyrics display">
    {visualStyle && <Row settingId="lyrics-simple-mode" label="Renderer Visual Style" description="Choose Lyssna or Apple Music lyric animation."><Select value={renderer} options={[...RENDERER_VISUAL_STYLES]} labels={RENDERER_VISUAL_STYLES.map(style => RENDERER_VISUAL_STYLE_LABELS[style])} onChange={value => $rendererVisualStyle.set(value as RendererVisualStyle)} /></Row>}
    {largerCinema && <ExperimentSettings experimentIds={["largerCinemaLyrics"]} showBuiltIn={false} />}
    {cover && <Row settingId="appearance-cover-art-animation" label="Cover Art Animation" description="Crossfade artwork when the song changes."><Toggle checked={coverArtAnimation} onChange={value => $coverArtAnimation.set(value)} /></Row>}
    {muted && <ExperimentSettings experimentIds={["refinedBackground"]} showBuiltIn={false} />}
    {size && <Row label="Lyrics Size" description="Make lyrics bigger or smaller in every view." stacked><Slider value={lyricsSize} min={60} max={200} step={5} defaultValue={100} unit="%" onChange={(v) => $lyricsSize.set(v)} /></Row>}
    {romanization && <Row label="Romanization" description="Where romanization appears when enabled."><Select value={romanizationDisplay} options={["replace", "underLine"]} labels={["Replace the line", "Under each line"]} onChange={(v) => $romanizationDisplay.set(v as RomanizationDisplay)} /></Row>}
    {writtenRomaji && <ExperimentSettings experimentIds={["romajiAsWritten"]} showBuiltIn={false} />}
    {r3 && <Row settingId="lyrics-minimal-mode" label="Minimal Lyrics Mode" description="Hides sung lyrics lines in Fullscreen and Cinema Mode"><Toggle checked={minimalLyricsMode} onChange={(v) => $minimalLyricsMode.set(v)} /></Row>}
    {overlap && <ExperimentSettings experimentIds={["keepOverlappingLines"]} showBuiltIn={false} />}
    {r4 && <Row settingId="lyrics-right-align" label="Right Align Lyrics" description="Flip duet/opposite lyric alignment."><Toggle checked={rightAlignLyrics} onChange={(v) => $rightAlignLyrics.set(v)} /></Row>}
    {r5 && <Row settingId="lyrics-scroll-active" label="Show Scroll to Active Button" description="Show an arrow when the active lyric is outside the viewport."><Toggle checked={showScrollToActiveButton} onChange={(v) => $showScrollToActiveButton.set(v)} /></Row>}
    {r8 && <Row settingId="lyrics-playback-offset" label="Playback Offset" description="Shift lyrics timing earlier or later, in milliseconds." stacked><Select value={offsetScope} options={["all", "song"]} labels={["All songs", "This song"]} onChange={(v) => $offsetScope.set(v as "all" | "song")} />{(offsetScope === "all" || !!uri) && <Slider value={offset} min={-5000} max={5000} step={10} defaultValue={0} unit="ms" onChange={(v) => { if (offsetScope === "song") { if (uri) setSongOffset(uri, v); } else $playbackOffset.set(v); }} />}</Row>}
    {seek && <Row settingId="lyrics-seek-compensation" label="Seek Fade-in Compensation" description="Clicking a lyric seeks 300ms before it, so Spotify's fade-in does not cut off the start."><Toggle checked={seekFadeCompensation} onChange={(v) => $seekFadeCompensation.set(v)} /></Row>}
    </SettingsSection>}
    {scrolling && <SettingsSection title="Scrolling">
    {early && <Row settingId="lyrics-early-scroll" label="Early Scroll" description="Start scrolling to the next line before it becomes active."><Toggle checked={scrollLeadEnabled} onChange={(v) => $scrollLeadEnabled.set(v)} /></Row>}
    {lead && <Row settingId="lyrics-early-scroll-time" label="Early Scroll Time" description="How early to move to the next line." disabled={!scrollLeadEnabled} disabledReason="Enable Early Scroll to modify this setting" stacked><Slider value={scrollLeadMs} min={0} max={800} step={10} defaultValue={250} unit="ms" onChange={(v) => $scrollLeadMs.set(Math.max(0, Math.min(800, Math.round(v / 10) * 10)))} disabled={!scrollLeadEnabled} /></Row>}
    {smooth && <Row settingId="lyrics-smooth-scrolling" label="Smooth Scrolling" description="Use spring motion for scrolling and interlude transitions."><Toggle checked={smoothScrolling} onChange={(v) => $smoothScrolling.set(v)} /></Row>}
    </SettingsSection>}
    {behavior && <SettingsSection title="Lyrics behavior">
    {floating && <Row settingId="lyrics-space-gravity" label="Space Gravity Mode" description="Let lyric words float as they’re sung."><Toggle checked={gravity} onChange={value => $spaceGravityMode.set(value)} /></Row>}
    {words && <Row settingId="lyrics-word-filters" label="Unique Word Filters" description="Change the spelling or case of lyric words."><Select value={uniqueWordFilterOptions.includes(memeFormat) ? memeFormat : "Off"} options={uniqueWordFilterOptions} onChange={value => $memeFormat.set(value)} /></Row>}
    {skeleton && <ExperimentSettings experimentIds={["lyricsSkeleton"]} showBuiltIn={false} />}
    {r9 && <Row settingId="lyrics-line-hover" label="Line Hover Background" description="Shows a highlight box behind a lyrics line when you hover over it"><Toggle checked={lineHoverBackground} onChange={(v) => $lineHoverBackground.set(v)} /></Row>}
    {r10 && <Row settingId="lyrics-wide-duet-padding" label="Wide duet line padding" description="Separate duet voices into wider columns. Disable for compact padding."><Toggle checked={duetLinePadding} onChange={(v) => $duetLinePadding.set(v)} /></Row>}
    {joinSplit && <Row label="Join Split Words" description="Choose which words sung in syllables should join together."><Select value={syllableMerge} options={["off", "full", "steady", "held"]} labels={["Off", "All Words", "Steadily Sung", "Held Words"]} onChange={(v) => $syllableMerge.set(v as SyllableMerge)} /></Row>}
    {pace && <Row label="Keep Syllable Pace" description="Joined words follow each syllable's timing." disabled={syllableMerge === "off"}><Toggle checked={syllablePace} onChange={(v) => $syllablePace.set(v)} /></Row>}
    {unsynced && <Row label="Unsynced Auto-scroll" description="Scroll unsynced lyrics through the song using loudness or vocals."><Select value={staticAutoScroll} options={["off", "basic", "advanced"]} labels={["Off", "Loudness", "Vocals"]} onChange={(v) => $staticAutoScroll.set(v as StaticAutoScroll)} /></Row>}
    {wordSync && <Row settingId="lyrics-experimental-word-sync" label="Experimental Word Sync" description="Estimate word sync for line or static lyrics."><Toggle checked={experimentalWordSync} onChange={(value) => $enableExperimentalWordSync.set(value)} /></Row>}
    {credits && <Row settingId="lyrics-credits-follow-singer" label="Credits Follow the Last Singer" description="Align credits with the last duet line."><Toggle checked={creditsFollowLastLine} onChange={(v) => $creditsFollowLastLine.set(v)} /></Row>}
    {refinedCredits && <ExperimentSettings experimentIds={["refinedCredits"]} showBuiltIn={false} />}
    {popup && <Row settingId="interface-disable-popup" label="Enable Popup Player" description="Open lyrics in a separate window."><Toggle checked={popupAllowed} onChange={value => $popupLyricsAllowed.set(value)} /></Row>}
    {popupDock && <ExperimentSettings experimentIds={["popupDock"]} showBuiltIn={false} />}
    {nextTrack && <Row settingId="nextUpPlacement" label="Up Next" description="Show the next track in a page corner during the final 30 seconds. Bottom corners share space with pinned credits. Hidden while Spotify’s queue is open."><Select value={nextUp} options={["off", "topLeft", "bottomLeft", "bottomRight"]} labels={["Off", "Top Left", "Bottom Left", "Bottom Right"]} onChange={value => $nextUpPlacement.set(value as NextUpPlacement)} /></Row>}
    </SettingsSection>}
  </>;
}
