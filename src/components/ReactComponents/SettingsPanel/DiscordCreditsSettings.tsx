import { useStore } from "@nanostores/react";
import { $discordCreditUsernames } from "../../../utils/stores.ts";
import { matches, Row, SettingsSection, Toggle } from "./components.tsx";

export default function DiscordCreditsSettings({ query, sectionFilter, showHidden = false }: { query: string; sectionFilter: string; showHidden?: boolean }) {
  const enabled = useStore($discordCreditUsernames);
  if (showHidden || !["All", "Lyrics Display"].includes(sectionFilter) || !matches(query, "Discord usernames in credits", "Display names, capitalization, contributor credits, Arashii")) return null;
  return <SettingsSection title="Contributor credits"><Row label="Discord usernames in credits" description="Use Discord usernames instead of display names. Matching display names keep their capitalization. Arashii keeps his credited name. Uses a public, unofficial lookup service; no token required."><Toggle checked={enabled} onChange={value => $discordCreditUsernames.set(value)} /></Row></SettingsSection>;
}
