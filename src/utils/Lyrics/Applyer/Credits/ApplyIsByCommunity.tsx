import { PinFooterDetailWithoutWriters } from "./CreateLyricsFooter.ts";
import { CREDIT_NAME_OVERRIDES, DISCORD_ID, lookupDiscordUser, safeAvatarUrl } from "../../../discordLookup.ts";
import { $discordCreditUsernames, $discordLookupEndpoint } from "../../../stores.ts";

function watchContributorRows(credits: HTMLElement): void {
  const maker = credits.querySelector<HTMLElement>(".Maker");
  const uploader = credits.querySelector<HTMLElement>(".Uploader");
  if (!maker || !uploader) return;
  const view = credits.ownerDocument.defaultView ?? window;
  const observer = new view.ResizeObserver(() => {
    if (!credits.isConnected) { observer.disconnect(); return; }
    const first = maker.getBoundingClientRect();
    const second = uploader.getBoundingClientRect();
    const inline = first.width > 0 && second.width > 0 &&
      Math.abs(first.top + first.height / 2 - second.top - second.height / 2) < 1;
    // The separator is positioned in the flex gap, so hiding it cannot change the wrap decision.
    credits.toggleAttribute("data-contributors-inline", inline);
  });
  for (const element of [credits, maker, uploader]) observer.observe(element);
}

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
    if (!person || typeof person !== "object") continue;
    const id = typeof person.id === "string" && DISCORD_ID.test(person.id) ? person.id : undefined;
    const existing = [person.displayName, person.display_name, person.global_name, person.globalName, person.username].find(value => typeof value === "string" && value.trim());
    const override = id ? CREDIT_NAME_OVERRIDES[id] : undefined;
    const name = override ?? existing?.trim() ?? id;
    if (!name) continue;
    const section = doc.createElement("span");
    section.className = role;
    const link = doc.createElement("a");
    link.className = "song-info-profile-section";
    const url = person.url ?? (id ? `https://spicylyrics.org/uid/${encodeURIComponent(id)}` : null);
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
    let avatar: HTMLImageElement | undefined;
    const showAvatar = (source?: string) => {
      if (!source) return;
      if (!avatar) {
        avatar = doc.createElement("img");
        avatar.alt = "";
        avatar.width = avatar.height = 18;
        avatar.decoding = "async";
        avatar.referrerPolicy = "no-referrer";
        avatar.onerror = () => { avatar?.remove(); avatar = undefined; };
        link.insertBefore(avatar, nameLabel);
      }
      avatar.src = source;
    };
    showAvatar(safeAvatarUrl(person.avatar_url, id) ?? safeAvatarUrl(person.avatar, id));
    if (id && (($discordCreditUsernames.get() && !override) || !avatar)) {
      void lookupDiscordUser(id, $discordLookupEndpoint.get()).then(identity => {
        if (!identity) return;
        if ($discordCreditUsernames.get()) {
          const matchedName = existing?.trim();
          username.textContent = override ?? (matchedName?.toLowerCase() === identity.username.toLowerCase() ? matchedName : identity.username);
        }
        if (!avatar) showAvatar(identity.avatarUrl);
      });
    }
    section.append(link);
    credits.append(section);
  }
  lyricsContainer.append(credits);
  PinFooterDetailWithoutWriters(credits, lyricsContainer);
  watchContributorRows(credits);
}
