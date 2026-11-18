# Integration notes

## Settings and compatibility

Lyssna stores its own preferences in `LL:settings` and its version history and UI state in `LL:uiState`. Compatible preferences synchronize with Spicy Lyrics by default. **Advanced → Don't sync settings to Spicy Lyrics counterparts** keeps a local snapshot and stops shared reads and writes. Unknown upstream fields are preserved.

Build selection uses `LyssnaLyrics-` keys. The Lyssna and Spicy Lyrics branches have separate page routes, runtime identifiers, lyric databases, caches, and version histories. Older launcher filenames remain as compatibility wrappers for existing installations. Keep those wrappers until their callers have migrated.

## Hosted files

The canonical website directory is `/lyssna-plugin/`:

- `version`: the stable version manifest.
- `builds/lyssna-lyrics@<version>.mjs`: full versioned bundles.
- `entrypoint.mjs`: the hosted channel loader.
- `lyssna-lyrics-bridge.html`: the public API transport for older builds.

The GitHub launcher uses the v2 entrypoint wrapper. The default Lyssna channel checks the latest GitHub release before selecting a cached bundle; custom branches and fixed pins retain their configured source. Older website paths can forward to the canonical directory without duplicating full bundles.

## Official plugin integration

Lyssna reads saved TTML and its credits through `SpicyLyrics.db.objectStores.lyricsStore.manager.get(uri)` when the official Spicy Lyrics extension is running independently. The provider retains the `spicy` settings ID and respects its existing order and enabled state. The exposed manager serves user-saved TTML. Online tracks can use the other enabled providers.

## Public lyrics API bridge for older builds

`config/spicy-lyrics-client-key.txt` contains the publishable client key used by older builds and shared with Lyssna. Keep the existing bridge deployed for those clients. New builds omit the key and publish their bundles without replacing the bridge.

The key owner must allow **https://ipixelgalaxy.com** in the developer application's origin settings. The plugin loads **https://ipixelgalaxy.com/lyssna-plugin/lyssna-lyrics-bridge.html?v=2** in a hidden frame. That page requests community and Apple Music lyrics from the public Spicy Lyrics API. Other enabled providers remain available when the bridge fails.

Serve the bridge without redirecting to another origin. Allow framing by `https://xpui.app.spotify.com` and connections to `https://api.spicylyrics.org`. Do not set `X-Frame-Options: DENY` or `SAMEORIGIN` on this page. If an embedding policy is needed, use a route-specific `Content-Security-Policy: frame-ancestors https://xpui.app.spotify.com`.

Keep `data-cfasync="false"` on the inline bridge script. Cloudflare Rocket Loader otherwise transforms it, and the bridge's restrictive CSP blocks the external loader needed to run it. This prevents the ready message and makes the plugin fall back to another provider.

The parent and bridge validate message origins, source windows, and the channel identifier. Requests use a fixed API endpoint, bounded concurrency, cancellation, and timeouts. No Spotify account tokens or cookies are forwarded. Preserve these checks when changing the transport.

## Attribution

Retain the upstream AGPL license, Spicy Lyrics credit, and the icon license in `src/assets/LUCIDE_LICENSE.txt`. Provider and contributor credits belong in the lyrics view.
