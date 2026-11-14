# Lyssna Lyrics integration

Common preferences keep the official `SL:settings` and `SL:uiState` records. Lyssna-only settings use `LL:settings`; its version history and settings-menu position use `LL:uiState`. A registry based on upstream 6.5.0 identifies compatible fields. Writes update only changed shared fields and preserve unknown upstream fields. Existing fork-only fields are copied into their own record before being removed from the shared record. Malformed records are preserved instead of being overwritten. The older `SpicyLyrics-*` migration still runs when no shared record exists.

Build selection uses `LyssnaLyrics-` keys. The built-ins are **Lyssna**, first and default, using `ipixelgalaxy.com` for both hosts, and **Spicy Lyrics**, using the official Stable hosts and `spicy-lyrics` bundle name. Beta is removed. Valid custom channels and fixed version pins are preserved, and their controls are always visible. Legacy launcher selection keys are mirrored so an older installed launcher can still switch branches. The Lyssna plugin uses its own channel manager instead of delegating to an old entrypoint's hidden menu.

Common settings read directly from the shared records on each startup, so preferences changed while running Spicy Lyrics carry back into Lyssna. Fork-specific animator presets, lyric sources, Gravity mode, hidden settings, and related options stay in Lyssna's own record. Release-year values are stored in upstream's lowercase format while Lyssna's controls display title case. The static-background blur adapter reads upstream's current value when returning from that branch. Version history is kept separate to avoid treating a branch switch as an update to the other plugin.

Builds retain a compatible spicy-lyrics filename for older launchers.

## Public developer API

`config/spicy-lyrics-client-key.txt` contains the publishable client key shipped by [Lyssna](https://github.com/Stormanzanii/Lyssna/blob/main/config/spicy-lyrics-client-key.txt). The build accepts only `sl_pk_` keys. Both applications share its application allowance; rotation requires rebuilding both clients.

The Lyssna plugin's private `/query`, session, profile, edge configuration, experiments, artwork signing, and official startup/status/update integrations have been removed. Community and Apple Music requests use the documented [public lyrics endpoint](https://developers.spicylyrics.org/docs/reference/get.lyrics). Selecting the **Spicy Lyrics** branch explicitly loads the official plugin and its services. Static font and romanization libraries remain on their existing CDNs; these are separate from the removed plugin API.

Modern Spotify cannot make external HTTPS requests through the native Cosmos resolver ([Spicetify issue](https://github.com/spicetify/cli/issues/2844)). Browser requests from Spotify also cannot use an origin that the developer dashboard rejects. A hosted page therefore makes the request from an origin controlled by this project. It is a browser bridge, so each listener reaches the API from their own IP rather than sharing a server proxy's per-viewer limit.

### Required origin configuration

The owner of Lyssna's developer application must add **`https://ipixelgalaxy.com`** to that key's allowed origins. This step requires access to that application and cannot be completed by changing plugin code. The bridge does not need the no-origin-header option.

Builds copy `website/lyssna-lyrics-bridge.html` alongside the bundle. Serve it at **`https://ipixelgalaxy.com/lyssna-lyrics-bridge.html`**, without redirecting to a different origin. Server headers must allow that page to be framed by `https://xpui.app.spotify.com` and connect to `https://api.spicylyrics.org`. Do not apply `X-Frame-Options: DENY` or `SAMEORIGIN` to this page; use a route-specific `Content-Security-Policy: frame-ancestors https://xpui.app.spotify.com` if an embedding policy is needed.

The parent and bridge verify both message origin and source window. The bridge accepts a Spotify track id and a public key, calls only the fixed `/v1/lyrics/{id}` endpoint, bounds concurrent requests, and aborts timed-out requests. No Spotify access tokens, account data, or cookies are forwarded. Requests are deduplicated per track and share persistent backoff. Other enabled providers remain available if the bridge or API is unavailable.

Responses normalize the public source names into the existing renderer ids. Provider and returned creator attribution remain with the lyrics, including compact Gravity mode. Contributor profiles open externally; no private profile lookup or HTML injection remains. Motion artwork uses static covers until a supported source is available. Saved artwork and profile preferences are preserved for switching back to the official plugin.

## Branding and links

The icon is the exact Lucide `Mic2` / `MicVocal` used by Lyssna's Lyrics toolbar button in `frontend/App.tsx`, with its original paths, circle, 24×24 view box, and 2px stroke. The circular app background is omitted. The vector is embedded locally; inline icons follow the current text color and keep their interior unfilled. Lucide's license is retained with the asset and in the bundle. Credits appear in Settings → Credits. The standalone download currently points to `https://clypdat.xyz/lyssna-latest/lyssna-setup.exe`; change `src/brand.ts` to update it. Discord points to `https://discord.gg/qfYAsFQawp` throughout the plugin. Update dialogs use a transformed rainbow sheen with a reduced-motion alternative.

