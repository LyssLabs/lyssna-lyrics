import { useStore } from "@nanostores/react";
import React from "react";
import { $allowHidingSettings, $developerMode, $dontSyncSpicySettings, $rememberSettingsMenuLocation } from "../../../utils/stores.ts";
import { OpenBuildChannelManager } from "../../../utils/openBuildChannelPanel.tsx";
import { BuildChannelSettingControl } from "../BuildChannelPanel.tsx";
import { matches, Row, SettingsSection, Toggle } from "./components.tsx";

const SECTION_NAME = "Advanced";

export default function DeveloperSection({ query, sectionFilter, onOpenHiddenSettings = () => {}, onManageBuildChannels = OpenBuildChannelManager, showHidden = false }: { query: string; sectionFilter: string; onOpenHiddenSettings?: () => void; onManageBuildChannels?: () => void; showHidden?: boolean }) {
  const developerMode = useStore($developerMode);
  const dontSyncSpicySettings = useStore($dontSyncSpicySettings);
  const allowHidingSettings = useStore($allowHidingSettings);
  const rememberSettingsMenuLocation = useStore($rememberSettingsMenuLocation);
  if (sectionFilter !== "All" && sectionFilter !== SECTION_NAME) return null;
  const developerModeHit = matches(query, "Developer Mode", "Enable extra logging and debug utilities.");
  const syncHit = matches(query, "Don't sync settings to Spicy Lyrics counterparts", "Keep Lyssna preferences independent. Turn off to share compatible settings again.");
  const buildChannelHit = matches(query, "Build Channel", "Select a branch or manage saved branches.");
  const hidingHit = matches(query, "Show Hide Settings Tab", "Show the Hide Settings action and eye buttons beside settings.");
  const manageHiddenHit = matches(query, "Manage Hidden Settings", "Restore settings hidden from the main panel.");
  const rememberLocationHit = matches(query, "Remember Menu Location After Close", "Reopen Settings at the tab or submenu you last used.");
  if (showHidden || (!developerModeHit && !syncHit && !buildChannelHit && !hidingHit && !manageHiddenHit && !rememberLocationHit)) return null;
  return <SettingsSection title="Advanced">
    {syncHit && <Row label="Don't sync settings to Spicy Lyrics counterparts" description="Keep Lyssna preferences independent. Turn off to share compatible settings again."><Toggle checked={dontSyncSpicySettings} onChange={(value) => $dontSyncSpicySettings.set(value)} /></Row>}
    {!showHidden && buildChannelHit && <Row label="Build Channel" description="Select a branch or manage saved branches."><BuildChannelSettingControl onManage={onManageBuildChannels} /></Row>}
    {!showHidden && hidingHit && <Row label="Show Hide Settings Tab" description="Show the Hide Settings action and eye buttons beside settings."><Toggle checked={allowHidingSettings} onChange={(value) => $allowHidingSettings.set(value)} /></Row>}
    {!showHidden && manageHiddenHit && <Row label="Manage Hidden Settings" description="Restore settings hidden from the main panel."><button className="ll-sp-btn" type="button" onClick={onOpenHiddenSettings}>Manage</button></Row>}
    {!showHidden && rememberLocationHit && <Row label="Remember Menu Location After Close" description="Reopen Settings at the tab or submenu you last used."><Toggle checked={rememberSettingsMenuLocation} onChange={(value) => $rememberSettingsMenuLocation.set(value)} /></Row>}
    {developerModeHit && <Row label="Developer Mode" description="Enable extra logging and debug utilities."><Toggle checked={developerMode} onChange={(value) => $developerMode.set(value)} /></Row>}
  </SettingsSection>;
}
