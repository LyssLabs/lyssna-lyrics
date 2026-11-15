import { useStore } from "@nanostores/react";
import { $discordCreditUsernames } from "../../../utils/stores.ts";
import { matches, Row, SettingsSection, Toggle } from "./components.tsx";

export default function DiscordCreditsSettings({ query, sectionFilter, showHidden = false }: { query: string; sectionFilter: string; showHidden?: boolean }) {
  const enabled = useStore($discordCreditUsernames);
  if (showHidden || !["All", "Lyrics Display"].includes(sectionFilter) || !matches(query, "Discord usernames in credits", "Display names, contributor credits")) return null;
  return <SettingsSection title="Contributor credits"><Row label="Discord usernames in credits" description="Show usernames instead of display names."><Toggle checked={enabled} onChange={value => $discordCreditUsernames.set(value)} /></Row></SettingsSection>;
}
