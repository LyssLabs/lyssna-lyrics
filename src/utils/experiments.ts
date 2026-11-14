import { computed, type ReadableAtom } from "nanostores";
import { persistAtom } from "./stores.ts";

/**
 * ─── Experiments ──────────────────────────────────────────────────────────────
 *
 * Opt-in/opt-out feature flags surfaced in Settings → Experiments.
 *
 * TO ADD AN EXPERIMENT: append one entry to the EXPERIMENTS array below. That is
 * the whole registration — the settings UI, the persisted store and (if you set
 * `pageClass`) the CSS hook are all derived from it. Nothing else to wire up.
 *
 *   {
 *     id: "myExperiment",              // stable; persisted as "experiment:myExperiment"
 *     category: "lyrics",              // the Experiments tab heading it sits under
 *     label: "My Experiment",
 *     description: "What it changes, and what turning it off restores.",
 *     default: true,
 *     pageClass: "Exp_MyExperiment",   // optional — toggled on #SpicyLyricsPage
 *     rebuildsNowBar: true,            // optional — see below
 *     forceState: true,                // optional — see below
 *     hidden: true,                    // optional — see below
 *   }
 *
 * `pageClass` is the preferred way to implement one: write the new look under
 * `#SpicyLyricsPage.Exp_Foo` and keep the old one under
 * `#SpicyLyricsPage:not(.Exp_Foo)`, and the toggle costs nothing at runtime.
 *
 * `rebuildsNowBar` is only for experiments whose *markup* differs between states
 * (CSS alone can't get you there). It makes NowBar tear down and rebuild the
 * fullscreen overlay when the flag flips.
 * `rebuildsLyrics` reapplies the current lyric data when its DOM placement differs.
 *
 * `forceState` locks the experiment: `true` forces it on, `false` forces it off,
 * leaving it out keeps it user-controlled. A forced experiment still shows in the
 * panel, with its toggle locked and a "Forced on/off" tag so people can see why
 * it won't move. The user's own saved choice is left untouched underneath, so
 * removing `forceState` later hands them back whatever they had picked.
 *
 * `hidden` takes the experiment out of the settings panel (and its search) and
 * nothing else: the value still resolves exactly as it would if it were shown.
 *
 */

/** The groups the Experiments tab lists experiments under, in this order. */
export const EXPERIMENT_CATEGORIES = [
  { id: "lyrics", title: "Lyrics" },
  { id: "background", title: "Background" },
  { id: "player", title: "Player" },
] as const;
export type ExperimentCategory = (typeof EXPERIMENT_CATEGORIES)[number]["id"];

export type Experiment = {
  /** Stable key. Persisted in the settings blob as `experiment:<id>`. */
  id: string;
  /** Which heading it's listed under in the Experiments tab. */
  category: ExperimentCategory;
  label: string;
  description: string;
  default: boolean;
  /** Class toggled on `#SpicyLyricsPage` while the experiment is enabled. */
  pageClass?: string;
  /** Rebuild the fullscreen NowBar overlay when this flag changes. */
  rebuildsNowBar?: boolean;
  /** Reapply the current lyrics when this flag changes their markup. */
  rebuildsLyrics?: boolean;
  /** Lock the experiment on (`true`) or off (`false`); omit to let the user choose. */
  forceState?: boolean;
  /** Leave it out of the settings panel. Never affects the value. */
  hidden?: boolean;
};

