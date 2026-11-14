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
 *     pageClass: "Exp_MyExperiment",   // optional — toggled on #LyssnaLyricsPage
 *     rebuildsNowBar: true,            // optional — see below
 *     forceState: true,                // optional — see below
 *     hidden: true,                    // optional — see below
 *   }
 *
 * `pageClass` is the preferred way to implement one: write the new look under
 * `#LyssnaLyricsPage.Exp_Foo` and keep the old one under
 * `#LyssnaLyricsPage:not(.Exp_Foo)`, and the toggle costs nothing at runtime.
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
  /** Class toggled on `#LyssnaLyricsPage` while the experiment is enabled. */
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
      "Show the track’s Canvas beside the lyrics with the dynamic background.",
    default: true,
  },
  {
    id: "popupDock",
    category: "player",
    label: "Popup Player Dock",
    description:
      "Dock playback controls below popup lyrics. Move the mouse to reveal them.",
    default: true,
    pageClass: "Exp_PopupDock",
  },
  {
    id: "refinedBackground",
    category: "background",
    label: "Muted Background",
    description:
      "Deeper artwork colors and crossfades in lyrics, Cinema View and fullscreen.",
    default: true,
    pageClass: "Exp_RefinedBackground",
  },
  {
    id: "musicReactiveBackground",
    category: "background",
    label: "Music-Reactive Background",
    description:
      "Let the dynamic background move with the music.",
    default: true,
  },
  {
    id: "largerCinemaLyrics",
    category: "lyrics",
    label: "Larger Cinema Lyrics",
    description:
      "Scale Apple Music lyrics for Cinema View and fullscreen.",
    default: false,
    pageClass: "Exp_LargerCinemaLyrics",
  },
  {
    id: "refinedCredits",
    category: "lyrics",
    label: "Refined Credits",
    description:
      "Show compact source and contributor credits below the lyrics.",
    default: true,
    pageClass: "Exp_RefinedCredits",
  },
  {
    id: "backgroundLinePop",
    category: "lyrics",
    label: "Background Vocal Pop-Out",
    description:
      "Reveal tagged backing vocals while their group plays.",
    default: true,
    pageClass: "Exp_BackgroundLinePop",
  },
  {
    id: "keepOverlappingLines",
    category: "lyrics",
    label: "Keep Overlapping Lines",
    description:
      "Keep finished overlaps visible in wide Cinema View and fullscreen with Minimal Lyrics Mode.",
    default: true,
    pageClass: "Exp_KeepOverlappingLines",
  },
  {
    id: "portraitFullscreen",
    category: "player",
    label: "Portrait Fullscreen Layout",
    description:
      "Fit fullscreen lyrics and artwork to tall windows.",
    default: true,
    pageClass: "Exp_PortraitFullscreen",
  },
  {
    id: "romajiAsWritten",
    category: "lyrics",
    label: "Romaji as Written",
    description:
      "Use familiar Japanese spellings such as kyou instead of kyō.",
    default: true,
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
  "newProgressBarStyling",
  "lyricsSkeleton",
  "refinedCredits",
  "romajiAsWritten",
  "canvasImmersive",
  "musicReactiveBackground",
  "portraitFullscreen",
  "largerCinemaLyrics",
  "backgroundLinePop",
  "keepOverlappingLines",
  "refinedBackground",
  "popupDock",
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
