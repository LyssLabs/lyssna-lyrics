import { useEffect, useState, type ReactNode } from "react";
import { attachBulkLyrics, loadBulkLyrics, searchBulkTracks, type BulkLyric, type BulkTrack } from "../utils/bulkLyrics.ts";
import "./BulkLoadTTMLModal.css";

// Lucide glyphs match Lyssna App's Bulk Load dialog. See src/assets/LUCIDE_LICENSE.txt.
const glyphs = {
  check: <path d="m20 6-11 11-5-5" />,
  back: <path d="m15 18-6-6 6-6" />,
  music: <><circle cx="8" cy="18" r="4" /><path d="M12 18V2l7 4" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></>,
  skip: <><path d="M21 4v16M4 4l12 8-12 8z" /></>,
  warning: <><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4m0 4h.01" /></>,
  files: <><path d="M15 2H6a2 2 0 0 0-2 2v12"/><path d="M16 6H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V10z"/><path d="M16 6v4h4"/></>,
};

export function BulkIcon({ name, size }: { name: keyof typeof glyphs; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {glyphs[name]}
    </svg>
  );
}

function artists(song: BulkTrack) {
  return song.artists.map(artist => artist.name).join(", ");
}

function Art({ song, size }: { song: BulkTrack | null; size: number }) {
  const url = song?.album?.images?.at(-1)?.url;
  return url ? <img src={url} alt="" loading="lazy" /> : (
    <span className="load-ttml-art"><BulkIcon name="music" size={size} /></span>
  );
}

