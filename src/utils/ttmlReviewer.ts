import { atom } from "nanostores";
import { toast } from "sonner";
import { type ExperimentId, EXPERIMENTS } from "./experiments.ts";
import { $currentLyricsData, $ttmlReviewerMode, PersistedSettings, type TtmlReviewerMode } from "./stores.ts";
import Global from "../components/Global/Global.ts";

// The backup stays separate from preferences so a crash cannot discard the original values.
const BACKUP_KEY = "LL:ttmlReviewer";
const LEGACY_BACKUP_KEY = "SL:ttmlReviewer";
const BACKUP_FORMAT_KEY = "$format";
const BACKUP_FORMAT = 2;

/** What the mode sets. Each `key` is both the persisted key and its settings row's id. */
export const REVIEWER_SETTINGS: readonly { key: string; value: unknown; shown: string }[] = [
  // Timing: anything that moves when a line appears, or where a click lands.
  { key: "playbackOffset", value: 0, shown: "0 ms" },
  { key: "seekFadeCompensation", value: false, shown: "Off" },
  { key: "scrollLeadEnabled", value: false, shown: "Off" },
  { key: "smoothScrolling", value: false, shown: "Off" },
  { key: "animationFpsCapEnabled", value: false, shown: "Off" },
  // Lyrics: anything that hides lines or changes how they're split or animated.
  { key: "rendererVisualStyle", value: "spring", shown: "Spring" },
  { key: "minimalLyricsMode", value: false, shown: "Off" },
  { key: "syllableMerge", value: "off", shown: "Off" },
  { key: "lineHoverBackground", value: true, shown: "On" },
  { key: "duetLinePadding", value: true, shown: "On" },
  { key: "creditsFollowLastLine", value: false, shown: "Off" },
  { key: "customFontEnabled", value: false, shown: "Off" },
  { key: "spaceGravityMode", value: false, shown: "Off" },
  { key: "memeFormat", value: "Off", shown: "Off" },
  { key: "animatorPreset", value: "Default", shown: "Default" },
  { key: "enableExperimentalWordSync", value: false, shown: "Off" },
  // Background: still, so nothing competes with the lyrics for attention or frames.
  { key: "staticBackgroundMode", value: "color", shown: "Cover Colors" },
  { key: "staticBackgroundBlur", value: 0, shown: "0 px" },
  { key: "showNpvDynamicBg", value: false, shown: "Off" },
];

/** Switched off outright. Every other experiment follows its default. */
export const REVIEWER_EXPERIMENTS_OFF: readonly ExperimentId[] = [
  "canvasImmersive",
  "npvCanvasBackground",
  "nextUpCard",
];

export const REVIEWER_LOCK_REASON = "Locked while TTML Reviewer is on.";

const experimentKey = (id: ExperimentId) => `experiment:${id}`;
const offExperiments = new Set<string>(REVIEWER_EXPERIMENTS_OFF.map(experimentKey));

// `undefined` for an experiment means "no choice made", so its default (local or
// remote) keeps applying.
const profile = new Map<string, unknown>([
  ...REVIEWER_SETTINGS.map(({ key, value }) => [key, value] as [string, unknown]),
  ...EXPERIMENTS.map(({ id }): [string, unknown] => [
    experimentKey(id),
    offExperiments.has(experimentKey(id)) ? false : undefined,
  ]),
]);

