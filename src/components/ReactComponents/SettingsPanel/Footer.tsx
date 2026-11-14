import { DISCORD_URL, WEBSITE_URL, STANDALONE_DOWNLOAD_URL, openExternal } from "../../../brand.ts";
import { useStore } from "@nanostores/react";
import React, { useEffect, useState } from "react";
import Session from "../../Global/Session.ts";
import { $spicyLyricsVersion } from "../../../utils/stores.ts";

const LINKS = [
  { label: "Lyssna", url: WEBSITE_URL },
  { label: "Discord", url: DISCORD_URL, brand: "88, 101, 242" },
  { label: "Standalone", url: STANDALONE_DOWNLOAD_URL },
];

type UpdateStatus = "checking" | "latest" | "outdated" | "unknown";
type Version = { Major: number; Minor: number; Patch: number };

function isNewer(a: Version, b: Version): boolean {
  return a.Major !== b.Major ? a.Major > b.Major : a.Minor !== b.Minor ? a.Minor > b.Minor : a.Patch > b.Patch;
}

function ExternalArrow() {
  return <svg className="sl-sp-footer-arrow" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Footer({ onReportBug, reportBugActive = false }: { onReportBug?: () => void; reportBugActive?: boolean }) {
  const version = useStore($spicyLyricsVersion);
  const [status, setStatus] = useState<UpdateStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const latest = await Session.SpicyLyrics.GetLatestVersion();
        const current = Session.SpicyLyrics.GetCurrentVersion();
        if (!cancelled) setStatus(latest && current ? (isNewer(latest, current) ? "outdated" : "latest") : "unknown");
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <><section className="sl-standalone-promo" aria-label="Lyssna Standalone">
    <p>Want a break from the lag? Download Lyssna Standalone today!</p>
    <a className="sl-sp-btn" href={STANDALONE_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" onClick={event => { event.preventDefault(); openExternal(STANDALONE_DOWNLOAD_URL); }}>Download Lyssna Standalone</a>
  </section><div className="sl-sp-footer">
    <div className="sl-sp-footer-links">
      {LINKS.map(({ label, url, brand }) => <button key={label} type="button" className={`sl-sp-footer-link${brand ? " sl-sp-footer-link--brand" : ""}`} style={brand ? ({ "--brand": brand } as React.CSSProperties) : undefined} onClick={() => openExternal(url)}><span>{label}</span><ExternalArrow /></button>)}
      {onReportBug && <button type="button" className="sl-sp-footer-link" aria-pressed={reportBugActive} onClick={onReportBug}>Report a bug</button>}
    </div>
    <div className="sl-sp-footer-meta">
      <span className="sl-sp-footer-build">Build: <span className="sl-sp-footer-build-value">Lyssna Lyrics</span></span>
      <div className="sl-sp-footer-brand"><span className="sl-sp-footer-wordmark">Lyssna Lyrics</span><div className="sl-sp-footer-status-row">
        {(status === "latest" || status === "outdated") && <><span className={`sl-sp-footer-status sl-sp-footer-status--${status}`}>{status === "latest" ? "Latest" : "Outdated"}</span>{status === "outdated" && <button type="button" className="sl-sp-footer-update" onClick={() => Session.Navigate({ pathname: "/SpicyLyrics/Update" })}>Update</button>}<span className="sl-sp-footer-sep">·</span></>}
        <span className="sl-sp-footer-version">v{version}</span>
      </div></div>
    </div>
  </div></>;
}
