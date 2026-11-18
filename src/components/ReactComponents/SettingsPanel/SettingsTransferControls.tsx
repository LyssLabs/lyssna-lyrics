import React, { useEffect, useRef, useState } from "react";
import { downloadTransfer, parseTransfer, TRANSFER_LIMIT, type SettingsTransfer } from "../../../utils/transferFormat.ts";
import { exportPluginSettings, hasPluginBackup, importPluginSettings, preparePluginImport, previousPluginBackup } from "../../../utils/settingsTransfer.ts";

export default function SettingsTransferControls() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<ReturnType<typeof preparePluginImport>>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [hasBackup, setHasBackup] = useState(false);
  useEffect(() => { void hasPluginBackup().then(setHasBackup).catch(() => {}); }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError(""); setMessage("");
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  const exportFile = async (file: SettingsTransfer | undefined, backup = false) => {
    if (!file) throw new Error("No previous import backup is available.");
    downloadTransfer(file, backup ? "lyssna-before-import" : "lyssna-settings");
    setMessage("Settings and saved lyrics exported.");
  };
  return <div className="ll-settings-transfer" aria-busy={busy}>
    <div className="ll-sp-btn-group" style={{ flexWrap: "wrap" }}>
      <button className="ll-sp-btn" type="button" disabled={busy} onClick={() => void run(async () => exportFile(await exportPluginSettings()))}>Export settings</button>
      <button className="ll-sp-btn" type="button" disabled={busy} onClick={() => input.current?.click()}>Import settings</button>
      {hasBackup && <button className="ll-sp-btn" type="button" disabled={busy} onClick={() => void run(async () => exportFile(await previousPluginBackup(), true))}>Download previous backup</button>}
    </div>
    <p>Transfer files can contain saved provider tokens. Keep them private.</p>
    <input ref={input} type="file" accept=".json,.lyssna.json,application/json" hidden onChange={event => {
      const file = event.currentTarget.files?.[0]; event.currentTarget.value = "";
      setPending(undefined);
      if (file) void run(async () => {
        if (file.size > TRANSFER_LIMIT) throw new Error("Settings files must be under 100 MB.");
        setPending(preparePluginImport(parseTransfer(await file.text())));
      });
    }} />
    {pending && <div>
      <p>Import {Object.keys(pending.settings).length} settings and {pending.lyrics.length} lyric files from {pending.file.source === "plugin" ? "Lyssna Lyrics" : "Lyssna Standalone"}? Matching songs are replaced. A backup is saved first.</p>
      {pending.preserved > 0 && <p>{pending.preserved} unsupported entries will be kept for future exports.</p>}
      <div className="ll-sp-btn-group">
        <button className="ll-sp-btn" type="button" disabled={busy} onClick={() => void run(async () => {
          try { setMessage(await importPluginSettings(pending)); setPending(undefined); }
          finally { setHasBackup(await hasPluginBackup()); }
        })}>Apply import</button>
        <button className="ll-sp-btn" type="button" disabled={busy} onClick={() => setPending(undefined)}>Cancel</button>
      </div>
    </div>}
    {busy && <p role="status">Working…</p>}
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
