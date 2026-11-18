import parseTTMLToLyrics from "../ParseTTML.ts";
import { createProviderResult } from "./Shared.ts";
import type { ExternalLyricsResult, TrackLyricsInfo } from "./Types.ts";

const CLIENT_ID = "Lyssna Lyrics (https://github.com/iPixelGalaxy/lyssna-lyrics; github@ipixelgalaxy.com)";
const ISRC = /^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/;
const normalize = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export async function fetchLrcRedLyrics(track: TrackLyricsInfo): Promise<ExternalLyricsResult | null> {
  const signal = AbortSignal.timeout(8000);
  const request = (path: string) => fetch(`https://lrc.red${path}`, {
    headers: { "X-Client-ID": CLIENT_ID }, credentials: "omit", signal,
  });
  try {
    let isrc = typeof track.isrc === "string" ? track.isrc.toUpperCase() : "";
    if (!ISRC.test(isrc)) {
      const response = await request(`/search.json?${new URLSearchParams({ q: `${track.title} ${track.artist}` })}`);
      if (!response.ok) return null;
      const payload = await response.json();
      const primaryArtist = normalize(track.artist.split(",")[0]);
      const hit = (Array.isArray(payload?.hits) ? payload.hits : []).find((item: any) =>
        typeof item?.isrc === "string" && ISRC.test(item.isrc) &&
        typeof item.title === "string" && normalize(item.title) === normalize(track.title) &&
        typeof item.artist === "string" && normalize(item.artist) === primaryArtist &&
        typeof item.duration === "number" && Number.isFinite(item.duration) &&
        Math.abs(item.duration - track.durationMs / 1000) <= 3
      );
      if (!hit) return null;
      isrc = hit.isrc;
    }
    const response = await request(`/s/${isrc}.ttml`);
    if (!response.ok) return null;
    const ttml = await response.text();
    if (ttml.length > 2_000_000) return null;
    return createProviderResult({
      ...parseTTMLToLyrics(ttml),
      source: "lrcred",
      sourceDisplayName: "lrc.red",
    }, "lrcred");
  } catch {
    return null;
  }
}
