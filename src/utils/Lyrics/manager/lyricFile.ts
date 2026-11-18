import parseTTMLToLyrics from "../ParseTTML.ts";
import { buildLineLyrics } from "../Sources/Shared.ts";
import type { TimedLine } from "../Sources/Types.ts";

export type LyricFileKind = "ttml" | "lrc";

export function lyricFileKind(text: string): LyricFileKind {
  return text.trimStart().startsWith("<") ? "ttml" : "lrc";
}

function lrcTimestamp(tag: string): number | null {
  const value = tag.trim();
  let seconds: number;
  if (/^\d+(?::\d+){1,2}(?:\.\d+)?$/.test(value)) {
    seconds = value.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  } else if (/^\d+(?:\.\d+)?m?s$/.test(value)) {
    seconds = parseFloat(value) / (value.endsWith("ms") ? 1000 : 1);
  } else {
    return null;
  }
  return seconds <= 604800 ? Math.round(seconds * 1000) : null;
}

function parseLrc(text: string, durationMs: number) {
  const declaredOffset = Number(/^\s*\[offset:([+-]?\d+)\]\s*$/m.exec(text)?.[1]);
  const offset = Number.isSafeInteger(declaredOffset) ? declaredOffset : 0;
  const lines: TimedLine[] = [];
  for (const row of text.split(/\r?\n/)) {
    let lyric = row.trim();
    const times: number[] = [];
    for (let tag = /^\[([^\]]*)\]/.exec(lyric); tag; tag = /^\[([^\]]*)\]/.exec(lyric)) {
      const time = lrcTimestamp(tag[1]);
      if (time !== null) times.push(Math.max(0, time + offset));
      lyric = lyric.slice(tag[0].length);
    }
    if (!lyric.trim()) continue;
    for (const startTimeMs of times) lines.push({ text: lyric.trim(), startTimeMs });
  }
  lines.sort((a, b) => a.startTimeMs - b.startTimeMs);
  let nextStart: number | undefined;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const following = lines[i + 1];
    if (following && following.startTimeMs > line.startTimeMs) nextStart = following.startTimeMs;
    line.endTimeMs = nextStart ?? (durationMs > line.startTimeMs ? durationMs : line.startTimeMs + 5000);
  }
  const lyrics = buildLineLyrics(lines, durationMs, "ldb", "Local LRC");
  if (!lyrics) throw new Error("No timestamped lyrics found in this LRC file");
  return lyrics;
}

export function parseLyricFile(text: string, kind: LyricFileKind, durationMs = 0) {
  return kind === "lrc" ? parseLrc(text, durationMs) : parseTTMLToLyrics(text);
}