function songList(songs: BulkTrack[]) {
  const [first, ...rest] = songs;
  return `${first.name} · ${artists(first)}${rest.length ? ` and ${rest.length} more` : ""}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function MatchStep({ file, result, saved, onPick, nav }: {
  file: File;
  result: BulkLyric;
  saved: BulkTrack[];
  onPick: (songs: BulkTrack[]) => Promise<void>;
  nav: (save: ReactNode, saving: boolean) => ReactNode;
}) {
  const [query, setQuery] = useState(result.query);
  const [chosen, setChosen] = useState(saved);
  const [found, setFound] = useState<BulkTrack[] | null>(null);
  const [searching, setSearching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(result.error);
  const busy = searching || saving;

  useEffect(() => {
    let active = true;
    const initialSearch = result.query.trim() ? searchBulkTracks(result.query) : Promise.resolve([]);
    void initialSearch.then(
      tracks => { if (active) setFound(tracks); },
      failure => { if (active) { setFound([]); setError(errorMessage(failure)); } },
    ).finally(() => { if (active) setSearching(false); });
    return () => { active = false; };
  }, [result.query]);

  async function find() {
    if (busy || !query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setFound(await searchBulkTracks(query.trim()));
    } catch (failure) {
      setFound([]);
      setError(errorMessage(failure));
    } finally {
      setSearching(false);
    }
  }

  async function save() {
    if (busy || !chosen.length) return;
    setSaving(true);
    setError(null);
    try {
      await onPick(chosen);
    } catch (failure) {
      setError(errorMessage(failure));
      setSaving(false);
    }
  }

  return (
    <>
      <form className="bulk-ttml-find" onSubmit={event => { event.preventDefault(); void find(); }}>
        <label className="load-ttml-search">
          <BulkIcon name="search" size={15} />
          <input type="search" aria-label={`Song for ${file.name}`} placeholder="Song and artist…"
            value={query} autoFocus onChange={event => setQuery(event.currentTarget.value)} />
        </label>
        <button type="submit" disabled={busy || !query.trim()}>Search</button>
      </form>
      {error && <p className="bulk-ttml-error" role="alert"><BulkIcon name="warning" size={13} />{error}</p>}
      {searching ? (
        <p className="bulk-ttml-none" role="status">Searching…</p>
      ) : found?.length ? (
        <ul className="bulk-ttml-results" aria-label="Songs found">
          {found.map(candidate => {
            const ticked = chosen.some(song => song.uri === candidate.uri);
            const album = candidate.album?.name;
            return (
              <li key={candidate.uri}>
                <button type="button" disabled={busy} role="checkbox" aria-checked={ticked}
                  aria-label={`Use ${candidate.name} by ${artists(candidate)}${album ? ` from ${album}` : ""}`}
                  onClick={() => setChosen(all => ticked ? all.filter(song => song.uri !== candidate.uri) : [...all, candidate])}>
                  <span className="bulk-ttml-tick" aria-hidden="true">{ticked && <BulkIcon name="check" size={13} />}</span>
                  <Art song={candidate} size={14} />
                  <span className="load-ttml-song">
                    <strong>{candidate.name}</strong>
                    <small>{artists(candidate)}{album ? ` · ${album}` : ""}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="bulk-ttml-none">No songs found. Try other words, or skip this file.</p>
      )}
      {nav(chosen.length > 0 && (
        <button type="button" className="bulk-ttml-save" disabled={busy} onClick={() => void save()}>
          Save for {chosen.length} {chosen.length === 1 ? "song" : "songs"}
        </button>
      ), saving)}
    </>
  );
}

function BulkTtml({ files, results, onDone }: { files: File[]; results: BulkLyric[]; onDone: () => void }) {
  const [songs, setSongs] = useState(() => results.map(result => result.song ? [result.song] : []));
  const [step, setStep] = useState(0);
  const pending = results.flatMap((result, index) => result.song ? [] : [index]);
  const saved = songs.filter(list => list.length).length;
  const current = pending[step];

  if (current === undefined) {
    return (
      <>
        <p className="bulk-ttml-summary" role="status">{saved} of {results.length} saved</p>
        <ul className="bulk-ttml-list" aria-label="Lyric files">
          {results.map((result, index) => {
            const list = songs[index];
            return (
              <li key={index} className="bulk-ttml-file" data-state={list.length ? "saved" : "skipped"}>
                <div className="bulk-ttml-head">
                  <Art song={list[0] ?? null} size={18} />
                  <span className="load-ttml-song">
                    <strong title={result.filename}>{result.filename}</strong>
                    <small>{list.length
                      ? <><BulkIcon name="check" size={12} /> Saved for {songList(list)}</>
                      : (result.error ?? "Skipped")}</small>
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <button type="button" className="bulk-ttml-done" onClick={onDone}>Done</button>
      </>
    );
  }

  const file = files[current];
  const result = results[current];
  const matchedSongs = songs[current];
  return (
    <div className="bulk-ttml-step">
      <p className="bulk-ttml-summary" role="status">
        Song {step + 1} of {pending.length} to match{saved ? ` · ${saved} saved` : ""}
      </p>
      <div className="bulk-ttml-progress" role="progressbar" aria-label="Files matched"
        aria-valuemin={0} aria-valuemax={pending.length} aria-valuenow={step}>
        <i style={{ width: `${(step / pending.length) * 100}%` }} />
      </div>
      <div className="bulk-ttml-file" data-state="open">
        <div className="bulk-ttml-head">
          <Art song={matchedSongs[0] ?? null} size={18} />
          <span className="load-ttml-song">
            <strong title={file.name}>{file.name}</strong>
            <small>{matchedSongs.length ? `Saved for ${songList(matchedSongs)}` : "Tick its song, or each release of it"}</small>
          </span>
        </div>
        <MatchStep key={current} file={file} result={result} saved={matchedSongs}
          onPick={async picked => {
            await attachBulkLyrics(file, picked);
            setSongs(all => all.map((value, index) => index === current
              ? [...new Map([...value, ...picked].map(song => [song.uri, song])).values()]
              : value));
            setStep(at => at + 1);
          }}
          nav={(save, saving) => (
            <div className="bulk-ttml-nav">
              <button type="button" disabled={saving || step === 0} onClick={() => setStep(at => at - 1)}>
                <BulkIcon name="back" size={15} /> Previous
              </button>
              <span>
                <button type="button" disabled={saving} onClick={() => setStep(at => at + 1)}>
                  {matchedSongs.length ? "Next" : "Skip"} <BulkIcon name="skip" size={14} />
                </button>
                {save}
              </span>
            </div>
          )} />
      </div>
    </div>
  );
}

export function BulkLoadTTMLModal({ files, onBack, onDone }: { files: File[]; onBack: () => void; onDone: () => void }) {
  const [results, setResults] = useState<BulkLyric[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void loadBulkLyrics(files, controller.signal).then(
      items => { if (!controller.signal.aborted) setResults(items); },
      failure => { if (!controller.signal.aborted) setError(errorMessage(failure)); },
    );
    return () => controller.abort();
  }, [files]);

  return (
    <div className="ll-ldb-bulk">
      <div className="load-ttml-tools">
        <button type="button" className="load-ttml-back" aria-label="Back to Load TTML" onClick={onBack}>
          <BulkIcon name="back" size={16} /> Back
        </button>
      </div>
      {error ? <p className="bulk-ttml-error" role="alert"><BulkIcon name="warning" size={13} />{error}</p>
        : results ? <BulkTtml files={files} results={results} onDone={onDone} />
        : <p className="bulk-ttml-none" role="status">Matching {files.length} lyric {files.length === 1 ? "file" : "files"}…</p>}
    </div>
  );
}
