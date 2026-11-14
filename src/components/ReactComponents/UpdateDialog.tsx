import { DISCORD_URL, openExternal } from "../../brand.ts";
import React, { useEffect, useState } from "react";
import { coerce } from "semver";
import { compareLyssnaVersions } from "../../utils/version/VersionOrder.ts";
import { NoticeLink, showNotice } from "./NoticeDialog.tsx";

const PATCH_NOTES_URL = "https://raw.githubusercontent.com/iPixelGalaxy/lyssna-lyrics/dev/.change-notes/PATCH_NOTES.md";
const PATCH_NOTES_PAGE_URL = "https://github.com/iPixelGalaxy/lyssna-lyrics/blob/dev/.change-notes/PATCH_NOTES.md";
const FEATURE_GUIDE_URL = "https://github.com/iPixelGalaxy/lyssna-lyrics/blob/dev/.change-notes/FEATURE_CHANGES.md";
const FETCH_TIMEOUT_MS = 10_000;

type PatchNote = { text: string; version: string; };

function normalizeVersion(value: string) { return coerce(value.trim()); }

function getPatchNotes(markdown: string, fromVersion: string, installedVersion: string): PatchNote[] {
  const installed = normalizeVersion(installedVersion);
  const from = normalizeVersion(fromVersion);
  if (!installed || (from && compareLyssnaVersions(installed.version, from.version) <= 0)) return [];

  const notes: PatchNote[] = [];
  let version: string | null = null;
  let currentNote: string[] | null = null;
  const finishNote = () => {
    if (!version || !currentNote) return;
    const noteVersion = normalizeVersion(version);
    if (noteVersion && compareLyssnaVersions(noteVersion.version, installed.version) <= 0 && (!from || compareLyssnaVersions(noteVersion.version, from.version) > 0)) notes.push({ version, text: currentNote.join(" ").trim() });
    currentNote = null;
  };

  for (const line of markdown.replace(/\r/g, "").split("\n")) {
    const versionMatch = line.match(/^##\s+v?(\d+\.\d+\.\d+)\s*$/i);
    if (versionMatch) { finishNote(); version = versionMatch[1]; continue; }
    const noteMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (noteMatch) { finishNote(); currentNote = [noteMatch[1].trim()]; continue; }
    if (currentNote && line.trim() && !line.startsWith("#")) currentNote.push(line.trim());
  }
  finishNote();
  return notes.sort((a, b) => compareLyssnaVersions(b.version, a.version));
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) tokens.push(text.slice(cursor, match.index));
    const key = `${match.index}-${match[0]}`;
    if (match[1] && match[2]) tokens.push(<a className="ll-notice-link" key={key} href={match[2]} target="_blank" rel="noreferrer">{match[1]}</a>);
    else if (match[3]) tokens.push(<strong key={key}>{match[3]}</strong>);
    else if (match[4]) tokens.push(<code key={key}>{match[4]}</code>);
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) tokens.push(text.slice(cursor));
  return tokens;
}

function needsWalkthrough(fromVersion: string): boolean { return !normalizeVersion(fromVersion); }
function isDowngrade(fromVersion: string, installedVersion: string): boolean {
  const from = normalizeVersion(fromVersion);
  const installed = normalizeVersion(installedVersion);
  return Boolean(from && installed && compareLyssnaVersions(installed.version, from.version) < 0);
}

function PatchNotes({ fromVersion, toVersion, style }: { fromVersion: string; toVersion: string; style?: React.CSSProperties }) {
  const [notes, setNotes] = useState<PatchNote[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let closed = false;
    const timeout = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    setState("loading");
    fetch(PATCH_NOTES_URL, { signal: controller.signal, cache: "no-store" })
      .then((response) => { if (!response.ok) throw new Error(`Patch notes request failed: ${response.status}`); return response.text(); })
      .then((markdown) => {
        if (closed) return;
        setNotes(getPatchNotes(markdown, fromVersion, toVersion));
        setState("ready");
      })
      .catch(() => { if (!closed) setState("error"); })
      .finally(() => window.clearTimeout(timeout));
    return () => { closed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [fromVersion, retry, toVersion]);

  return <section className="ll-notice-patch-notes" aria-label="Patch notes" aria-live="polite" style={style}>
    <h3>What changed</h3>
    {state === "loading" && <p>Loading patch notes…</p>}
    {state === "error" && <p>Couldn&apos;t load patch notes. <button className="ll-notice-retry" type="button" onClick={() => setRetry((value) => value + 1)}>Retry</button></p>}
    {state === "ready" && notes.length === 0 && <p>No patch notes are available for this update.</p>}
    {state === "ready" && notes.length > 0 && <ul>{notes.map((note, index) => <li key={`${note.version}-${index}`}>{renderInlineMarkdown(note.text)}</li>)}</ul>}
  </section>;
}

export const releaseNotesUrl = (_version: string) => PATCH_NOTES_PAGE_URL;

export function showUpdatedDialog(fromVersion: string, toVersion: string, switchedFromSpicy = false) {
  const downgraded = isDowngrade(fromVersion, toVersion);
  const content: React.ReactElement<{ style?: React.CSSProperties }>[] = [
    <p className="ll-notice-text">You were on <span className="ll-notice-version">{fromVersion}</span>. You are now on <span className="ll-notice-version">{toVersion}</span>.</p>,
  ];
  if (switchedFromSpicy) content.push(<p className="ll-notice-text">You switched from Spicy Lyrics. This update compares only your Lyssna Lyrics versions.</p>);
  if (!downgraded) {
    content.push(<PatchNotes fromVersion={fromVersion} toVersion={toVersion} />);
  }
  content.push(<p className="ll-notice-text ll-notice-text--quiet">Our Discord invite has changed. Join the <NoticeLink href={DISCORD_URL}>new Lyssna Discord server</NoticeLink> for fork updates and support.</p>);

  showNotice({
    title: downgraded ? `Changed to ${toVersion}` : `Updated to ${toVersion}`,
    content,
    wide: true,
    primary: { label: "See all patch notes", onClick: () => window.open(PATCH_NOTES_PAGE_URL, "_blank", "noopener,noreferrer") },
    extraActions: [
      { label: "Join our new Discord", className: "ll-discord-shine", onClick: () => openExternal(DISCORD_URL) },
      ...(needsWalkthrough(fromVersion) ? [{ label: "New to Lyssna Lyrics?", onClick: () => openExternal(FEATURE_GUIDE_URL) }] : []),
    ],
    secondaryLabel: "Close",
  });
}
