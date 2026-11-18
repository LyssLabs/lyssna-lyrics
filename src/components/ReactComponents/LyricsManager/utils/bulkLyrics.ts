import { SpotifyPlayer } from "../../../Global/SpotifyPlayer.ts";
import { dbPromise, ObjectStores } from "../../../../utils/db.ts";
import fetchLyrics, { getSongKey, SessionTTMLStore } from "../../../../utils/Lyrics/fetchLyrics.ts";
import { ApplyLyricsIfCurrent } from "../../../../utils/Lyrics/Global/Applyer.ts";
import { parseLyricFile } from "../../../../utils/Lyrics/manager/lyricFile.ts";
import { $currentLyricsData } from "../../../../utils/stores.ts";
import { $lastFetchedUri } from "../../../../utils/uiState.ts";

export type BulkTrack = {
  uri: string;
  name: string;
  artists: { name: string }[];
  album?: { name?: string; images?: { url: string }[] };
  duration_ms: number;
};

export type BulkLyric = {
  filename: string;
  song: BulkTrack | null;
  query: string;
  error: string | null;
};

const AMLL = "http://www.example.com/ns/amll";
const FILE_SIZE_LIMIT = 2_000_000;
const SPOTIFY_ID = /^[a-zA-Z0-9]{22}$/;
const TRACK_URI = /^spotify:track:([a-zA-Z0-9]{22})$/;

function spotifyId(value: string): string | undefined {
  const id = value.trim().split(":").at(-1) ?? "";
  return SPOTIFY_ID.test(id) ? id : undefined;
}

function readTtmlDocument(text: string): Document | null {
  if (!text.trimStart().startsWith("<")) return null;
  const xml = new DOMParser().parseFromString(text.replace(/&nbsp;/g, "&#160;"), "application/xml");
  return xml.querySelector("parsererror") ? null : xml;
}

function songHint(filename: string, contents: string) {
  const stem = filename.replace(/\.[^.]+$/, "");
  const xml = readTtmlDocument(contents);
  let id: string | undefined;
  let isrc: string | undefined;
  let title: string | undefined;
  const artists: string[] = [];
  for (const meta of Array.from(xml?.getElementsByTagNameNS("*", "meta") ?? [])) {
    const value = meta.getAttribute("value")?.trim();
    if (!value) continue;
    switch (meta.getAttribute("key")) {
      case "spotifyId": id ??= spotifyId(value); break;
      case "isrc": isrc ??= value.toUpperCase(); break;
      case "musicName": title ??= value; break;
      case "artists": artists.push(value); break;
    }
  }
  const filenameId = stem.split(/[^a-zA-Z0-9]+/).find(token =>
    SPOTIFY_ID.test(token) && /[a-z]/i.test(token) && /\d/.test(token)
  );
  const words = title
    ? [title, ...artists].join(" ")
    : (filenameId ? stem.replace(filenameId, " ") : stem).replace(/ - |[_.]/g, " ");
  return { id: id ?? filenameId, isrc, query: words.trim().replace(/\s+/g, " ") };
}

function withSpotifyId(contents: string, id: string): string {
  const xml = readTtmlDocument(contents);
  const root = xml?.documentElement;
  if (!xml || root?.localName !== "tt") return contents;
  const metas = Array.from(root.getElementsByTagNameNS("*", "meta"));
  if (metas.some(meta => meta.getAttribute("key") === "spotifyId" && spotifyId(meta.getAttribute("value") ?? ""))) {
    return contents;
  }
  let head = Array.from(root.children).find(child => child.localName === "head");
  if (!head) {
    head = xml.createElementNS(root.namespaceURI, "head");
    root.prepend(head);
  }
  let metadata = Array.from(head.children).find(child => child.localName === "metadata");
  if (!metadata) {
    metadata = xml.createElementNS(root.namespaceURI, "metadata");
    head.prepend(metadata);
  }
  const meta = xml.createElementNS(AMLL, "amll:meta");
  meta.setAttribute("key", "spotifyId");
  meta.setAttribute("value", id);
  metadata.append(meta);
  return new XMLSerializer().serializeToString(xml);
}

