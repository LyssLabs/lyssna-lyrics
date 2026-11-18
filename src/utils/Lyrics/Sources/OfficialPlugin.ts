import { createProviderResult } from "./Shared.ts";
import type { ExternalLyricsResult } from "./Types.ts";

type LocalLyricsReader = { get(uri: string): Promise<unknown> };
type OfficialPluginWindow = Window & {
  SpicyLyrics?: { db?: { objectStores?: { lyricsStore?: { manager?: LocalLyricsReader } } } };
  __LYSSNA_SPICY_BACKGROUND__?: {
    ready: Promise<OfficialPluginWindow | null>;
    frameWindow?: OfficialPluginWindow | null;
  };
};

const CACHE_NAME = "SpicyLyrics_LyricsStore_g1";
const CACHE_VERSION = 6;
const READ_TIMEOUT_MS = 3500;
const CACHE_RETRY_MS = 200;

function getLocalReader(pluginWindow: OfficialPluginWindow | null | undefined): LocalLyricsReader | undefined {
  const reader = pluginWindow?.SpicyLyrics?.db?.objectStores?.lyricsStore?.manager;
  return typeof reader?.get === "function" ? reader : undefined;
}

export function canReadOfficialPluginLyrics(): boolean {
  const pluginWindow = window as OfficialPluginWindow;
  const background = pluginWindow.__LYSSNA_SPICY_BACKGROUND__;
  return Boolean((background && background.frameWindow !== null) || getLocalReader(pluginWindow));
}

function toProviderResult(data: unknown, uri: string, local = false): ExternalLyricsResult | null {
  if (!data || typeof data !== "object") return null;
  const lyrics = data as Record<string, unknown>;
  if (lyrics.uri && lyrics.uri !== uri) return null;
  const entries = lyrics.Type === "Static" ? lyrics.Lines
    : lyrics.Type === "Line" || lyrics.Type === "Syllable" ? lyrics.Content : null;
  if (!Array.isArray(entries) || !entries.length) return null;
  return createProviderResult({
    ...lyrics,
    sourceDisplayName: local ? "Spicy Lyrics (local TTML)"
      : typeof lyrics.sourceDisplayName === "string" ? lyrics.sourceDisplayName : undefined,
  }, "spicy");
}

async function readCachedLyrics(uri: string, trackId: string): Promise<ExternalLyricsResult | null> {
  const url = new URL(`/${trackId}`, location.origin);
  const response = await window.caches?.match(url.href, { cacheName: CACHE_NAME });
  if (!response) return null;
  const entry = await response.json();
  if (entry?.CacheVersion !== CACHE_VERSION || !(entry.ExpiresAt > Date.now())) return null;
  return toProviderResult(entry.Content, uri);
}

export async function readOfficialPluginLyrics(uri: string): Promise<ExternalLyricsResult | null> {
  const pluginWindow = window as OfficialPluginWindow;
  const background = pluginWindow.__LYSSNA_SPICY_BACKGROUND__;
  const trackId = /^spotify:track:([a-zA-Z0-9]+)$/.exec(uri)?.[1];
  const deadline = performance.now() + READ_TIMEOUT_MS;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const cached = background && trackId ? await readCachedLyrics(uri, trackId) : null;
    const frame = background && background.frameWindow === undefined && !cached
      ? await Promise.race([
        background.ready,
        new Promise<null>(resolve => { timer = setTimeout(() => resolve(null), READ_TIMEOUT_MS); }),
      ])
      : background?.frameWindow;
    const reader = getLocalReader(frame) ?? getLocalReader(pluginWindow);
    const local = reader ? toProviderResult(await reader.get(uri), uri, true) : null;
    if (local || cached) return local ?? cached;
    if (!trackId || !frame) return null;

    // The official plugin writes its processed lyrics and credits before rendering them.
    while (Spicetify.Player.data?.item?.uri === uri) {
      const result = await readCachedLyrics(uri, trackId);
      if (result) return result;
      const remaining = deadline - performance.now();
      if (remaining <= 0) break;
      await new Promise(resolve => setTimeout(resolve, Math.min(CACHE_RETRY_MS, remaining)));
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
