import { PinFooterDetailWithoutWriters } from "./CreateLyricsFooter.ts";

export function ApplyIsByCommunity(data: any, lyricsContainer: HTMLElement): void {
  if (!lyricsContainer || (data.source !== "spl" && data.source !== "spicy_lyrics")) return;
  const attribution = data.UploadAttribution ?? data.TTMLUploadMetadata;
  if (!attribution) return;
  const doc = lyricsContainer.ownerDocument;
  const credits = doc.createElement("div");
  credits.className = "SongInfo CommunityCredits";
  lyricsContainer.classList.add("FromCommunity");
  const note = doc.createElement("span");
  note.className = "SongInfoNote";
  note.textContent = "Community lyrics provided by Spicy Lyrics";
  credits.append(note);
  const lead = doc.createElement("span");
  lead.className = "SongInfoLead";
  lead.textContent = "Spicy Lyrics community";
  credits.append(lead);

  for (const [role, label] of [["Maker", "Made by"], ["Uploader", "Uploaded by"]] as const) {
    const person = attribution[role];
    const name = person?.username ?? person?.displayName;
    if (typeof name !== "string" || !name.trim()) continue;
    const section = doc.createElement("span");
    section.className = role;
    const link = doc.createElement("a");
    link.className = "song-info-profile-section";
    const url = person.url ?? (person.id ? `https://spicylyrics.org/uid/${encodeURIComponent(person.id)}` : null);
    if (typeof url === "string" && /^https:\/\//i.test(url)) {
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.addEventListener("click", event => {
        event.preventDefault();
        window.open(url, "_blank", "noopener,noreferrer");
      });
    }
    const roleLabel = doc.createElement("span");
    roleLabel.className = "SongInfoRole";
    roleLabel.textContent = label;
    const nameLabel = doc.createElement("span");
    nameLabel.className = "SongInfoName";
    const username = doc.createElement("span");
    username.textContent = name;
    nameLabel.append("@", username);
    link.append(roleLabel, " ", nameLabel);
    section.append(link);
    credits.append(section);
  }
  lyricsContainer.append(credits);
  PinFooterDetailWithoutWriters(credits, lyricsContainer);
}
