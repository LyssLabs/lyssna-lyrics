import { useState } from "react";
import { useStore } from "@nanostores/react";
import { toast } from "sonner";
import { $enhancements, getCachedPlaylistFolders, setSetting, standaloneSpotifyPlusFiles, type EnhancementKey, type PlaylistFolderEntry } from "../../../enhancements/config";
import { refreshPlaylistFolderCache } from "../../../enhancements/playlistFolders";
import { matches, Row, SettingsSection, Toggle } from "./components.tsx";

type ToggleDefinition = { key: EnhancementKey; label: string; description?: string };
const groups: { title: string; settings: ToggleDefinition[] }[] = [
  { title: "Profile menu", settings: [
    { key: "hideYourUpdatesSection", label: 'Hide “Your Updates”' },
    { key: "hideHomeConfigMenuItem", label: "Hide Home Config" },
    { key: "hideAccountMenuItem", label: "Hide Account" },
    { key: "hideProfileMenuItem", label: "Hide Profile" },
    { key: "hideRecentsMenuItem", label: "Hide Recents" },
    { key: "hideSupportMenuItem", label: "Hide Support" },
    { key: "hidePrivateSessionMenuItem", label: "Hide Private Session" },
    { key: "hideLogOutMenuItem", label: "Hide Log Out" },
  ] },
  { title: "Spotify interface", settings: [
    { key: "hideFriendActivityButton", label: "Hide Friend Activity button" },
    { key: "hideLyricsButton", label: "Hide Spotify lyrics button", description: "Keeps the Lyssna Lyrics button available." },
    { key: "hideMiniplayerButton", label: "Hide Miniplayer button" },
    { key: "disablePeek", label: "Disable Peek", description: "Use a regular Now Playing panel instead of Spotify’s floating preview." },
    { key: "restoreOldDevicePicker", label: "Classic device picker", description: "Show devices in a compact popover instead of the sidebar." },
    { key: "restoreOldShareMenu", label: "Classic share menu", description: "Restore direct copy-link and embed actions." },
  ] },
  { title: "Playlists", settings: [
    { key: "overridePlaylistFolderBehavior", label: "Choose playlist folders", description: "Replace Add to playlist folders with the folders you choose below." },
    { key: "showPlaylistMenuCoverArt", label: "Playlist cover art", description: "Show covers in the Add to playlist menu." },
  ] },
];

export default function EnhancementsSection({ query, sectionFilter }: { query: string; sectionFilter: string }) {
  const settings = useStore($enhancements);
  const [folders, setFolders] = useState<PlaylistFolderEntry[]>(getCachedPlaylistFolders);
  const [scanning, setScanning] = useState(false);
  if (!["All", "Enhancements"].includes(sectionFilter)) return null;
  const scan = async () => {
    if (scanning) return;
    setScanning(true);
    try {
      const found = await refreshPlaylistFolderCache();
      setFolders(found);
      if (!found.length) toast("No playlist folders found.");
    } catch { toast.error("Could not load playlist folders. Try again."); }
    finally { setScanning(false); }
  };
  const showFolders = matches(query, "Playlist folders", "Scan library folders Add to playlist");
  const standalone = standaloneSpotifyPlusFiles();
  return <>
    {!!standalone.length && matches(query, "Standalone Spotify+", "Uninstall integrated enhancements") && <SettingsSection title="Standalone Spotify+">
      <Row label="Remove standalone Spotify+" description="Run this command in a terminal. Your imported enhancement settings stay in Lyssna Lyrics.">
        <button className="ll-sp-btn" type="button" onClick={() => {
          const command = `spicetify config extensions ${standalone.map(file => `${file}-`).join(" ")}\nspicetify apply`;
          void (async () => {
            try {
              if (Spicetify.Platform.ClipboardAPI?.copy) await Spicetify.Platform.ClipboardAPI.copy(command);
              else await navigator.clipboard.writeText(command);
              toast.success("Uninstall command copied.");
            } catch { toast.error("Could not copy the command."); }
          })();
        }}>Copy uninstall command</button>
      </Row>
    </SettingsSection>}
    {groups.map(group => {
      const visible = group.settings.filter(setting => matches(query, setting.label, setting.description ?? ""));
      const playlistGroup = group.title === "Playlists";
      if (!visible.length && !(playlistGroup && showFolders)) return null;
      return <SettingsSection key={group.title} title={group.title}>
        {visible.map(setting => <Row key={setting.key} label={setting.label} description={setting.description}>
          <Toggle checked={settings[setting.key] === true} onChange={value => setSetting(setting.key, value)} />
        </Row>)}
        {playlistGroup && showFolders && <>
          <Row label="Playlist folders" description="Scan your library for folders to use in Add to playlist.">
            <button className="ll-sp-btn" type="button" disabled={scanning} onClick={() => void scan()}>{scanning ? "Scanning…" : "Refresh folders"}</button>
          </Row>
          {settings.overridePlaylistFolderBehavior && (folders.length
            ? folders.slice().sort((a, b) => a.path.localeCompare(b.path)).map(folder => <Row key={folder.id} label={folder.path || folder.label}>
              <Toggle checked={settings.playlistOverrideFolderIds.includes(folder.id)} onChange={enabled => {
                const selected = new Set(settings.playlistOverrideFolderIds);
                if (enabled) selected.add(folder.id); else selected.delete(folder.id);
                setSetting("playlistOverrideFolderIds", [...selected]);
              }} />
            </Row>)
            : <Row label="No folders cached" description="Refresh folders to choose which ones appear in Add to playlist."><span /></Row>)}
        </>}
      </SettingsSection>;
    })}
  </>;
}