export const EXPERIMENTS = [
  {
    id: "newSettingsDesign",
    category: "player",
    label: "New Settings and Update Design",
    description: "Use the lavender design for settings, update dialogs, and notifications. Disable for classic neutral styling.",
    default: true,
  },
  {
    id: "newProgressBarStyling",
    category: "player",
    label: "New SliderBar Styling",
    description:
      "New glass-like style for the SliderBar. Disable to revert back to the original one.",
    default: true,
    pageClass: "Exp_NewProgressBar",
  },
  {
    id: "lyricsSkeleton",
    category: "lyrics",
    label: "Lyrics Loading Skeleton",
    description:
      "Shows placeholder lines and a small \"Loading Lyrics\" label while lyrics fetch and render, instead of the blurred spinner. Disable to bring the spinner back.",
    default: true,
    pageClass: "Exp_LyricsSkeleton",
  },
  {
    id: "canvasImmersive",
    category: "background",
    label: "Canvas Stage",
    description:
      "When a song has a Spotify Canvas, it fills the Now Bar side of the screen in place of the album cover, and its colors drive the page background. Only applies with the dynamic background. Disable to keep the cover and the animated cover background.",
    default: true,
  },
  {
    id: "npvCanvasBackground",
    category: "background",
    label: "Canvas NPV Background",
    description:
      "When a song has a Spotify Canvas, the Now Playing View's dynamic background is drawn from the Canvas video playing there, frame for frame, instead of the album cover. Disable to keep the cover.",
    default: true,
  },
  {
    id: "popupDock",
    category: "player",
    label: "Popup Player Dock",
    description:
      "Popup lyrics fill the whole window, with the player docked along the bottom like the Canvas Stage: title and artist at rest, the timeline and controls rising in when you move the mouse. Disable to bring back the cover header and the controls over the enlarged cover.",
    default: true,
    pageClass: "Exp_PopupDock",
  },
  {
    id: "refinedBackground",
    category: "background",
    label: "Refined Background",
    description:
      "Background changes crossfade in place, including switching styles in Settings, and Cover Colors use the cover's deeper tones, changing with the song instead of a second later. Image backgrounds keep their edges instead of being cropped. Disable to bring back the sliding image transition and the brighter Cover Colors.",
    default: true,
    pageClass: "Exp_RefinedBackground",
  },
  {
    id: "musicReactiveBackground",
    category: "background",
    label: "Music-Reactive Background",
    description:
      "The Dynamic (Kawarp) background follows the song as it plays: it flows faster and swells slightly through loud parts, and slows through quiet ones. On the lyrics page, in Cinema View and in fullscreen it's also less blurred, so the movement shows. Disable to bring back the steadier, more blurred flow that only loosely follows the tempo.",
    default: true,
  },
  {
    id: "largerCinemaLyrics",
    category: "lyrics",
    label: "Larger Cinema View Lyrics (Bloom style only)",
    description:
      "In Cinema View and fullscreen, Bloom lyrics grow with the screen instead of stopping at their usual size, so they read well from a distance on a big display. Small windows, the popup and compact mode keep the usual size. Disable to keep the usual size everywhere.",
    default: false,
    pageClass: "Exp_LargerCinemaLyrics",
  },
  {
    id: "springLineSpacing",
    category: "lyrics",
    label: "Increased Line Spacing (Spring style only)",
    description:
      "With the Spring renderer style, lyrics lines sit further apart, spaced by the text size like Bloom (a little tighter) instead of by a sliver of the window width. Disable to bring back Spring's tighter spacing.",
    default: true,
  },
  {
    id: "refinedCredits",
    category: "lyrics",
    label: "Refined Credits",
    description:
      "The credits under the lyrics become quiet type close under the last line, with no box: the songwriters, then the lyrics source beneath. Community lyrics say so on that second line, with the people who made and uploaded them linked by name. In synced lyrics the credits stay dim until the last line has been sung. Disable to bring back the previous credit lines.",
    default: true,
    pageClass: "Exp_RefinedCredits",
  },
  {
    id: "scrubPreview",
    category: "player",
    label: "Scrub Preview",
    description:
      "Hovering or dragging the progress bar shows the time a click would seek to, and the volume bar shows the level it would set. Disable to hide these previews.",
    default: true,
    pageClass: "Exp_ScrubPreview",
  },
  {
    id: "backgroundLinePop",
    category: "lyrics",
    label: "Background Vocal Pop-Out",
    description:
      "Background vocal lines stay tucked away under their line until it's sung, then slide out from beneath it while the lines below make room, and tuck back in once both are done. Only applies with the Bloom renderer style. Disable to keep every background vocal line on screen at all times.",
    default: true,
    pageClass: "Exp_BackgroundLinePop",
  },
  {
    id: "keepOverlappingLines",
    category: "lyrics",
    label: "Keep Overlapping Lines",
    description:
      "With Fade Away Previous Lines on, a line that ends while one above it is still being sung (overlapping lines, background vocals) stays on screen, dimmed, instead of fading out early. Disable to fade every sung line out as soon as it ends.",
    default: true,
    pageClass: "Exp_KeepOverlappingLines",
  },
  {
    id: "portraitFullscreen",
    category: "player",
    label: "Portrait Fullscreen Layout",
    description:
      "In compact fullscreen on a window taller than it is wide, the lyrics use nearly the full width, the cover header sits as far from the top as the lyrics are from the sides, the song title and artist sit beside the cover, level with its bottom edge, and are sized to the lyrics, and the cover grows on hover without covering them. Disable to bring back the regular compact layout.",
    default: true,
    pageClass: "Exp_PortraitFullscreen",
  },
  {
    id: "romajiAsWritten",
    category: "lyrics",
    label: "Romaji as Written",
    description:
      "Japanese romaji is spelled the way romanized lyrics usually are: long vowels as written (kyou, toukyou, koohii), particles as said (wa, e, wo), endings kept on their word (yonde ita), gaps between words even where the syllables are joined, and a capital at the start of the line. Disable to bring back the previous spelling (kyō, tōkyō, o, one word per token).",
    default: true,
  },
  {
    id: "nextUpCard",
    category: "player",
    label: "Up Next",
    description:
      "In fullscreen and Cinema View, the last 30 seconds of a song show the next one in the queue (cover, title and artist) at the bottom of the lyrics. Disable to never show it.",
    default: true,
    pageClass: "Exp_NextUpCard",
  },
  {
    id: "playerBelowCover",
    category: "player",
    label: "Player Below the Cover",
    description:
      "In Cinema View, when no Canvas is showing, the cover moves out toward the screen edge and the player sits under it, always on screen: the title and artist with the like button beside them, then the progress bar with its times, the playback controls and the volume bar. The view buttons line up in a column beside the cover instead of over it. Disable to keep the centered cover and title, with the controls that appear over the cover.",
    default: false,
    pageClass: "Exp_PlayerBelowCover",
  },
  {
    id: "groupedViewControls",
    category: "player",
    label: "Grouped View Controls",
    description:
      "The view buttons share one frosted capsule instead of each having its own. Buttons that switch something on, like romanization, compact mode or the NowBar, fill in white with their icon cut out while it is on. The button back to the current line becomes a matching frosted circle in the bottom corner. Disable to bring back the separate frosted buttons that change their icon instead, and the round button at the lyrics' edge.",
    default: true,
    pageClass: "Exp_GroupedViewControls",
  },
] as const satisfies readonly Experiment[];

