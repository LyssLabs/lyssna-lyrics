import "../../css/NextUp.css";
import Global from "../Global/Global.ts";
import { SpotifyPlayer } from "../Global/SpotifyPlayer.ts";
import { PageContainer } from "../Pages/PageView.ts";
import { IsPIP } from "./PopupLyrics.ts";
import { $nextUpPlacement } from "../../utils/stores.ts";
import { CreateTextScroller, type TextScroller } from "../../utils/TextScroller.ts";
import { ClaimSwitchClearance } from "../../utils/ViewSwitchClearance.ts";

/**
 * The next track appears above the artwork or below the lyrics for the last 30 seconds.
 * Bottom placement lifts pinned credits and the lyric fade; Spotify's open queue hides it.
 */

// Shown once this little of the song is left.
const SHOW_WITHIN_MS = 30_000;
// How often the remaining time and the queue are read while the view is open.
const TICK_MS = 500;
// The longest exit in NextUp.css. Content is swapped only once it has finished.
const EXIT_MS = 220;
// The body crossfade when the next track changes while it shows.
const SWAP_MS = 180;
// Space between the lyrics' fade and the top of the element.
const LYRICS_CLEARANCE_PX = 24;
const movedCredits = new Set<HTMLElement>();

type NextTrack = { uri: string; title: string; artist: string; image: string | null };
type Body = { el: HTMLElement; scroller: TextScroller | null };

let root: HTMLElement | null = null;
let body: Body | null = null;
let shownUri: string | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
let hiddenAt = 0;
// The top edge the lyrics last made room for, so a move (pinned credits, a resize) lifts them again.
let liftedTop: number | null = null;
// A track forced in from the console (SpicyLyrics.testing.nextUp), shown regardless of time left.
let forced: NextTrack | null = null;

function imageUrl(uri: string | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("spotify:image:")) return `https://i.scdn.co/image/${uri.slice("spotify:image:".length)}`;
  return uri.startsWith("https://") ? uri : null;
}

/** The first real track or episode coming up, skipping separators and ads. */
function readNextTrack(): NextTrack | null {
  for (const entry of Spicetify.Queue?.nextTracks ?? []) {
    const track = entry?.contextTrack;
    const uri: string = track?.uri ?? "";
    if (!/^spotify:(track|episode|local):/.test(uri)) continue;
    const meta = track.metadata ?? {};
    if (meta.is_advertisement === "true") continue;
    const artists = Object.keys(meta)
      .filter((key) => /^artist_name(:\d+)?$/.test(key))
      .sort((a, b) => Number(a.split(":")[1] ?? 0) - Number(b.split(":")[1] ?? 0))
      .map((key) => meta[key]);
    return {
      uri,
      title: meta.title ?? "",
      artist: artists.join(", "),
      image: imageUrl(meta.image_url ?? meta.image_large_url ?? meta.image_small_url),
    };
  }
  return null;
}

function host(): HTMLElement | null {
  if (document.hidden || IsPIP || !PageContainer?.isConnected || PageContainer.classList.contains("CardMode")) return null;
  return PageContainer.querySelector<HTMLElement>(".ContentBox");
}

function spotifyQueueOpen(): boolean {
  return !!document.querySelector(
    '[data-testid="queue-panel"], [data-testid="queue-view"], button[data-testid="control-button-queue"][aria-pressed="true"], button[data-testid="control-button-queue"][data-active="true"]'
  );
}

function buildBody(next: NextTrack, shown: boolean): Body {
  const doc = root!.ownerDocument;
  const el = doc.createElement("div");
  el.className = "NextUpBody";

  const art = doc.createElement("div");
  art.className = "NextUpArt";
  if (next.image) {
    const img = doc.createElement("img");
    img.alt = "";
    img.decoding = "async";
    img.addEventListener("load", () => art.classList.add("Loaded"), { once: true });
    img.src = next.image;
    art.append(img);
  }

  const text = doc.createElement("div");
  text.className = "NextUpText";
  const label = doc.createElement("span");
  label.className = "NextUpLabel";
  label.textContent = "Up Next";
  // Each line clips a single track the scroller moves.
  const line = (className: string, value: string) => {
    const box = doc.createElement("span");
    box.className = className;
    const track = doc.createElement("span");
    track.className = "NextUpTrack";
    track.textContent = value;
    box.append(track);
    return box;
  };
  const title = line("NextUpTitle", next.title);
  const artist = line("NextUpArtist", next.artist);
  text.append(label, title, artist);
  el.append(art, text);
  root!.append(el);

  // Created once the lines are in the document, so its observers come from the right window.
  // A body loaded ahead of its reveal waits paused; show() starts it.
  const boxes = next.artist ? [title, artist] : [title];
  const scroller = CreateTextScroller(boxes, {
    holdOnReducedMotion: true,
    overflowClass: "Overflowing",
    paused: !shown,
  });
  return { el, scroller };
}

