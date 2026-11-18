import { CreditsRow } from "./CreditsRow.ts";
import { PinFooterDetailWithoutWriters } from "./CreateLyricsFooter.ts";

export const ProviderMap = {
    "spt": "Spotify",
    "aml": "Apple Music",
    "spl": "Spicy Lyrics Community",
    "ldb": "Local DB",
    "uns": "Unison",
    "spicy": "Spicy Lyrics",
    "lrcred": "lrc.red",
    "spotify": "Spotify",
    "apple": "Apple Music",
    "musixmatch": "Musixmatch",
    "lrclib": "LRCLIB",
    "netease": "Netease",
}

export function ApplyLyricsProvider(data: any, LyricsContainer: HTMLElement): void {
  if ((!data?.source && !data?.fetchProvider && !data?.sourceDisplayName) || !LyricsContainer) return;

  const ProviderElement = document.createElement("div");
  ProviderElement.classList.add("LyricsProvider");
  let providerLabel = "";
  if (
    typeof data.sourceDisplayName === "string"
  ) {
    providerLabel = data.sourceDisplayName;
  } else if (
    typeof data.source === "string" &&
    Object.prototype.hasOwnProperty.call(ProviderMap, data.source)
  ) {
    providerLabel = ProviderMap[data.source];
  } else if (
    typeof data.fetchProvider === "string" &&
    Object.prototype.hasOwnProperty.call(ProviderMap, data.fetchProvider)
  ) {
    providerLabel = ProviderMap[data.fetchProvider];
  } else {
    providerLabel = "Unknown";
  }
  const timingNote = data.experimentalWordSync
    ? data.experimentalWordSyncSource === "Static"
      ? "(+ estimated line and word timing)"
      : "(+ estimated word timing)"
    : providerLabel === "Apple Music" && data.experimentalAppleWordSplitting ? "(+ extra splits)" : "";
  const isLrcRed = data.fetchProvider === "lrcred" || data.source_via === "lrc-red";
  const displayLabel = isLrcRed ? ProviderMap.lrcred
    : data.fetchProvider === "spicy" && data.source !== "ldb" ? ProviderMap.spl
    : providerLabel;
  const valueElement = CreditsRow(ProviderElement, "Provided by", displayLabel);
  if (isLrcRed) {
    const link = LyricsContainer.ownerDocument.createElement("a");
    link.className = "LyricsProviderViaLink";
    link.href = "https://lrc.red/?utm_source=lyssna-lyrics";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = displayLabel;
    // Open through the main window so popouts use the external browser too.
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.open(link.href, "_blank", "noopener,noreferrer");
    });
    valueElement.replaceChildren(link);
  }
  if (timingNote) {
    const note = LyricsContainer.ownerDocument.createElement("span");
    note.className = "LyricsCreditNote";
    note.textContent = timingNote;
    ProviderElement.append(" ", note);
  }
  LyricsContainer.appendChild(ProviderElement);
  PinFooterDetailWithoutWriters(ProviderElement, LyricsContainer);
}
