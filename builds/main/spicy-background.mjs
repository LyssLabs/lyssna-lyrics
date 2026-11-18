import { channelBundleUrl, channelVersionUrl, readChannelVersion } from "../shared/build-paths.mjs";
import { BUILT_IN_CHANNELS } from "../shared/channels.mjs";

const [apiHost, storageHost] = BUILT_IN_CHANNELS["Spicy Lyrics"];
const channel = { name: "Spicy Lyrics", apiHost, storageHost };
const backgroundKey = "__LYSSNA_SPICY_BACKGROUND__";
const startupTimeoutMs = 10000;
const noop = () => {};

function createBackgroundSpicetify(host, onDispose) {
  const storage = new Map([["SL:settings", JSON.stringify({
    developerMode: true,
    backgroundStyle: "color",
    skipSpicyFont: true,
  })]]);
  const subscriptions = new Map();
  const player = host.Player;
  const tooltip = { setContent: noop, setProps: noop, destroy: noop };
  const playbackEvents = new Set(["onplaypause", "songchange"]);
  const history = { location: { pathname: "/SpicyLyrics" }, listen: () => noop, push: noop, goBack: noop };

  onDispose(() => {
    for (const [event, callbacks] of subscriptions) {
      for (const callback of callbacks) player.removeEventListener(event, callback);
    }
    subscriptions.clear();
  });

  return {
    Config: host.Config,
    get CosmosAsync() { return host.CosmosAsync; },
    GraphQL: host.GraphQL,
    Queue: host.Queue,
    React: host.React,
    ReactDOM: host.ReactDOM,
    ReactDOMServer: host.ReactDOMServer,
    ReactJSX: host.ReactJSX,
    SVGIcons: host.SVGIcons,
    URI: host.URI,
    Platform: new Proxy({}, {
      get(_, key) {
        if (key === "History") return history;
        if (key === "PlaybackAPI") return {};
        return Reflect.get(host.Platform, key, host.Platform);
      },
    }),
    Player: {
      get data() { return player.data; },
      get origin() { return { _state: player.origin?._state ?? {} }; },
      getProgress: () => player.getProgress(),
      getRepeat: () => player.getRepeat(),
      getVolume: () => player.getVolume(),
      getHeart: () => player.getHeart(),
      isPlaying: () => player.isPlaying(),
      addEventListener(event, callback) {
        if (!playbackEvents.has(event)) return;
        if (!subscriptions.has(event)) subscriptions.set(event, new Set());
        const callbacks = subscriptions.get(event);
        if (callbacks.has(callback)) return;
        callbacks.add(callback);
        player.addEventListener(event, callback);
      },
      removeEventListener(event, callback) {
        if (subscriptions.get(event)?.delete(callback)) player.removeEventListener(event, callback);
      },
    },
    LocalStorage: {
      get: key => storage.get(key) ?? null,
      set: (key, value) => storage.set(key, value),
      remove: key => storage.delete(key),
    },
    Menu: { Item: class { register() {} } },
    Keyboard: { KEYS: host.Keyboard?.KEYS ?? {}, registerImportantShortcut: noop },
    Tippy: () => tooltip,
    showNotification: noop,
  };
}

async function readPublicVersion() {
  try {
    const response = await fetch(channelVersionUrl(channel), { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (response.ok) return await readChannelVersion(channel, response);
  } catch (error) {
    console.warn("[Lyssna Lyrics] Could not read the Spicy Lyrics version:", error);
  }
  return undefined;
}

function waitForLyricsView(frameDocument, script) {
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (frameDocument.querySelector("#SpicyLyricsPage .LyricsContent")) finish();
    });
    const timer = setTimeout(() => finish(new Error("Spicy Lyrics did not mount its background view")), startupTimeoutMs);
    function finish(error) {
      clearTimeout(timer);
      observer.disconnect();
      script.removeEventListener("error", onError);
      if (error) reject(error);
      else resolve();
    }
    function onError() {
      finish(new Error("Could not load the official Spicy Lyrics module"));
    }
    script.addEventListener("error", onError);
    observer.observe(frameDocument.body, { childList: true, subtree: true });
    frameDocument.head.append(script);
  });
}

async function loadBackground() {
  const version = await readPublicVersion();
  const frame = document.createElement("iframe");
  frame.title = "Spicy Lyrics background";
  frame.inert = true;
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("sandbox", "allow-scripts allow-same-origin");
  frame.style.cssText = "position:fixed;inset:0 auto auto 0;width:480px;height:320px;opacity:0;pointer-events:none;border:0";
  document.body.append(frame);
  const dispose = [];
  try {
    const frameWindow = frame.contentWindow;
    const frameDocument = frame.contentDocument;
    if (!frameWindow || !frameDocument) throw new Error("Could not create the Spicy Lyrics background document");

    // Upstream fetches from its normal page lifecycle, so mount its route inside the frame.
    frameDocument.body.innerHTML = '<main id="main-view"><div class="main-view-container"><div data-overlayscrollbars-viewport></div></div></main>';
    frameWindow.Spicetify = createBackgroundSpicetify(Spicetify, callback => dispose.push(callback));
    frameWindow._spicy_lyrics_metadata = { LoadedVersion: version };
    const script = frameDocument.createElement("script");
    script.type = "module";
    script.src = channelBundleUrl(channel, version);
    await waitForLyricsView(frameDocument, script);
    return frameWindow;
  } catch (error) {
    for (const callback of dispose) callback();
    frame.remove();
    throw error;
  }
}

export function startSpicyLyricsBackground() {
  if (window[backgroundKey]) return;
  const background = window[backgroundKey] = {};
  background.ready = loadBackground().catch(error => {
    console.warn("[Lyssna Lyrics] Spicy Lyrics background unavailable:", error);
    return null;
  }).then(frameWindow => {
    background.frameWindow = frameWindow;
    return frameWindow;
  });
}
