import { createProviderResult } from "./Shared.ts";
import type { ExternalLyricsResult } from "./Types.ts";

type LocalLyricsReader = { get(uri: string): Promise<unknown> };
type OfficialPluginWindow = Window & {
  SpicyLyrics?: { db?: { objectStores?: { lyricsStore?: { manager?: LocalLyricsReader } } } };
};

function getLocalReader(): LocalLyricsReader | undefined {
  const reader = (window as OfficialPluginWindow).SpicyLyrics?.db?.objectStores?.lyricsStore?.manager;
  return typeof reader?.get === "function" ? reader : undefined;
}

export function canReadOfficialPluginLyrics(): boolean {
  return getLocalReader() !== undefined;
}

export async function readOfficialPluginLyrics(uri: string): Promise<ExternalLyricsResult | null> {
  const reader = getLocalReader();
  if (!reader) return null;
  try {
    const result = await reader.get(uri);
    if (!result || typeof result !== "object") return null;
    const lyrics = result as Record<string, unknown>;
    const entries = lyrics.Type === "Static" ? lyrics.Lines
      : lyrics.Type === "Line" || lyrics.Type === "Syllable" ? lyrics.Content : null;
    if (!Array.isArray(entries) || !entries.length) return null;
    return createProviderResult({ ...lyrics, sourceDisplayName: "Spicy Lyrics (local TTML)" }, "spicy");
  } catch {
    return null;
  }
}
