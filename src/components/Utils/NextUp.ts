import "../../css/NextUp.css";
import Global from "../Global/Global.ts";
import { SpotifyPlayer } from "../Global/SpotifyPlayer.ts";
import { PageContainer } from "../Pages/PageView.ts";
import { IsPIP } from "./PopupLyrics.ts";
import { $nextUpPlacement } from "../../utils/stores.ts";
import { CreateTextScroller, type TextScroller } from "../../utils/TextScroller.ts";
import { syncLyricsFooterClearance } from "../../utils/Lyrics/LyricsVirtualizer.ts";

/** The next track appears in a page corner for the last 30 seconds, sharing the footer when needed. */

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
const PLACEMENT_GAP_PX = 24;
const FOOTER_GAP_PX = 16;
const reservedCredits = new Set<HTMLElement>();

type NextTrack = { uri: string; title: string; artist: string; image: string | null };
type Body = { el: HTMLElement; scroller: TextScroller | null };

let root: HTMLElement | null = null;
let body: Body | null = null;
let shownUri: string | null = null;
let ticker: ReturnType<typeof setInterval> | null = null;
let layoutObserver: ResizeObserver | null = null;
let controlsObserver: MutationObserver | null = null;
let hiddenAt = 0;
// A track forced in from the console, shown regardless of time left.
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
  if (document.querySelector('button[data-testid="control-button-queue"]:is([aria-pressed="true"], [data-active="true"])')) return true;
  return [...document.querySelectorAll<HTMLElement>('[data-testid="queue-panel"], [data-testid="queue-view"]')]
    .some(panel => panel.getClientRects().length > 0 && getComputedStyle(panel).visibility !== "hidden");
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

function releaseCreditRow(row: HTMLElement): void {
  row.classList.remove("NextUpBeside", "NextUpShared");
  for (const property of ["--LL-NextUpReserveLeft", "--LL-NextUpReserveRight", "--LL-NextUpSideLeft", "--LL-NextUpSideRight", "--LL-NextUpRowHeight"]) row.style.removeProperty(property);
}

function clearCreditsSpace(): void {
  for (const row of reservedCredits) releaseCreditRow(row);
  reservedCredits.clear();
}

function footerPositions(box: HTMLElement) {
  return pinnedRows(box).map(row => {
    const rect = row.getBoundingClientRect();
    // Recover the full footer width so successive layouts do not keep shrinking it.
    const left = rect.left - (parseFloat(row.style.getPropertyValue("--LL-NextUpReserveLeft")) || 0);
    const right = rect.right + (parseFloat(row.style.getPropertyValue("--LL-NextUpReserveRight")) || 0);
    return { row, rect, left, right, bottom: rect.bottom - (parseFloat(getComputedStyle(row).paddingBottom) || 0) };
  });
}

function syncCreditsSpace(positions: ReturnType<typeof footerPositions>, left: number, top: number, width: number, height: number): void {
  const current = new Set(positions.map(({ row }) => row));
  for (const row of reservedCredits) {
    if (current.has(row)) continue;
    releaseCreditRow(row);
    reservedCredits.delete(row);
  }
  for (const { row, rect, left: footerLeft, right: footerRight, bottom } of positions) {
    const overlaps = left < footerRight + FOOTER_GAP_PX && left + width > footerLeft - FOOTER_GAP_PX && top < rect.bottom && top + height > rect.top;
    const reserveLeft = overlaps && $nextUpPlacement.get() === "bottomLeft" ? Math.max(0, Math.ceil(left + width + FOOTER_GAP_PX - footerLeft)) : 0;
    const reserveRight = overlaps && $nextUpPlacement.get() === "bottomRight" ? Math.max(0, Math.ceil(footerRight - left + FOOTER_GAP_PX)) : 0;
    const shared = !!(reserveLeft || reserveRight) && !!PageContainer?.classList.contains("Exp_RefinedCredits") &&
      !!row.querySelector(".CommunityCredits :is(.Maker, .Uploader)");
    // Only the contributor row gives up width; the provider spans the row above both columns.
    for (const [property, reserve] of [
      ["--LL-NextUpReserveLeft", shared ? 0 : reserveLeft],
      ["--LL-NextUpReserveRight", shared ? 0 : reserveRight],
      ["--LL-NextUpSideLeft", shared ? reserveLeft : 0],
      ["--LL-NextUpSideRight", shared ? reserveRight : 0],
      ["--LL-NextUpRowHeight", shared ? Math.max(height, Math.ceil(bottom - top)) : 0],
    ] as const) {
      const value = reserve ? `${reserve}px` : "";
      if (row.style.getPropertyValue(property) !== value) {
        if (value) row.style.setProperty(property, value);
        else row.style.removeProperty(property);
      }
    }
    row.classList.toggle("NextUpBeside", !shared && !!(reserveLeft || reserveRight));
    row.classList.toggle("NextUpShared", shared);
    if (reserveLeft || reserveRight) reservedCredits.add(row);
    else reservedCredits.delete(row);
  }
}

