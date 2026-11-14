import { readFileSync } from "node:fs";

// Public by design; Lyssna ships this same client key. Never bundle a secret key.
export const ClientKey = readFileSync(new URL("../config/spicy-lyrics-client-key.txt", import.meta.url), "utf8").trim();
if (!/^sl_pk_[A-Za-z0-9_-]+$/.test(ClientKey)) throw new Error("Only a publishable sl_pk_ client key may be bundled");
const microphone = readFileSync(new URL("../src/assets/lyssna-microphone.svg", import.meta.url), "utf8");
export const LyssnaLogo = "data:image/svg+xml;base64," + Buffer.from(microphone).toString("base64");
export const LyssnaMicrophonePaths = [...microphone.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
if (LyssnaMicrophonePaths.length !== 2) throw new Error("Lyssna microphone paths are missing");