/** A registry entry, narrowed to its literal `id`. */
export type RegisteredExperiment = (typeof EXPERIMENTS)[number];
export type ExperimentId = RegisteredExperiment["id"];
/** A registered experiment with its stable id. */
export type ResolvedExperiment = Experiment & { id: ExperimentId };

const REGISTRY = EXPERIMENTS as readonly ResolvedExperiment[];

export function getExperiment(id: ExperimentId): ResolvedExperiment {
  const exp = REGISTRY.find(e => e.id === id);
  if (!exp) throw new Error(`Unknown experiment "${id}"`);
  return exp;
}

export function getExperiments(): ResolvedExperiment[] {
  return [...REGISTRY];
}

/** The ones the settings panel lists: everything not `hidden`. */
export function getVisibleExperiments(): ResolvedExperiment[] {
  return getExperiments().filter((exp) => !exp.hidden);
}

// These controls already appear in their main settings sections.
const INLINE_EXPERIMENTS: ReadonlySet<ExperimentId> = new Set([
  "newSettingsDesign",
  "newProgressBarStyling",
  "lyricsSkeleton",
]);

export function getAdvancedExperiments(): ResolvedExperiment[] {
  return getVisibleExperiments().filter((exp) => !INLINE_EXPERIMENTS.has(exp.id));
}

// `undefined` until the user toggles it, so a `default` from this build keeps
// applying to everyone who never made a choice. Kept even while an experiment is
// forced, so lifting the force hands back whatever they had picked.
const userChoices = new Map(
  REGISTRY.map((exp) => [
    exp.id,
    persistAtom<boolean | undefined>(`experiment:${exp.id}`, undefined),
  ])
);

const stores = new Map<ExperimentId, ReadableAtom<boolean>>(
  REGISTRY.map((exp) => [
    exp.id,
    computed(userChoices.get(exp.id)!, choice => exp.forceState ?? choice ?? exp.default),
  ])
);

/** `true`/`false` while the experiment is locked on/off, `undefined` when the user decides. */
export function forcedExperimentState(id: ExperimentId): boolean | undefined {
  return getExperiment(id).forceState;
}

/** The experiment's resolved value as a store — use in React via `useStore`. */
export function $experiment(id: ExperimentId): ReadableAtom<boolean> {
  const store = stores.get(id);
  if (!store) throw new Error(`Unknown experiment "${id}"`);
  return store;
}

$experiment("newSettingsDesign").listen(() => {
  window.dispatchEvent(new Event("spicy-lyrics:settings-design-changed"));
});

export function isExperimentEnabled(id: ExperimentId): boolean {
  return stores.get(id)?.get() ?? false;
}

export function setExperiment(id: ExperimentId, value: boolean): void {
  if (forcedExperimentState(id) !== undefined) return;
  userChoices.get(id)?.set(value);
}

// Include inactive experiment classes so toggling one off removes its class.
const knownPageClasses = new Set<string>(
  REGISTRY.flatMap((exp) => (exp.pageClass ? [exp.pageClass] : []))
);

/** Sync every experiment's `pageClass` onto the page root. Safe to call anytime. */
export function ApplyExperimentClasses(el: HTMLElement): void {
  const active = new Set<string>();
  for (const exp of getExperiments()) {
    if (!exp.pageClass) continue;
    knownPageClasses.add(exp.pageClass);
    if (isExperimentEnabled(exp.id)) active.add(exp.pageClass);
  }
  for (const cls of knownPageClasses) el.classList.toggle(cls, active.has(cls));
}

/**
 * Notify on user changes without firing during module initialization.
 */
export function onExperimentChange(cb: (experiment: ResolvedExperiment) => void): void {
  for (const exp of REGISTRY) {
    stores.get(exp.id)?.listen(() => cb(getExperiment(exp.id)));
  }
}