function canvasCaptionBounds(box: HTMLElement, rightEdge: number) {
  const page = box.closest("#LyssnaLyricsPage");
  if (!page?.matches(".CanvasImmersive.NowBarSide__Left:not(.CompactMode, .ForcedCompactMode)")) {
    box.style.removeProperty("--LyssnaCanvasCaptionMaxWidth");
    return null;
  }
  const metadata = box.querySelector<HTMLElement>(".NowBar.Active .Header > .Metadata");
  if (!metadata || metadata.offsetHeight === 0) return null;
  const captionWidth = `${Math.max(56, Math.floor(rightEdge - metadata.getBoundingClientRect().left - 144 - FOOTER_GAP_PX))}px`;
  if (box.style.getPropertyValue("--LyssnaCanvasCaptionMaxWidth") !== captionWidth) box.style.setProperty("--LyssnaCanvasCaptionMaxWidth", captionWidth);
  const rows = [...box.querySelectorAll<HTMLElement>(".NowBar.Active .Header > .Metadata :is(.SongName, .Artists, .ArtistYear)")];
  const visible = rows.map(row => {
    const rect = row.getBoundingClientRect();
    const track = row.matches(".SongName") ? row.firstElementChild as HTMLElement | null : null;
    // Use the visible text width, not the caption's full-width marquee window.
    const width = track ? Math.min(rect.width, track.offsetWidth * (rect.width / row.offsetWidth || 1)) : rect.width;
    return { top: rect.top, bottom: rect.bottom, right: rect.left + width, width, height: rect.height };
  }).filter(rect => rect.width > 0 && rect.height > 0);
  if (!visible.length) return null;
  return { top: Math.min(...visible.map(rect => rect.top)), bottom: Math.max(...visible.map(rect => rect.bottom)), right: Math.max(...visible.map(rect => rect.right)) };
}

