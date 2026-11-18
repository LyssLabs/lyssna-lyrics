import { readFileSync } from "node:fs";

const microphone = readFileSync(new URL("../src/assets/lyssna-microphone.svg", import.meta.url), "utf8");
export const LyssnaLogo = "data:image/svg+xml;base64," + Buffer.from(microphone).toString("base64");
export const LyssnaMicrophonePaths = [...microphone.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
if (LyssnaMicrophonePaths.length !== 2) throw new Error("Lyssna microphone paths are missing");
