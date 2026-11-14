import { useEffect, useRef, useState } from "react";
import Session from "../../Global/Session.ts";
import { BuildBugReport, CopyText, DISCORD_BUGS_URL } from "../../../utils/BugReport.ts";
import { openExternal } from "../../../brand.ts";
import { TEST_BUILD_VERSION } from "../../../utils/version/Channels.ts";

const PREVIEW_REFRESH_MS = 2000;
type CopyState = "idle" | "done" | "failed";

function useCopy(getReport: () => string, after?: () => void) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (from: Element) => {
    const ok = await CopyText(getReport(), from).catch(() => false);
    setState(ok ? "done" : "failed");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2200);
    if (ok) after?.();
  };
  return [state, copy] as const;
}

const copyLabel = (state: CopyState, idle: string) => state === "done" ? "Copied" : state === "failed" ? "Couldn't copy" : idle;

export function BugReportPane({ onBack }: { onBack: () => void }) {
  const [latestVersion, setLatestVersion] = useState<string>();
  const [showPreview, setShowPreview] = useState(false);
  const [report, setReport] = useState(() => BuildBugReport());
  useEffect(() => {
    let live = true;
    void Session.SpicyLyrics.GetLatestVersion().then(version => { if (live) setLatestVersion(version?.Text); }).catch(() => {});
    return () => { live = false; };
  }, []);
  useEffect(() => {
    setReport(BuildBugReport({ latestVersion }));
    if (!showPreview) return;
    const interval = setInterval(() => setReport(BuildBugReport({ latestVersion })), PREVIEW_REFRESH_MS);
    return () => clearInterval(interval);
  }, [latestVersion, showPreview]);
  const getReport = () => {
    const snapshot = BuildBugReport({ latestVersion });
    setReport(snapshot);
    return snapshot;
  };
  const [copyState, copy] = useCopy(getReport);
  const [discordState, copyAndOpen] = useCopy(getReport, () => openExternal(DISCORD_BUGS_URL));
  const current = Session.SpicyLyrics.GetCurrentVersion()?.Text;
  const outdated = current !== TEST_BUILD_VERSION && !!latestVersion && !!current && Session.SpicyLyrics.IsBehind(Session.SpicyLyrics.GetCurrentVersion(), Session.SpicyLyrics.ParseVersion(latestVersion));
  const preview = report.split("\n").filter(line => line !== "```" && !line.startsWith("**")).slice(0, -1).join("\n");

  return <section className="sl-sp-bug" aria-label="Report a Lyssna Lyrics bug">
    <button type="button" className="sl-sp-btn sl-sp-bug-back" onClick={onBack}>Back to settings</button>
    <h3>Report a Lyssna Lyrics bug</h3>
    <p>Copy your diagnostics and share them in the Lyssna Discord. Include what went wrong, how to reproduce it, and a screenshot or clip when useful.</p>
    {outdated && <div className="sl-sp-banner" role="status"><span>Lyssna Lyrics {latestVersion} is available. Check whether updating resolves the issue.</span><button type="button" className="sl-sp-btn" onClick={() => Session.Navigate({ pathname: "/SpicyLyrics/Update" })}>Update</button></div>}
    <div className="sl-sp-bug-actions">
      <button type="button" className="sl-sp-btn sl-sp-bug-primary" onClick={event => copyAndOpen(event.currentTarget)}><span aria-live="polite">{copyLabel(discordState, "Copy & open Discord")}</span></button>
      <button type="button" className="sl-sp-btn" onClick={event => copy(event.currentTarget)}><span aria-live="polite">{copyLabel(copyState, "Copy diagnostics")}</span></button>
    </div>
    <p className="sl-sp-bug-fineprint">Includes plugin settings, track and lyric-source details, versions, and rendering performance. Account details and credentials are excluded.</p>
    <details className="sl-sp-bug-details" onToggle={event => setShowPreview(event.currentTarget.open)}>
      <summary>Review diagnostics</summary>
      <pre className="sl-sp-bug-preview">{preview}</pre>
    </details>
  </section>;
}