function dropBody(old: Body, fade: boolean) {
  if (!fade) {
    old.scroller?.destroy();
    old.el.remove();
    return;
  }
  old.el.classList.add("Leaving");
  setTimeout(() => {
    old.scroller?.destroy();
    old.el.remove();
  }, SWAP_MS + 40);
}

function setContent(next: NextTrack, crossfade: boolean) {
  if (!root) return;
  if (body) dropBody(body, crossfade);
  body = buildBody(next, root.classList.contains("Shown"));
  shownUri = next.uri;
}

/**
 * Support both the fork's footer and the compatible upstream credit layer.
 */
function pinnedRows(box: HTMLElement): HTMLElement[] {
  return [...box.querySelectorAll<HTMLElement>(".LyricsContainer > :is(.LyricsPinnedFooter, .LyricsPinnedCredits)")]
    .filter(row => row.childElementCount > 0 && row.getClientRects().length > 0);
}

function clearCreditsOffset(): void {
  for (const row of movedCredits) row.style.removeProperty("--LL-NextUpLift");
  movedCredits.clear();
}

function syncCreditsOffset(box: HTMLElement): void {
  if (!root?.classList.contains("Shown") || $nextUpPlacement.get() !== "bottom") {
    clearCreditsOffset();
    return;
  }
  const rows = pinnedRows(box);
  const content = box.querySelector<HTMLElement>(".LyricsContent");
  if (!content) return;
  const positions = rows.map(row => {
    const rect = row.getBoundingClientRect();
    const lift = parseFloat(row.style.getPropertyValue("--LL-NextUpLift")) || 0;
    return { row, bottom: rect.bottom + lift };
  });
  const top = root.getBoundingClientRect().top;
  const current = new Set(rows);
  for (const row of movedCredits) {
    if (current.has(row)) continue;
    row.style.removeProperty("--LL-NextUpLift");
    movedCredits.delete(row);
  }
  for (const { row, bottom } of positions) {
    const lift = Math.max(0, Math.ceil(bottom - top + 16));
    const value = `${lift}px`;
    if (row.style.getPropertyValue("--LL-NextUpLift") !== value) row.style.setProperty("--LL-NextUpLift", value);
    movedCredits.add(row);
  }
}

