import { DISCORD_URL, WEBSITE_URL, STANDALONE_DOWNLOAD_URL, openExternal } from "../../../brand.ts";
import { useStore } from "@nanostores/react";
import React, { useEffect, useState } from "react";
import Session from "../../Global/Session.ts";
import { $lyssnaLyricsVersion } from "../../../utils/stores.ts";

const LINKS = [
  { label: "Lyssna", url: WEBSITE_URL },
  { label: "Discord", url: DISCORD_URL, brand: "88, 101, 242" },
  { label: "Standalone", url: STANDALONE_DOWNLOAD_URL },
];

type UpdateStatus = "checking" | "latest" | "outdated" | "unknown";
function ExternalArrow() {
  return <svg className="ll-sp-footer-arrow" width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2.5 7.5L7.5 2.5M7.5 2.5H3.5M7.5 2.5V6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function Footer({ onReportBug, reportBugActive = false }: { onReportBug?: () => void; reportBugActive?: boolean }) {
  const version = useStore($lyssnaLyricsVersion);
  const [status, setStatus] = useState<UpdateStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const latest = await Session.SpicyLyrics.GetLatestVersion();
        const current = Session.SpicyLyrics.GetCurrentVersion();
        if (!cancelled) setStatus(latest && current ? (Session.SpicyLyrics.CompareVersions(latest, current) > 0 ? "outdated" : "latest") : "unknown");
      } catch {
        if (!cancelled) setStatus("unknown");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return <footer className="ll-settings-footer-block"><section className="ll-standalone-promo" aria-label="Lyssna Standalone">
    <p>Want a break from the lag? Download Lyssna Standalone today!</p>
    <a className="ll-sp-btn" href={STANDALONE_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" onClick={event => { event.preventDefault(); openExternal(STANDALONE_DOWNLOAD_URL); }}>Download Lyssna Standalone</a>
  </section><div className="ll-sp-footer">
    <div className="ll-sp-footer-links">
      {LINKS.map(({ label, url, brand }) => <button key={label} type="button" className={`ll-sp-footer-link${brand ? " ll-sp-footer-link--brand" : ""}`} style={brand ? ({ "--brand": brand } as React.CSSProperties) : undefined} onClick={() => openExternal(url)}><span>{label}</span><ExternalArrow /></button>)}
      {onReportBug && <button type="button" className="ll-sp-footer-link" aria-pressed={reportBugActive} onClick={onReportBug}>Report a bug</button>}
    </div>
    <div className="ll-sp-footer-meta">
      <span className="ll-sp-footer-build">Build: <span className="ll-sp-footer-build-value">Lyssna Lyrics</span></span>
      <div className="ll-sp-footer-brand"><span className="ll-sp-footer-wordmark">Lyssna Lyrics</span><div className="ll-sp-footer-status-row">
        {(status === "latest" || status === "outdated") && <><span className={`ll-sp-footer-status ll-sp-footer-status--${status}`}>{status === "latest" ? "Latest" : "Outdated"}</span>{status === "outdated" && <button type="button" className="ll-sp-footer-update" onClick={() => Session.Navigate({ pathname: "/LyssnaLyrics/Update" })}>Update</button>}<span className="ll-sp-footer-sep">·</span></>}
        <span className="ll-sp-footer-version">v{version}</span>
      </div></div>
    </div>
  </div></footer>;
}