function readBackup(): Record<string, unknown> | null {
  for (const key of [BACKUP_KEY, LEGACY_BACKUP_KEY]) {
    try {
      const raw = Spicetify.LocalStorage.get(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch { /* Keep unreadable records intact. */ }
  }
  return null;
}

function writeBackup(value: string): boolean {
  try {
    Spicetify.LocalStorage.set(BACKUP_KEY, value);
    return Spicetify.LocalStorage.get(BACKUP_KEY) === value;
  } catch {
    return false;
  }
}

function applyProfile() {
  for (const [key, value] of profile) PersistedSettings.get(key)?.set(value);
}

/** What to put back for a key. `null` means it was never set, and restoring unsets it. */
function backupValue(key: string): unknown {
  const entry = PersistedSettings.get(key);
  return entry?.isStored() ? entry.get() : null;
}

/**
 * A session starting in the mode lays the profile over again: an older copy can rewrite
 * the blob meanwhile. An update can also have added keys, whose real values are saved
 * first. If that can't be saved, those keys are left alone rather than lost.
 */
function resumeProfile() {
  const backup = readBackup();
  if (!backup) return;
  // A backup with no format predates `null` entries: what it leaves out was never set, and
  // the blob now holds the profile's value for it, not a real one.
  const unversioned = !Object.hasOwn(backup, BACKUP_FORMAT_KEY);
  const added = [...profile.keys()].filter((key) => !Object.hasOwn(backup, key));
  for (const key of added) backup[key] = unversioned ? null : backupValue(key);
  backup[BACKUP_FORMAT_KEY] = BACKUP_FORMAT;
  const saved = (added.length === 0 && !unversioned) || writeBackup(JSON.stringify(backup));
  for (const [key, value] of profile) {
    if (saved || !added.includes(key)) PersistedSettings.get(key)?.set(value);
  }
}

export const $ttmlReviewer = atom<boolean>(readBackup() !== null);
if ($ttmlReviewer.get() && !PersistedSettings.get("ttmlReviewerMode")?.isStored()) $ttmlReviewerMode.set("always");

/** Whether the mode holds this settings row (by id) still. */
export function isHeldByReviewer(id: string): boolean {
  const keys: Record<string, string> = {
    "appearance-custom-font": "customFontEnabled",
    "appearance-background-type": "staticBackgroundMode",
    "appearance-background-blur": "staticBackgroundBlur",
    "appearance-npv-background": "showNpvDynamicBg",
    "appearance-fps-limit": "animationFpsCapEnabled",
    "lyrics-playback-offset": "playbackOffset",
    "lyrics-seek-compensation": "seekFadeCompensation",
    "lyrics-early-scroll": "scrollLeadEnabled",
    "lyrics-smooth-scrolling": "smoothScrolling",
    "lyrics-minimal-mode": "minimalLyricsMode",
    "lyrics-simple-mode": "rendererVisualStyle",
    "lyrics-line-hover": "lineHoverBackground",
    "lyrics-wide-duet-padding": "duetLinePadding",
    "lyrics-credits-follow-singer": "creditsFollowLastLine",
    "lyrics-space-gravity": "spaceGravityMode",
    "lyrics-word-filters": "memeFormat",
    "lyrics-experimental-word-sync": "enableExperimentalWordSync",
    "effects-animator-presets": "animatorPreset",
  };
  return profile.has(keys[id] ?? id);
}

let changingProfile = false;
export const IsChangingReviewerProfile = () => changingProfile;
export const REVIEWER_MODES: { value: TtmlReviewerMode; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "temporary", label: "Apply on Temp" },
  { value: "always", label: "Always Apply" },
];

function setReviewerActive(on: boolean): boolean {
  if (changingProfile || $ttmlReviewer.get() === on) return false;
  const backup = readBackup();
  if (!on && !backup) {
    toast.error("Couldn't read the original settings. TTML Reviewer's backup was left untouched.", { duration: 5000 });
    return false;
  }
  changingProfile = true;
  try {
    if (on) {
      if (!backup) {
        const saved: Record<string, unknown> = { [BACKUP_FORMAT_KEY]: BACKUP_FORMAT };
        for (const key of profile.keys()) saved[key] = backupValue(key);
        if (!writeBackup(JSON.stringify(saved))) {
          toast.error("Couldn't save your settings, so TTML Reviewer stayed off.", { duration: 5000 });
          return false;
        }
      }
      applyProfile();
    } else if (backup) {
      for (const key of Object.keys(backup)) {
        if (key === BACKUP_FORMAT_KEY) continue;
        const entry = PersistedSettings.get(key);
        if (backup[key] === null) entry?.unset();
        else entry?.set(backup[key]);
      }
      // Remove the backup only after every original preference has been restored.
      Spicetify.LocalStorage.remove(BACKUP_KEY);
      Spicetify.LocalStorage.remove(LEGACY_BACKUP_KEY);
    }
    $ttmlReviewer.set(on);
    return true;
  } catch (error) {
    if (readBackup()) $ttmlReviewer.set(true);
    console.error("Lyssna Lyrics couldn't change the TTML reviewer profile:", error);
    toast.error("Couldn't change TTML Reviewer. Your settings backup was kept.", { duration: 5000 });
    return false;
  } finally {
    changingProfile = false;
  }
}

export function SyncTtmlReviewerForLyrics(lyrics: unknown, uri: string | undefined): boolean {
  const currentUri = Spicetify.Player.data?.item?.uri ?? (Spicetify.Player.data as any)?.track?.uri;
  if (uri && uri !== currentUri) return false;
  const data = lyrics as { uri?: unknown; temporaryUpload?: unknown; userUploaded?: unknown; uploadedTTML?: unknown } | null;
  const temporary = !!uri && data?.temporaryUpload === true && data.userUploaded === true && typeof data.uploadedTTML === "string" && data.uri === uri;
  return setReviewerActive($ttmlReviewerMode.get() === "always" || ($ttmlReviewerMode.get() === "temporary" && temporary));
}

export function SyncTtmlReviewerWithCurrentLyrics(): boolean {
  let lyrics: unknown = null;
  try { lyrics = JSON.parse($currentLyricsData.get()); } catch { /* Notice states have no upload. */ }
  const uri = Spicetify.Player.data?.item?.uri ?? (Spicetify.Player.data as any)?.track?.uri;
  return SyncTtmlReviewerForLyrics(lyrics, uri);
}

export function setTtmlReviewerMode(mode: TtmlReviewerMode): void {
  if (REVIEWER_MODES.some(option => option.value === mode)) $ttmlReviewerMode.set(mode);
}

$ttmlReviewerMode.listen(() => {
  if (SyncTtmlReviewerWithCurrentLyrics()) Global.Event.evoke("ttml-reviewer:changed", null);
});
$currentLyricsData.listen(() => {
  if (!changingProfile) SyncTtmlReviewerWithCurrentLyrics();
});

/**
 * Other extensions restyling or rewriting the lyrics right now. They aren't ours to
 * turn off, so the tab names them. Their globals could change: read them defensively.
 */
export function getOtherLyricsExtensions(): string[] {
  const active: string[] = [];
  try {
    if ((window as any).SpicyThemes?.getState?.()?.isEnabled === true) active.push("Spicy Themes");
  } catch {
    // Not a reason to break the tab.
  }
  if (
    (window as any).SpicyLyricTranslater &&
    Spicetify.LocalStorage.get("spicy-lyric-translator:translation-enabled") === "true"
  ) {
    active.push("Spicy Lyric Translator");
  }
  return active;
}

queueMicrotask(() => {
  const backup = readBackup();
  if (backup) {
    if (!PersistedSettings.get("ttmlReviewerMode")?.isStored()) $ttmlReviewerMode.set("always");
    const legacy = Spicetify.LocalStorage.get(LEGACY_BACKUP_KEY);
    if (legacy && !Spicetify.LocalStorage.get(BACKUP_KEY) && writeBackup(legacy)) {
      Spicetify.LocalStorage.remove(LEGACY_BACKUP_KEY);
    }
    if ($ttmlReviewerMode.get() === "always") {
      changingProfile = true;
      try { resumeProfile(); } finally { changingProfile = false; }
    }
  }
  SyncTtmlReviewerWithCurrentLyrics();
  Spicetify.Player.addEventListener("songchange", () => SyncTtmlReviewerWithCurrentLyrics());
});