function syncPlacement(box: HTMLElement): void {
  if (!root) return;
  const placement = $nextUpPlacement.get();
  if (root.dataset.placement !== placement) root.dataset.placement = placement;
  if (placement !== "topLeft") {
    root.style.removeProperty("left");
    root.style.removeProperty("top");
    return;
  }
  const parent = (root.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? box.getBoundingClientRect();
  const cover = box.querySelector<HTMLElement>(".NowBar.Active .MediaBox");
  const rect = cover?.getClientRects().length ? cover.getBoundingClientRect() : null;
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  const toolbar = box.querySelector<HTMLElement>(".ViewControls.LyssnaToolbar")?.getBoundingClientRect();
  const fallbackTop = toolbar ? toolbar.bottom + 12 : parent.top + 24;
  const left = `${Math.round(Math.max(16, Math.min((rect?.left ?? parent.left + 24) - parent.left, parent.width - width - 16)))}px`;
  const top = `${Math.round(Math.max(16, (rect ? rect.top - height - 16 : fallbackTop) - parent.top))}px`;
  if (root.style.left !== left) root.style.left = left;
  if (root.style.top !== top) root.style.top = top;
}

function clearanceTop(box: HTMLElement): number {
  return Math.min(root!.getBoundingClientRect().top, ...pinnedRows(box).map(row => row.getBoundingClientRect().top));
}

/**
 * The lyrics fade out a little higher while Up Next shows, so no line runs under it. The lift is
 * how far the fade has to move to end just above the element, measured once per reveal.
 */
function liftLyrics(box: HTMLElement, lift: boolean) {
  const container = box.querySelector<HTMLElement>(".LyricsContainer");
  const content = container?.querySelector<HTMLElement>(".LyricsContent");
  if (!container || !content) return;
  if (!lift || !root || $nextUpPlacement.get() !== "bottom") {
    container.classList.remove("NextUpRoom");
    liftedTop = null;
    return;
  }
  const contentBottom = content.getBoundingClientRect().bottom;
  const top = clearanceTop(box);
  liftedTop = top;
  // Where the fade reaches transparent without the lift, measured from the bottom of the lyrics
  // (main.css; PinnedCredits.css moves it above the pinned rows).
  const fadeEnd = parseFloat(content.style.getPropertyValue("--LL-PinnedFooterTrackBottom")) || (container.classList.contains("HasPinnedCredits")
    ? (parseFloat(container.style.getPropertyValue("--LL-PinnedCreditsHeight")) || 0) + 24 + 8
    : 16);
  const room = Math.max(0, Math.round(contentBottom - top + LYRICS_CLEARANCE_PX - fadeEnd));
  container.style.setProperty("--LL-NextUpRoom", `${room}px`);
  container.classList.add("NextUpRoom");
}

function show(box: HTMLElement) {
  if (!root || root.classList.contains("Shown")) return;
  // Every reveal starts the title from its beginning.
  body?.scroller?.resume();
  root.classList.add("Shown");
  syncPlacement(box);
  syncCreditsOffset(box);
  liftLyrics(box, true);
}

function hide() {
  if (!root?.classList.contains("Shown")) return;
  root.classList.remove("Shown");
  clearCreditsOffset();
  hiddenAt = performance.now();
  // Hidden, the title's scroll would still restyle it every frame. It stops once the exit has
  // played, so it doesn't jump back to its start while still fading.
  const hiding = body;
  setTimeout(() => {
    if (body === hiding && !root?.classList.contains("Shown")) hiding?.scroller?.pause();
  }, EXIT_MS);
  const box = host();
  if (box) liftLyrics(box, false);
}

function unmount() {
  clearCreditsOffset();
  if (ticker) clearInterval(ticker);
  ticker = null;
  const box = PageContainer?.querySelector<HTMLElement>(".ContentBox");
  if (box) liftLyrics(box, false);
  if (body) dropBody(body, false);
  body = null;
  root?.remove();
  root = null;
  shownUri = null;
}

function tick() {
  const box = host();
  if (!box || $nextUpPlacement.get() === "off") {
    unmount();
    return;
  }
  if (!root || root.parentElement !== box) {
    // A rebuilt view: start over in the new box, and keep the ticker running.
    if (body) dropBody(body, false);
    body = null;
    root?.remove();
    shownUri = null;
    root = box.ownerDocument.createElement("div");
    root.className = "NextUp";
    // Steps past the Lyrics / Queue switch while it shows (ViewSwitchClearance.ts, NextUp.css).
    ClaimSwitchClearance(root);
    box.append(root);
  }
  // Hidden cards need no geometry reads during the rest of the song.
  if (root.classList.contains("Shown")) {
    syncPlacement(box);
    syncCreditsOffset(box);
    if (liftedTop !== null && Math.abs(clearanceTop(box) - liftedTop) > 1) liftLyrics(box, true);
  }

  const next = forced ?? readNextTrack();
  const duration = SpotifyPlayer.GetDuration();
  const remaining = duration - SpotifyPlayer.GetPosition();
  const wanted =
    !!next &&
    !spotifyQueueOpen() && !PageContainer?.classList.contains("QueueOpen") &&
    (!!forced ||
      // Repeat-one plays this song again, so nothing else is next.
      (SpotifyPlayer.LoopType !== "track" && duration > 0 && remaining <= SHOW_WITHIN_MS));
  const isShown = root.classList.contains("Shown");

  if (!wanted) {
    if (isShown) hide();
    // Loaded while hidden, so the cover is ready by the time it shows, and never swapped
    // during the exit.
    else if (next && next.uri !== shownUri && performance.now() - hiddenAt >= EXIT_MS) setContent(next, false);
    return;
  }

  // The queue changed while it shows: the new track crossfades over the old.
  if (next.uri !== shownUri) setContent(next, isShown);
  if (!isShown) show(box);
}

function sync() {
  if (host() && $nextUpPlacement.get() !== "off") {
    tick();
    ticker ??= setInterval(tick, TICK_MS);
  } else {
    unmount();
  }
}

/** Console hook: show Up Next now with a stand-in track, or pass nothing to go back to the queue. */
export function ForceNextUp(track?: Partial<NextTrack> | null) {
  forced = track
    ? {
        uri: track.uri ?? `spotify:track:forced-${Date.now()}`,
        title: track.title ?? "",
        artist: track.artist ?? "",
        image: track.image ?? null,
      }
    : null;
  sync();
}

Global.Event.listen("fullscreen:open", () => setTimeout(sync, 0));
Global.Event.listen("fullscreen:exit", () => setTimeout(sync, 0));
Global.Event.listen("page:open", () => queueMicrotask(sync));
Global.Event.listen("page:destroy", unmount);
document.addEventListener("visibilitychange", sync);
Global.Event.listen("playback:songchange", () => {
  // The next track is now playing, so it leaves at once rather than on the next tick.
  hide();
  sync();
});
// A side swap moves it to the other end of the column; it fades in there instead of jumping.
Global.Event.listen("nowbar:side-swap:after", () => {
  if (!root?.classList.contains("Shown")) return;
  root.animate([{ opacity: 0, offset: 0 }], { duration: 240, easing: "ease-out" });
  const box = host();
  if (box) requestAnimationFrame(() => liftLyrics(box, true));
});
$nextUpPlacement.listen(() => { unmount(); sync(); });
