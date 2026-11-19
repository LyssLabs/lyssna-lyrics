// Keep this filename available for existing download links.
const integration = globalThis.__LYSSNA_LYRICS_INTEGRATION__ ??= { protocol: 1, phase: "loading", hasEnhancements: false };
window.dispatchEvent(new Event("lyssna-lyrics:integration-state"));
import("https://cdn.jsdelivr.net/gh/LyssnaHQ/lyssna-lyrics-legacy@47750c07ed2b376fb176adfc7191d6aea7089166/builds/main/entrypoint.mjs").catch(error => {
  if (integration.phase === "loading") {
    integration.phase = "standalone";
    window.dispatchEvent(new Event("lyssna-lyrics:integration-state"));
  }
  console.error("[Lyssna Lyrics] Could not load the launcher:", error);
});
