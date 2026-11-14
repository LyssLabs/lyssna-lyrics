# Lyssna Lyrics integration

The plugin keeps the shared `SL:settings` record and legacy `SpicyLyrics-` settings keys. Renaming the product does not move or reset common preferences. Internal page ids, renderer ids, routes, export formats, and the `window.SpicyLyrics` compatibility alias remain stable.

Build selection uses `LyssnaLyrics-` keys. The first read copies valid custom fork channels from the old record without modifying it. Official service hosts are excluded. Both the loader and in-plugin version checks default to `ipixelgalaxy.com`; versioned bundles are named `lyssna-lyrics@<version>.mjs`.

## Public developer API

`config/spicy-lyrics-client-key.txt` contains the publishable client key shipped by [Lyssna](https://github.com/Stormanzanii/Lyssna/blob/main/config/spicy-lyrics-client-key.txt). The build accepts only `sl_pk_` keys. Both applications share its application allowance; rotation requires rebuilding both clients.

The private `/query`, session, profile, edge configuration, experiments, artwork signing, and official startup/status/update integrations have been removed. Community and Apple Music requests use the documented [public lyrics endpoint](https://developers.spicylyrics.org/docs/reference/get.lyrics). Static font and romanization libraries remain on their existing CDNs; these are separate from the removed plugin API.

Modern Spotify cannot make external HTTPS requests through the native Cosmos resolver ([Spicetify issue](https://github.com/spicetify/cli/issues/2844)). Browser requests from Spotify also cannot use an origin that the developer dashboard rejects. A hosted page therefore makes the request from an origin controlled by this project. It is a browser bridge, so each listener reaches the API from their own IP rather than sharing a server proxy's per-viewer limit.

### Required origin configuration

The owner of Lyssna's developer application must add **`https://ipixelgalaxy.com`** to that key's allowed origins. This step requires access to that application and cannot be completed by changing plugin code. The bridge does not need the no-origin-header option.

Builds copy `website/lyssna-lyrics-bridge.html` alongside the bundle. Serve it at **`https://ipixelgalaxy.com/lyssna-lyrics-bridge.html`**, without redirecting to a different origin. Server headers must allow that page to be framed by `https://xpui.app.spotify.com` and connect to `https://api.spicylyrics.org`. Do not apply `X-Frame-Options: DENY` or `SAMEORIGIN` to this page; use a route-specific `Content-Security-Policy: frame-ancestors https://xpui.app.spotify.com` if an embedding policy is needed.

The parent and bridge verify both message origin and source window. The bridge accepts a Spotify track id and a public key, calls only the fixed `/v1/lyrics/{id}` endpoint, bounds concurrent requests, and aborts timed-out requests. No Spotify access tokens, account data, or cookies are forwarded. Requests are deduplicated per track and share persistent backoff. Other enabled providers remain available if the bridge or API is unavailable.

Responses normalize the public source names into the existing renderer ids. Provider and returned creator attribution remain with the lyrics, including compact Gravity mode. Contributor profiles open externally; no private profile lookup or HTML injection remains. Motion artwork uses static covers until a supported source is available. Saved artwork and profile preferences are preserved for switching back to the official plugin.

## Branding and links

The local Lyssna logo is embedded unchanged from Stormanzanii/Lyssna with the creator's permission. Credits appear in Settings → Credits. The standalone download currently points to `https://clypdat.xyz/lyssna-latest/lyssna-setup.exe`; change `src/brand.ts` to update it. Discord points to `https://discord.gg/qfYAsFQawp` throughout the plugin. Update dialogs use a transformed rainbow sheen with a reduced-motion alternative.

