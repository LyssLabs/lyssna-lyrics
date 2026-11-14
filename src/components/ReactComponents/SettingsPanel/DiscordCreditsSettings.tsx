import { useEffect, useId, useState } from "react";
import { useStore } from "@nanostores/react";
import { $discordCreditUsernames, $discordLookupEndpoint } from "../../../utils/stores.ts";
import { DEFAULT_DISCORD_LOOKUP_ENDPOINT, discordLookupUrl } from "../../../utils/discordLookup.ts";
import { matches, Row, SettingsSection, Toggle } from "./components.tsx";

export default function DiscordCreditsSettings({ query, sectionFilter, showHidden = false }: { query: string; sectionFilter: string; showHidden?: boolean }) {
  const enabled = useStore($discordCreditUsernames);
  const endpoint = useStore($discordLookupEndpoint);
  const [draft, setDraft] = useState(endpoint);
  const [error, setError] = useState("");
  const errorId = useId();
  useEffect(() => { setDraft(endpoint); }, [endpoint]);
  if (showHidden) return null;
  const namesHit = ["All", "Lyrics Display"].includes(sectionFilter) && matches(query, "Discord usernames in credits", "Use Discord usernames instead of display names. Arashii keeps his credited name. Public, unofficial lookup service; no token required.");
  const endpointHit = ["All", "Advanced"].includes(sectionFilter) && matches(query, "Discord lookup endpoint", "Configure the unofficial Discord ID lookup service.");
  const save = () => {
    const value = draft.trim() || DEFAULT_DISCORD_LOOKUP_ENDPOINT;
    if (!discordLookupUrl(value, "622852916092469278")) {
      setError("Enter an HTTPS base URL without credentials, a query, or a fragment.");
      return;
    }
    setError("");
    setDraft(value);
    $discordLookupEndpoint.set(value);
  };
  return <>
    {namesHit && <SettingsSection title="Contributor credits"><Row label="Discord usernames in credits" description="Use Discord usernames instead of display names. Matching display names keep their capitalization. Arashii keeps his credited name. Uses a public, unofficial lookup service; no token required."><Toggle checked={enabled} onChange={value => $discordCreditUsernames.set(value)} /></Row></SettingsSection>}
    {endpointHit && <SettingsSection title="Contributor lookup"><Row label="Discord lookup endpoint" description="HTTPS base URL, before the Discord ID. Leave blank to restore the default service." stacked><div className="ll-discord-endpoint"><input aria-label="Discord lookup endpoint" type="url" value={draft} spellCheck={false} aria-invalid={!!error} aria-describedby={error ? errorId : undefined} onChange={event => setDraft(event.currentTarget.value)} onBlur={save} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } }} />{error && <span id={errorId} role="alert">{error}</span>}</div></Row></SettingsSection>}
  </>;
}
