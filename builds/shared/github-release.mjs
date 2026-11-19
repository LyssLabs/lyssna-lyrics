const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const CACHE_NAME = "lyrics-release-runtimes-v1";
const releaseRepo = repo => `LyssnaHQ/${repo === "lyssna-lyrics" ? "lyssna-lyrics-legacy" : repo}`;
// Keep the original storage keys so verified offline bundles survive the repository transfer.
const manifestKey = repo => `release-loader:iPixelGalaxy/${repo}`;
const runtimeKey = repo => `https://api.github.com/repos/iPixelGalaxy/${repo}/cached-runtime`;
const releaseRequests = new Map();

function validRelease(repo, release, assetName) {
  if (!release || !VERSION.test(release.version) || release.assetName !== assetName(release.version)) return false;
  try {
    const url = new URL(release.url);
    return url.origin === "https://github.com" && url.pathname ===
      `/${releaseRepo(repo)}/releases/download/${encodeURIComponent(release.tag)}/${encodeURIComponent(release.assetName)}` &&
      (!release.digest || /^sha256:[a-f0-9]{64}$/i.test(release.digest));
  } catch { return false; }
}

function readRelease(repo, assetName) {
  let cached;
  try { cached = JSON.parse(globalThis.Spicetify.LocalStorage.get(manifestKey(repo)) ?? "null"); } catch { /* Fetch a fresh manifest. */ }
  return validRelease(repo, cached, assetName) ? cached : undefined;
}

export function fetchGitHubRelease(repo, assetName, { force = false } = {}) {
  const cached = readRelease(repo, assetName);
  if (!force && cached && Date.now() - cached.checkedAt >= 0 && Date.now() - cached.checkedAt < 60_000) return Promise.resolve(cached);
  if (releaseRequests.has(repo)) return releaseRequests.get(repo);
  const request = requestRelease(repo, assetName).finally(() => releaseRequests.delete(repo));
  releaseRequests.set(repo, request);
  return request;
}

async function requestRelease(repo, assetName) {
  const response = await fetch(`https://api.github.com/repos/${releaseRepo(repo)}/releases/latest`, {
    credentials: "omit", cache: "no-store", headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`GitHub release lookup failed: ${response.status}`);
  const data = await response.json();
  const version = typeof data.tag_name === "string" ? data.tag_name.replace(/^v/, "") : "";
  if (!VERSION.test(version) || data.draft || data.prerelease || !Array.isArray(data.assets)) throw new Error("Invalid published release");
  const asset = data.assets.find(item => item.name === assetName(version));
  const release = { version, tag: data.tag_name, assetName: assetName(version), url: asset?.browser_download_url, digest: asset?.digest ?? null, checkedAt: Date.now() };
  if (!validRelease(repo, release, assetName)) throw new Error("Published release is missing its runtime asset");
  try { globalThis.Spicetify.LocalStorage.set(manifestKey(repo), JSON.stringify(release)); } catch { /* Cache storage is optional. */ }
  return release;
}

async function verify(bytes, digest) {
  if (!bytes.byteLength || bytes.byteLength > 8_000_000) throw new Error("Invalid runtime bundle size");
  if (!digest) return;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, "0")).join("");
  if (`sha256:${hex}` !== digest.toLowerCase()) throw new Error("Runtime checksum does not match the published release");
}

function matchesRelease(cached, release) {
  return release && cached?.headers.get("x-release-version") === release.version &&
    cached.headers.get("x-release-digest") === (release.digest ?? "");
}

async function downloadBundle(repo, release, cache, onProgress) {
  const urls = [];
  // Only use the faster mirror when GitHub provides a checksum to authenticate its bytes.
  if (repo === "lyssna-lyrics" && release.digest) {
    urls.push(`https://ipixelgalaxy.com/lyssna-plugin/builds/${encodeURIComponent(release.assetName)}`);
  }
  // GitHub release assets lack browser CORS headers.
  urls.push(`https://cors-proxy.spicetify.app/${release.url}`);
  let failure;
  for (const [index, url] of urls.entries()) {
    try {
      onProgress?.("Downloading the plugin…");
      const response = await fetch(url, {
        credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(index < urls.length - 1 ? 4000 : 15000),
      });
      if (!response.ok) throw new Error(`Runtime download failed: ${response.status}`);
      const bytes = await response.arrayBuffer();
      onProgress?.("Verifying the download…");
      await verify(bytes, release.digest);
      try {
        await cache?.put(runtimeKey(repo), new Response(bytes, { headers: {
          "content-type": "text/javascript", "x-release-version": release.version, "x-release-digest": release.digest ?? "",
        } }));
      } catch { /* A cache write failure must not prevent startup. */ }
      return { version: release.version, bytes };
    } catch (error) { failure = error; }
  }
  throw failure;
}

async function openRuntimeCache(repo) {
  try {
    const cache = await caches.open(CACHE_NAME);
    return { cache, cached: await cache.match(runtimeKey(repo)) };
  } catch {
    return {};
  }
}

async function readCachedBundle(cached) {
  const version = cached?.headers.get("x-release-version");
  if (!version || !VERSION.test(version) || cached.bodyUsed) return undefined;
  const bytes = await cached.arrayBuffer();
  await verify(bytes, cached.headers.get("x-release-digest"));
  return { version, bytes };
}

export async function getCachedGitHubBundle(repo) {
  const { cached } = await openRuntimeCache(repo);
  return readCachedBundle(cached);
}

export async function getGitHubBundle(repo, release, onProgress) {
  const { cache, cached } = await openRuntimeCache(repo);
  let offline = cached;
  if (matchesRelease(cached, release)) {
    try {
      const bundle = await readCachedBundle(cached);
      if (bundle) return bundle;
    } catch {
      offline = undefined;
    }
  }
  try {
    return await downloadBundle(repo, release, cache, onProgress);
  } catch (error) {
    const bundle = await readCachedBundle(offline);
    if (!bundle) throw error;
    console.warn(`Using the cached ${repo} release after a download failure:`, error);
    return bundle;
  }
}

export async function importGitHubBundle(bundle) {
  const url = URL.createObjectURL(new Blob([bundle.bytes], { type: "text/javascript" }));
  try { await import(url); } finally { URL.revokeObjectURL(url); }
}