function isSpotifyTrack(item: unknown): item is BulkTrack {
  if (!item || typeof item !== "object") return false;
  const track = item as Partial<BulkTrack>;
  return typeof track.uri === "string" && TRACK_URI.test(track.uri) && typeof track.name === "string" && Array.isArray(track.artists);
}

export async function searchBulkTracks(query: string, limit = 6): Promise<BulkTrack[]> {
  const params = new URLSearchParams({ q: query, type: "track", limit: String(limit) });
  const response = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/search?${params}`);
  if (!Array.isArray(response?.tracks?.items)) throw new Error("Spotify search returned no track results");
  const tracks: BulkTrack[] = response.tracks.items.filter(isSpotifyTrack);
  return Array.from(new Map(tracks.map(track => [track.uri, track])).values());
}

async function lookUpTrack({ id, isrc }: ReturnType<typeof songHint>): Promise<BulkTrack | null> {
  if (id) {
    const track = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/tracks/${id}`);
    return isSpotifyTrack(track) ? track : null;
  }
  if (isrc && /^[A-Z0-9]+$/.test(isrc)) {
    return (await searchBulkTracks(`isrc:${isrc}`, 1))[0] ?? null;
  }
  return null;
}

async function saveForTracks(file: File, contents: string, songs: BulkTrack[], signal?: AbortSignal) {
  if (!/\.(ttml|xml|lrc)$/i.test(file.name)) throw new Error("Choose an .lrc, .ttml, or .xml lyric file");
  const kind = /\.lrc$/i.test(file.name) ? "lrc" : "ttml";
  parseLyricFile(contents, kind, songs[0]?.duration_ms);
  const entries = songs.map(song => {
    const id = TRACK_URI.exec(song.uri)?.[1];
    if (!id) throw new Error("Choose a Spotify song");
    return { uri: song.uri, text: kind === "ttml" ? withSpotifyId(contents, id) : contents };
  });
  const db = await dbPromise;
  signal?.throwIfAborted();
  const write = db.transaction(ObjectStores.LyricsStore, "readwrite");
  await Promise.all([...entries.map(entry => write.store.put(entry.text, entry.uri)), write.done]);

  for (const { uri } of entries) SessionTTMLStore.delete(getSongKey(uri));
  const currentUri = SpotifyPlayer.GetUri();
  if (currentUri && entries.some(entry => entry.uri === currentUri)) {
    $lastFetchedUri.set(null);
    $currentLyricsData.set("");
    void fetchLyrics(currentUri, { reloadLocalLyrics: true })
      .then(lyrics => ApplyLyricsIfCurrent(currentUri, lyrics))
      .catch(error => console.error("Could not refresh imported lyrics", error));
  }
}

export async function attachBulkLyrics(file: File, songs: BulkTrack[]): Promise<void> {
  if (file.size > FILE_SIZE_LIMIT) throw new Error("Lyric file exceeds 2 MB");
  await saveForTracks(file, await file.text(), songs);
}

export async function loadBulkLyrics(files: File[], signal: AbortSignal): Promise<BulkLyric[]> {
  if (files.length > 500) throw new Error("Load up to 500 lyric files at once");
  const results: BulkLyric[] = [];
  const lookedUp = new Map<string, BulkTrack | null>();
  for (const file of files) {
    signal.throwIfAborted();
    const result: BulkLyric = { filename: file.name, song: null, query: songHint(file.name, "").query, error: null };
    results.push(result);
    try {
      if (file.size > FILE_SIZE_LIMIT) throw new Error("Lyric file exceeds 2 MB");
      const contents = await file.text();
      const hint = songHint(file.name, contents);
      result.query = hint.query;
      const lookup = hint.id ?? hint.isrc;
      if (lookup && !lookedUp.has(lookup)) {
        lookedUp.set(lookup, await lookUpTrack(hint).catch(() => null));
      }
      const song = lookup ? lookedUp.get(lookup) : null;
      signal.throwIfAborted();
      if (song) {
        await saveForTracks(file, contents, [song], signal);
        result.song = song;
      } else if (hint.id || hint.isrc) {
        result.error = "Spotify didn't find the song this file names";
      }
    } catch (error) {
      signal.throwIfAborted();
      result.error = error instanceof Error ? error.message : String(error);
    }
  }
  return results;
}
