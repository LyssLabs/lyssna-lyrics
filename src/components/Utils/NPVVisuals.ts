import Global from "../Global/Global.ts";
import { SpotifyPlayer } from "../Global/SpotifyPlayer.ts";
import { IsCanvasStageVisible } from "../DynamicBG/CanvasImmersive.ts";

// Match canvas wrappers when the NPV changes, rather than during every
// document-wide restyle. Album-cover pseudo-elements remain untouched.
const VISUAL_MARKERS = [
  { className: "lyssna-npv-canvas-video", selector: "video" },
  {
    className: "lyssna-npv-canvas-image",
    selector: [
      ".main-nowPlayingView-canvasVisualEnhancement div:has(> img)",
      '[data-testid="track-visual-enhancement"] + * div:has(> img)',
    ].join(", "),
  },
  {
    className: "lyssna-npv-canvas-host",
    selector: [
      '.main-nowPlayingView-coverArtContainer:has(video, .main-nowPlayingView-canvasVisualEnhancement img)',
      'div:has(> [data-testid="track-visual-enhancement"]):has(video)',
      'div:has(> [data-testid="track-visual-enhancement"] + * img)',
    ].join(", "),
  },
  {
    className: "lyssna-npv-canvas-overlay",
    selector: [
      ".main-nowPlayingView-coverArtContainer :is(div, .E08D6ucrHuPJYzzGO7HG):has(video)",
      "div.Of__Db4QgB9osz_mFxhw:has(video)",
      "div.UUydeXMsXVZofB0YAOgm:has(.main-trackInfo-container)",
      "div.main-nowPlayingView-contextItemInfo:has(.main-trackInfo-container)",
      ":is(.main-nowPlayingView-coverArtVisualEnhancement ~ *, .main-nowPlayingView-coverArtVisualEnhancement *, .main-nowPlayingView-coverArtVisualEnhancement ~ * *):not(.main-nowPlayingView-coverArtVisualEnhancement):is(:has(video, .main-nowPlayingView-canvasVisualEnhancement img), .main-nowPlayingView-canvasVisualEnhancement:has(img), .main-nowPlayingView-canvasVisualEnhancement :has(img)):not(.main-image-image.cover-art-image)",
      ':is([data-testid="track-visual-enhancement"] ~ *, [data-testid="track-visual-enhancement"] ~ * *):has(video, img)',
      '[data-testid="track-visual-enhancement"] *:has(video)',
    ].join(", "),
  },
];

export function SyncNPVVisuals(npv: HTMLElement | null): void {
  currentNPV = npv;
  if (!npv) { syncArtwork(); return; }
  for (const { className, selector } of VISUAL_MARKERS) {
    const targets = new Set(npv.querySelectorAll<HTMLElement>(selector));
    for (const marked of npv.querySelectorAll<HTMLElement>(`.${className}`)) {
      if (!targets.has(marked)) marked.classList.remove(className);
    }
    for (const target of targets) {
      if (!target.classList.contains(className)) target.classList.add(className);
    }
  }
  syncArtwork();
}

let currentNPV: HTMLElement | null = null;
let coverSubstitution = false;
const covers = new Map<HTMLElement, HTMLImageElement>();
const pausedVideos = new Set<HTMLVideoElement>();
export const IsNPVCoverSubstitutionActive = () => coverSubstitution;

function syncArtwork(): void {
  const wanted = IsCanvasStageVisible() && currentNPV?.isConnected;
  const url = wanted ? SpotifyPlayer.GetCover("xlarge") : null;
  const surfaces = url ? [...currentNPV!.querySelectorAll<HTMLElement>(
    "[data-canvas-surface], .canvasVideoContainerNPV, .main-nowPlayingView-canvasVisualEnhancement"
  )].filter(surface => surface.querySelector("video") && !surface.parentElement?.closest("[data-canvas-surface], .canvasVideoContainerNPV, .main-nowPlayingView-canvasVisualEnhancement")) : [];
  const current = new Set(surfaces);
  const duplicateVideos = new Set<HTMLVideoElement>();
  coverSubstitution = false;
  for (const [surface, image] of covers) {
    if (current.has(surface)) continue;
    surface.classList.remove("lyssna-npv-show-cover");
    image.remove();
    covers.delete(surface);
  }
  for (const surface of surfaces) {
    let image = covers.get(surface);
    if (!image) {
      image = surface.ownerDocument.createElement("img");
      image.className = "lyssna-npv-cover-art";
      image.alt = "Album artwork";
      image.decoding = "async";
      image.addEventListener("load", syncArtwork);
      covers.set(surface, image);
      surface.append(image);
    }
    if (image.getAttribute("src") !== url) image.src = url!;
    const ready = image.complete && image.naturalWidth > 0;
    surface.classList.toggle("lyssna-npv-show-cover", ready);
    if (!ready) continue;
    coverSubstitution = true;
    surface.querySelectorAll<HTMLVideoElement>("video").forEach(video => duplicateVideos.add(video));
  }
  for (const video of pausedVideos) {
    if (duplicateVideos.has(video)) continue;
    if (video.isConnected && document.hidden && SpotifyPlayer.IsPlaying) continue;
    if (video.isConnected && video.paused && SpotifyPlayer.IsPlaying) void video.play().catch(() => undefined);
    pausedVideos.delete(video);
  }
  for (const video of duplicateVideos) {
    if (video.paused) continue;
    video.pause();
    pausedVideos.add(video);
  }
}

for (const event of ["page:open", "page:destroy", "canvas-stage:change", "playback:songchange"]) {
  Global.Event.listen(event, () => queueMicrotask(syncArtwork));
}
document.addEventListener("visibilitychange", syncArtwork);
