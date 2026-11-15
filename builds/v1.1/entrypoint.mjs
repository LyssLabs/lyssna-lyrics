const integration = globalThis.__LYSSNA_LYRICS_INTEGRATION__ ??= { protocol: 1, phase: "loading", hasEnhancements: false };
window.dispatchEvent(new Event("lyssna-lyrics:integration-state"));
import(`https://ipixelgalaxy.com/lyssna-plugin/entrypoint.mjs?v=${Date.now()}`).catch(error => {
  if (integration.phase === "loading") {
    integration.phase = "standalone";
    window.dispatchEvent(new Event("lyssna-lyrics:integration-state"));
  }
  console.error("[Lyssna Lyrics] Could not load the launcher:", error);
});