function syncPlacement(box: HTMLElement): void {
  if (!root) return;
  const placement = $nextUpPlacement.get();
  if (root.dataset.placement !== placement) root.dataset.placement = placement;
  const parent = (root.offsetParent as HTMLElement | null)?.getBoundingClientRect() ?? box.getBoundingClientRect();
  const positions = placement === "topLeft" ? [] : footerPositions(box);
  const cornerLeft = parent.left + PLACEMENT_GAP_PX;
  const cornerRight = parent.right - PLACEMENT_GAP_PX;
  const lyricColumn = box.querySelector<HTMLElement>(".LyricsContent .VirtualLyricsContainer")?.getBoundingClientRect();
  const canvasRight = lyricColumn && lyricColumn.width > 0 ? Math.min(cornerRight, lyricColumn.left - FOOTER_GAP_PX) : cornerRight;
  if (placement !== "bottomLeft") box.style.removeProperty("--LyssnaCanvasCaptionMaxWidth");
  const caption = placement === "bottomLeft" ? canvasCaptionBounds(box, canvasRight) : null;
  const availableRight = caption ? canvasRight : cornerRight;
  const availableWidth = (edge: number) => positions.reduce((available, { left, right }) => {
    const minimumCredits = Math.min(right - left, Math.max(64, Math.min(160, (right - left) / 2)));
    return Math.min(available, placement === "bottomLeft"
      ? right - minimumCredits - FOOTER_GAP_PX - edge
      : cornerRight - left - minimumCredits - FOOTER_GAP_PX);
  }, availableRight - edge);
  const captionEdge = caption ? Math.max(cornerLeft, caption.right + FOOTER_GAP_PX) : cornerLeft;
  const placementLeft = caption ? captionEdge : cornerLeft;
  const widthLimit = availableWidth(placementLeft);
  const limit = `${Math.max(0, Math.floor(widthLimit))}px`;
  if (root.style.maxWidth !== limit) root.style.maxWidth = limit;
  root.toggleAttribute("data-compact", widthLimit < 144);
  const width = root.offsetWidth;
  const height = root.offsetHeight;
  const noRoom = widthLimit < 56 || parent.height < height + PLACEMENT_GAP_PX * 2;
  root.toggleAttribute("data-no-room", noRoom);
  if (width === 0 || height === 0 || noRoom) { clearCreditsSpace(); return; }
  const clampLeft = (left: number) => Math.max(cornerLeft, Math.min(left, cornerRight - width));
  const setPosition = (left: number, top: number) => {
    const x = `${Math.round(clampLeft(left) - parent.left)}px`;
    if (root!.style.left !== x) root!.style.left = x;
    const offset = Math.round(Math.max(PLACEMENT_GAP_PX, Math.min(top - parent.top, parent.height - height - PLACEMENT_GAP_PX)));
    const y = `${offset}px`;
    if (root!.style.top !== y) root!.style.top = y;
    return parent.top + offset;
  };

  if (placement === "topLeft") {
    clearCreditsSpace();
    const left = cornerLeft;
    // Keep the corner fixed while controls appear, rather than pushing the card into the artwork.
    const toolbar = box.querySelector<HTMLElement>(".ViewControls.LyssnaToolbar")?.getBoundingClientRect();
    const top = setPosition(left, parent.top + PLACEMENT_GAP_PX);
    const overlapsToolbar = !!toolbar && toolbar.width > 0 && toolbar.height > 0 &&
      left < toolbar.right + 8 && left + width > toolbar.left - 8 &&
      top < toolbar.bottom + 8 && top + height > toolbar.top - 8;
    root.toggleAttribute("data-toolbar-overlap", overlapsToolbar);
    return;
  }

  root.removeAttribute("data-toolbar-overlap");

  const left = placement === "bottomLeft" ? placementLeft : clampLeft(cornerRight - width);
  let bottom = caption ? parent.bottom - PLACEMENT_GAP_PX : Math.min(parent.bottom - PLACEMENT_GAP_PX, ...positions.map(position => position.bottom));
  const viewSwitch = box.classList.contains("ViewSwitchAwake") ? box.querySelector<HTMLElement>(".ViewSwitch")?.getBoundingClientRect() : null;
  if (viewSwitch && left < viewSwitch.right + FOOTER_GAP_PX && left + width > viewSwitch.left - FOOTER_GAP_PX && bottom > viewSwitch.top) {
    bottom = Math.min(bottom, viewSwitch.top - FOOTER_GAP_PX);
  }
  const top = setPosition(left, bottom - height);
  syncCreditsSpace(positions, left, top, width, height);
}

function clearanceTop(box: HTMLElement): number {
  return Math.min(root!.getBoundingClientRect().top, ...pinnedRows(box).map(row => row.getBoundingClientRect().top));
}

function syncShownLayout(box: HTMLElement) {
  if (!root?.classList.contains("Shown")) return;
  syncPlacement(box);
  if ($nextUpPlacement.get() !== "topLeft") liftLyrics(box, true);
}

function stopLayoutObservers() {
  layoutObserver?.disconnect();
  controlsObserver?.disconnect();
  layoutObserver = null;
  controlsObserver = null;
}

function observeLayout(box: HTMLElement) {
  stopLayoutObservers();
  layoutObserver = new ResizeObserver(() => { if (host() === box) syncShownLayout(box); });
  for (const element of [box, root, ...box.querySelectorAll<HTMLElement>(".NowBar.Active, .Metadata, .Metadata .SongName > span, .Metadata .Artists, .Metadata .ArtistYear, .MediaBox, .ViewControls.LyssnaToolbar, .ViewSwitch, .LyricsPinnedFooter, .LyricsPinnedCredits")]) {
    if (element) layoutObserver.observe(element);
  }
  controlsObserver = new MutationObserver(() => { if (host() === box) syncShownLayout(box); });
  controlsObserver.observe(box, { attributes: true, attributeFilter: ["class"] });
}

/**
 * The lyrics fade out a little higher while Up Next shows, so no line runs under it. The lift is
 * how far the fade has to move to end just above the element when its layout changes.
 */
