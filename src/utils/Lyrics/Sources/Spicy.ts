import { getDeveloperLyrics } from "../../API/DeveloperAPI.ts";
import { resolveLyricsSourceLabel } from "../LyricsSourcePreferences.ts";
import { tryGetSongWriters } from "./Shared.ts";
import type { ExternalLyricsResult } from "./Types.ts";

const SOURCE_IDS: Record<string, string> = { spicy_lyrics: "spl", apple_music: "aml", spotify: "spt" };

export async function fetchLyssnaLyricsRaw(trackId: string): Promise<ExternalLyricsResult | null> {
  try {
    const result = await getDeveloperLyrics(trackId);
    if (result.status === 503) return { lyrics: null, status: 503 };
    if (result.status !== 200 || !result.lyrics) return null;
    if (!Array.isArray(result.lyrics.Type === "Static" ? result.lyrics.Lines : result.lyrics.Content)) return null;
    const source = SOURCE_IDS[result.lyrics.source] ?? result.lyrics.source;
    return {
      lyrics: {
        ...result.lyrics,
        source,
        fetchProvider: "spicy",
        sourceDisplayName: resolveLyricsSourceLabel(source, result.lyrics.sourceDisplayName, "spicy"),
      },
      status: 200,
    };
  } catch (error) {
    console.warn("Lyssna Lyrics developer provider unavailable:", error);
    return null;
  }
}

export async function fetchSpicyLyrics(rawPromise: Promise<ExternalLyricsResult | null>): Promise<ExternalLyricsResult | null> {
  const raw = await rawPromise;
  if (!raw || raw.status === 503) return raw;
  return raw.lyrics?.source === "spl" ? raw : null;
}

export async function fetchAppleMusicLyrics(rawPromise: Promise<ExternalLyricsResult | null>): Promise<ExternalLyricsResult | null> {
  const raw = await rawPromise;
  if (!raw || raw.status === 503) return raw;
  return raw.lyrics?.source === "aml" ? raw : null;
}

export async function fetchSpicySongWriters(rawPromise: Promise<ExternalLyricsResult | null>): Promise<string[] | null> {
  return tryGetSongWriters((await rawPromise)?.lyrics);
}
