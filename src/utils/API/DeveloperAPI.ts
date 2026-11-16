import { Acquire, IsTripStatus, ParseRetryAfter, SettleFailure, SettleSuccess } from "./CircuitBreaker.ts";
import { getRemoteConfig } from "../remoteConfig.ts";

declare const __LYSSNA_LYRICS_CLIENT_KEY__: string;

const BRIDGE_URL = "https://ipixelgalaxy.com/lyssna-plugin/lyssna-lyrics-bridge.html?v=2";
const BRIDGE_ORIGIN = new URL(BRIDGE_URL).origin;
const CHANNEL = "lyssna-lyrics-api-v1";
type BridgeResponse = { status: number; body: any; retryAfter?: string };
const pending = new Map<string, Promise<{ status: number; lyrics: any }>>();
const replies = new Map<string, (response: BridgeResponse) => void>();
let frame: HTMLIFrameElement | null = null;
let ready: Promise<HTMLIFrameElement> | null = null;
let markReady: (() => void) | null = null;

window.addEventListener("message", event => {
  if (event.origin !== BRIDGE_ORIGIN || !frame || event.source !== frame.contentWindow || event.data?.channel !== CHANNEL) return;
  if (event.data.type === "ready") markReady?.();
  if (event.data.type === "response" && Number.isInteger(event.data.status)) replies.get(event.data.id)?.(event.data);
});

function ensureBridge(): Promise<HTMLIFrameElement> {
  if (ready) return ready;
  ready = new Promise<HTMLIFrameElement>((resolve, reject) => {
    const element = document.createElement("iframe");
    frame = element;
    element.hidden = true;
    element.title = "Lyssna Lyrics API bridge";
    element.setAttribute("sandbox", "allow-scripts allow-same-origin");
    element.referrerPolicy = "no-referrer";
    const fail = () => {
      clearTimeout(timer);
      element.remove();
      if (frame === element) { frame = null; ready = null; markReady = null; }
      reject(new Error("Lyssna Lyrics website bridge unavailable"));
    };
    const timer = setTimeout(fail, 5000);
    markReady = () => {
      clearTimeout(timer);
      markReady = null;
      resolve(element);
    };
    element.addEventListener("load", () => {
      element.contentWindow?.postMessage({ channel: CHANNEL, type: "hello" }, BRIDGE_ORIGIN);
    });
    element.addEventListener("error", fail, { once: true });
    element.src = BRIDGE_URL;
    document.body.append(element);
  });
  return ready;
}

async function requestThroughBridge(trackId: string): Promise<BridgeResponse> {
  const element = await ensureBridge();
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      replies.delete(id);
      element.contentWindow?.postMessage({ channel: CHANNEL, type: "cancel", id }, BRIDGE_ORIGIN);
      reject(new Error("Developer lyrics request timed out"));
    }, getRemoteConfig().query.requestTimeoutMs);
    replies.set(id, response => {
      clearTimeout(timer);
      replies.delete(id);
      resolve(response);
    });
    // This page makes a normal browser request from an allowlisted origin.
    // Only a track id and public client key cross the frame boundary.
    element.contentWindow?.postMessage({ channel: CHANNEL, type: "lyrics", id, trackId, key: __LYSSNA_LYRICS_CLIENT_KEY__ }, BRIDGE_ORIGIN);
  });
}

export function getDeveloperLyrics(trackId: string): Promise<{ status: number; lyrics: any }> {
  const existing = pending.get(trackId);
  if (existing) return existing;
  const request = requestLyrics(trackId).finally(() => pending.delete(trackId));
  pending.set(trackId, request);
  return request;
}

async function requestLyrics(trackId: string): Promise<{ status: number; lyrics: any }> {
  if (!/^[A-Za-z0-9]{22}$/.test(trackId)) return { status: 400, lyrics: null };
  const lease = Acquire(true);
  try {
    const response = await requestThroughBridge(trackId);
    if (IsTripStatus(response.status)) SettleFailure(lease, ParseRetryAfter(response.retryAfter ?? null));
    else SettleSuccess(lease);
    if (response.status !== 200 && response.status !== 404) {
      console.warn(`Lyssna Lyrics developer API returned HTTP ${response.status}`);
    }
    return { status: response.status === 200 ? (response.body?.Status ?? 200) : response.status, lyrics: response.body?.Body ?? null };
  } catch (error) {
    SettleFailure(lease);
    throw error;
  }
}