function liftLyrics(box: HTMLElement, lift: boolean) {
  const container = box.querySelector<HTMLElement>(".LyricsContainer");
  const content = container?.querySelector<HTMLElement>(".LyricsContent");
  if (!container || !content) return;
  const card = root?.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const column = content.querySelector<HTMLElement>(".VirtualLyricsContainer")?.getBoundingClientRect() ?? contentRect;
  if (!lift || !root || !card || root.offsetHeight === 0 || root.hasAttribute("data-no-room") || $nextUpPlacement.get() === "topLeft" || card.right <= column.left || card.left >= column.right) {
    const hadRoom = container.classList.contains("NextUpRoom");
    container.classList.remove("NextUpRoom");
    container.style.removeProperty("--LL-NextUpRoom");
    if (hadRoom) syncLyricsFooterClearance();
    return;
  }
  const contentBottom = contentRect.bottom;
  const top = clearanceTop(box);
  // Where the fade reaches transparent without the lift, measured from the bottom of the lyrics
  // (main.css; PinnedCredits.css moves it above the pinned rows).
  const fadeEnd = parseFloat(content.style.getPropertyValue("--LL-PinnedFooterTrackBottom")) || (container.classList.contains("HasPinnedCredits")
    ? (parseFloat(container.style.getPropertyValue("--LL-PinnedCreditsHeight")) || 0) + 24 + 8
    : 16);
  const room = Math.max(0, Math.round(contentBottom - top + LYRICS_CLEARANCE_PX - fadeEnd));
  const value = `${room}px`;
  const changed = !container.classList.contains("NextUpRoom") ||
    container.style.getPropertyValue("--LL-NextUpRoom") !== value;
  if (container.style.getPropertyValue("--LL-NextUpRoom") !== value) container.style.setProperty("--LL-NextUpRoom", value);
  container.classList.add("NextUpRoom");
  if (changed) syncLyricsFooterClearance();
}

function show(box: HTMLElement) {
  if (!root || root.classList.contains("Shown")) return;
  // Every reveal starts the title from its beginning.
  body?.scroller?.resume();
  root.classList.add("Shown");
  syncPlacement(box);
  liftLyrics(box, true);
  observeLayout(box);
}

function hide() {
  if (!root?.classList.contains("Shown")) return;
  root.classList.remove("Shown");
  stopLayoutObservers();
  clearCreditsSpace();
  hiddenAt = performance.now();
  // Hidden, the title's scroll would still restyle it every frame. It stops once the exit has
  // played, so it doesn't jump back to its start while still fading.
  const hiding = body;
  setTimeout(() => {
    if (body === hiding && !root?.classList.contains("Shown")) hiding?.scroller?.pause();
  }, EXIT_MS);
  const box = host();
  if (box) {
    box.style.removeProperty("--LyssnaCanvasCaptionMaxWidth");
    liftLyrics(box, false);
  }
}

function unmount() {
  stopLayoutObservers();
  clearCreditsSpace();
  if (ticker) clearInterval(ticker);
  ticker = null;
  const box = PageContainer?.querySelector<HTMLElement>(".ContentBox");
  if (box) {
    box.style.removeProperty("--LyssnaCanvasCaptionMaxWidth");
    liftLyrics(box, false);
  }
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
    stopLayoutObservers();
    clearCreditsSpace();
    // A rebuilt view: start over in the new box, and keep the ticker running.
    if (body) dropBody(body, false);
    body = null;
    root?.remove();
    shownUri = null;
    root = box.ownerDocument.createElement("div");
    root.className = "NextUp";
    box.append(root);
  }
  // Hidden cards need no geometry reads during the rest of the song.
  syncShownLayout(box);

  const next = forced ?? readNextTrack();
  const duration = SpotifyPlayer.GetDuration();
  const remaining = duration - SpotifyPlayer.GetPosition();
  const wanted =
    !!next &&
    (!!forced ||
      // Repeat-one plays this song again, so nothing else is next.
      (SpotifyPlayer.LoopType !== "track" && duration > 0 && remaining <= SHOW_WITHIN_MS)) &&
    !PageContainer?.classList.contains("QueueOpen") && !spotifyQueueOpen();
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
// The corner stays fixed; swapping artwork changes the footer space available beside it.
Global.Event.listen("nowbar:side-swap:after", () => {
  if (!root?.classList.contains("Shown")) return;
  const box = host();
  if (box) requestAnimationFrame(() => syncShownLayout(box));
});
$nextUpPlacement.listen(() => { unmount(); sync(); });
