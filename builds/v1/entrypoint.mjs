// Keep existing Lyssna installations on the same fork and branch as this entrypoint.
const entrypoint = new URL("https://ipixelgalaxy.com/lyssna-plugin/entrypoint.mjs");
entrypoint.searchParams.set("v", String(Date.now()));
import(entrypoint.href);
