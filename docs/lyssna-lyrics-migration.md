# Lyssna Lyrics integration

Common preferences keep the official `SL:settings` and `SL:uiState` records. Lyssna-only settings use `LL:settings`; its version history and settings-menu position use `LL:uiState`. A registry based on upstream 6.5.0 identifies compatible fields. Writes update only changed shared fields and preserve unknown upstream fields. Existing fork-only fields are copied into their own record before being removed from the shared record. Malformed records are preserved instead of being overwritten. The older `SpicyLyrics-*` migration still runs when no shared record exists.

Build selection uses `LyssnaLyrics-` keys. The built-ins are **Lyssna**, first and default, using `ipixelgalaxy.com` for both hosts, and **Spicy Lyrics**, using the official Stable hosts and `spicy-lyrics` bundle name. Beta is removed. Valid custom channels and fixed version pins are preserved, and their controls are always visible. Legacy launcher records are imported only when Lyssna has no selection of its own. Later changes stay independent. Legacy Stable/Beta selections map to official Spicy Lyrics; fork custom branches retain their names. Invalid stored records are left intact. The Lyssna plugin uses its own channel manager instead of delegating to an old entrypoint's hidden menu.

By default, common settings read directly from the shared records on each startup, so preferences changed while running Spicy Lyrics carry back into Lyssna. Fork-specific animator presets, lyric sources, Gravity mode, hidden settings, and related options stay in Lyssna's own record. Release-year values are stored in upstream's lowercase format while Lyssna's controls display title case. The static-background blur adapter reads upstream's current value when returning from that branch. Version history is kept separate to avoid treating a branch switch as an update to the other plugin.

Lyssna domains now serve their manifest at `/lyssna-plugin/version` and bundles at `/lyssna-plugin/builds/lyssna-lyrics@<version>.mjs`. Loader and in-plugin update checks share the same resolver. Official Spicy Lyrics keeps `/version` and `/spicy-lyrics@<version>.mjs` on its hosts. The canonical launcher loads GitHub’s v2 entrypoint through jsDelivr; that wrapper targets the self-contained hosted `/lyssna-plugin/entrypoint.mjs`.

Builds retain root `lyssna-lyrics@<version>.mjs` and `spicy-lyrics@<version>.mjs` compatibility files, and publish both names under the new builds folder. Existing hosted releases are copied into that folder without overwriting versions already migrated, keeping saved release pins available. Releases publish bundles before updating manifests.

The Advanced option **Don’t sync settings to Spicy Lyrics counterparts** stores a complete local preference snapshot and stops shared preference writes and reads. It is off by default. Re-enabling sharing publishes compatible Lyssna preferences again. UI state uses the same policy.

Lyssna uses its own page, modal element, CSS IDs and variables, animations, browser globals, persistent lyric database and cache names. Existing local TTML records are copied without changing the legacy database. Separate installations retain official Spicy Lyrics; the Lyssna loader avoids importing a second official runtime.

Historical Pixel Edition `100.10.x` versions sort before Lyssna’s `0.1.x` series in update status, patch-note filtering and downgrade notices.

## Public developer API

`config/spicy-lyrics-client-key.txt` contains the publishable client key shipped by [Lyssna](https://github.com/Stormanzanii/Lyssna/blob/main/config/spicy-lyrics-client-key.txt). The build accepts only `sl_pk_` keys. Both applications share its application allowance; rotation requires rebuilding both clients.

The Lyssna plugin's private `/query`, session, profile, edge configuration, experiments, artwork signing, and official startup/status/update integrations have been removed. Community and Apple Music requests use the documented [public lyrics endpoint](https://developers.spicylyrics.org/docs/reference/get.lyrics). Selecting the **Spicy Lyrics** branch explicitly loads the official plugin and its services. Static font and romanization libraries remain on their existing CDNs; these are separate from the removed plugin API.

Modern Spotify cannot make external HTTPS requests through the native Cosmos resolver ([Spicetify issue](https://github.com/spicetify/cli/issues/2844)). Browser requests from Spotify also cannot use an origin that the developer dashboard rejects. A hosted page therefore makes the request from an origin controlled by this project. It is a browser bridge, so each listener reaches the API from their own IP rather than sharing a server proxy's per-viewer limit.

### Required origin configuration

The owner of Lyssna's developer application must add **`https://ipixelgalaxy.com`** to that key's allowed origins. This step requires access to that application and cannot be completed by changing plugin code. The bridge does not need the no-origin-header option.

Builds copy `website/lyssna-lyrics-bridge.html` alongside the bundle. Serve it at **`https://ipixelgalaxy.com/lyssna-lyrics-bridge.html`**, without redirecting to a different origin. Server headers must allow that page to be framed by `https://xpui.app.spotify.com` and connect to `https://api.spicylyrics.org`. Do not apply `X-Frame-Options: DENY` or `SAMEORIGIN` to this page; use a route-specific `Content-Security-Policy: frame-ancestors https://xpui.app.spotify.com` if an embedding policy is needed.

The parent and bridge verify both message origin and source window. The bridge accepts a Spotify track id and a public key, calls only the fixed `/v1/lyrics/{id}` endpoint, bounds concurrent requests, and aborts timed-out requests. No Spotify access tokens, account data, or cookies are forwarded. Requests are deduplicated per track and share persistent backoff. Other enabled providers remain available if the bridge or API is unavailable.

### Cloudflare Rocket Loader

The bridge's script must have `data-cfasync="false"` in the HTML source. Without this exemption, Rocket Loader rewrites the script to an inert custom type and relies on its own external loader to execute it. The bridge's restrictive CSP blocks that external loader, so the parent never receives the ready message and falls back to other lyric providers. Spotify's browser log confirmed this refusal while direct API requests for the same track returned community syllable lyrics. Cloudflare documents the [per-script exemption](https://developers.cloudflare.com/speed/optimization/content/rocket-loader/ignore-javascripts/).

The plugin requests bridge revision `?v=2` to avoid reusing the previously transformed page. The lyrics-source cache signature also changes so fallbacks cached during this failure are fetched again. A fresh breaker generation prevents the repaired transport from inheriting the failed bridge's backoff. Do not remove the script exemption or relax the CSP to enable unrelated injected scripts. Builds compile inline scripts with attributes as well as plain script tags.

After the exemption was deployed, a request through a temporary hidden bridge in the running Spotify client completed with HTTP 200 and returned API lyrics. The inspection frame was removed afterward; playback was not changed.

Responses normalize the public source names into the existing renderer ids. Provider and returned creator attribution remain with the lyrics, including compact Gravity mode. Contributor profiles open externally; no private profile lookup or HTML injection remains. Motion artwork uses static covers until a supported source is available. Saved artwork and profile preferences are preserved for switching back to the official plugin.

## Branding and links

The icon is the exact Lucide `Mic2` / `MicVocal` used by Lyssna's Lyrics toolbar button in `frontend/App.tsx`, with its original paths, circle, 24×24 view box, and 2px stroke. The circular app background is omitted. The vector is embedded locally; inline icons follow the current text color and keep their interior unfilled. Lucide's license is retained with the asset and in the bundle. Credits appear in Settings → Credits. The standalone download currently points to `https://clypdat.xyz/lyssna.exe`; change `src/brand.ts` to update it. Discord points to `https://discord.gg/qfYAsFQawp` throughout the plugin. Update dialogs use a transformed rainbow sheen with a reduced-motion alternative.

## Contributor identity and plugin settings

Community credits show the provider's avatar when available, with a Discord Lookup avatar as a fallback. The default-on **Lyrics → Discord usernames in credits** preference uses the returned `user.username`. When the existing display name matches that username ignoring case, its capitalization is preserved: `ipixelgalaxy` may appear as `iPixelGalaxy`. A different display name does not replace the username. The ID `622852916092469278` keeps the credited name Arashii. Failed requests preserve the supplied name, or show the string ID when no name exists. Disabling username lookup preserves avatars and the Arashii exception.

The public lookup endpoint is configurable through the fork-only `discordLookupEndpoint` value in `LL:settings`; it is not exposed in the settings UI. It defaults to `https://discord-lookup.lookupbotdc.workers.dev/search/`, takes no credentials, requires an exact string ID match in the response, and has a five-second timeout. Successful identities are cached for five minutes, failures for thirty seconds, and simultaneous requests for one ID share a promise. HTTP 429 pauses that endpoint, respecting a bounded `Retry-After` when available. There are no automatic retries. These preferences live only in `LL:settings`.

The settings shell follows Lyssna's solid neutral window with a header search field, keyboard-accessible category tabs, an animated selection marker, and green toggles. Existing plugin settings, search, hidden-setting management, and subpanels remain available. Spotify's own settings stay in Spotify. The lyric toolbar uses Lyssna's glyphs, hover motion and state indicators with existing plugin actions, plus direct word-sync and fullscreen controls. Motion respects reduced-motion preferences. The playback-bar microphone uses a 16px box matching Spotify's neighboring icons.

| Before | After | Why |
| --- | --- | --- |
| Open rows and light labels | Bordered groups, 58px minimum rows, bold 13.5px labels | Match Lyssna's settings hierarchy and row spacing. |
| Text-only tabs and a terminal header icon | Lyssna's Lucide category and settings icons | Match the supplied application reference. |
| Variable modal height and text-sized selects | A maximum 840×720px window and 220×32px selects | Match the source dimensions while retaining small-window reflow. |
| A separate update and notification theme switch | Neutral dialogs and notifications | Remove the purple theme and its controls; old fork-only keys are retired. |

The scroll-to-current-line button uses the original lyrics-column anchor. The grouped-control skin no longer anchors it to the outer ContentBox, which is outside its positioning container and caused a centered fallback. A live geometry inspection confirmed the corrected anchor moves the button from the middle of the view to the lyrics' right edge without changing playback.

The upstream Spring-spacing experiment had enabled a `0.6em` gap by default, compared with the original `1cqw` gap. In the inspected Spotify window that meant about 33px rather than 14px. Tight spacing is the default again; explicit opt-ins to increased spacing remain intact. Bloom spacing is unchanged.

## Reviewer policy and support navigation

TTML Reviewer is configured only in **Load TTML**, with **Off**, **Apply on Temp**, and **Always Apply**. Apply on Temp activates the review profile only for a file loaded through Temporary Load, then restores the original preferences on reset, a regular load, or a track change. Session and persistent uploads do not activate this policy. Always Apply keeps the profile active for every lyric source. An already-enabled legacy reviewer is migrated to Always Apply, preserving its settings backup under `LL:ttmlReviewer`. The mode is stored only in `LL:settings`.

The **What does it change?** button opens a separate explanation of every changed preference, with a button back to Load TTML. Profile changes suppress intermediate lyric rebuilds; changing the policy triggers one final rebuild. Temporary uploads are re-parsed from their original TTML when rebuilt so reviewer changes do not inherit transformed words from the previous profile.

Credits is a top-level settings tab. Report a Bug sits beside the Lyssna, Discord, and Standalone footer links. Its pane uses one visible copy-feedback label, a fresh diagnostic snapshot on copy, and an expandable preview. Reports identify Lyssna Lyrics and its reviewer policy, label the local Canary build, distinguish uploaded TTML from server lyrics, and omit credential settings and the configurable lookup endpoint. No report is sent automatically.

## Independent app versions and switch detection

Lyssna compiles its installed version into `__LYSSNA_BUILD_VERSION__` and exposes it internally through `$lyssnaLyricsVersion`. The build driver passes `LYSSNA_LYRICS_BUILD_VERSION`. The loader uses `_lyssna_lyrics_metadata` for this app and writes `_spicy_lyrics_metadata` only when booting official Spicy Lyrics. A legacy loader cannot override Lyssna's compiled version through Spicy's metadata.

Installed-version history and prompt acknowledgement live in `LL:versionState`. Only recognizable prior fork versions from `LL:uiState` are adopted on first use. Spicy's `SL:uiState.fromVersion`, previous-version fields, and `SL:lastAnnouncedVersion` are neither moved nor changed by Lyssna. Unreadable Lyssna history is preserved instead of overwritten. Compatible UI preferences still synchronize as before.

The shared loader records successful app loads in `LL:activeLyricsApp`, allowing both switch directions to be detected even when versions have not changed. Returning to Lyssna compares against its last Lyssna version; it never treats the Spicy version as an upgrade or downgrade. A changed upstream version record also detects a return from older loaders. Same-version switches through an unrelated, unmodified loader cannot be inferred reliably without that loader recording the active app. Update checks retain the channel loaded at startup, so selecting a different app does not compare its versions before reload.

The settings footer has no divider below the Standalone promotion. Floating return-to-line controls swap edges: the up arrow appears at the bottom and the down arrow at the top, with their original actions and accessible labels. Their dark surfaces match the toolbar pills. The Discord action says **Join our new Discord** and explains the changed invite. Its rainbow scrolls continuously using a transform; reduced-motion users see the static rainbow. Update-available prompts use the wider dialog, with Discord at the left and the dismissal/reload actions grouped at the right. Small windows can wrap the groups.

## Dialog surfaces and responsive controls

Plugin dialogs use the same solid dark surface by default, including Load TTML, Manage Sources, and the TTML database. Appearance's **Liquid Glass** option restores translucent surfaces across the shared modal, including when it moves to another document. This preference belongs to `LL:settings`; it is not synchronized to Spicy Lyrics. Reduced-transparency preferences keep the surface opaque.

Each shared dialog paints its surface on the dialog itself. Its surface and contents fade and scale together, replacing the separately animated background pseudo-element that could remain visible after the contents closed. This applies to settings, source management, TTML dialogs, and other shared modal views. Reduced-motion users get an immediate state change.

Build Channel management uses an 840-pixel desktop dialog with branch rows filling its content width. On narrow panels, actions move below the branch details and wrap rather than crowding host names. Its header includes the same Back control as Manage Sources. Opening it from settings preserves the tab, search and scroll position when returning, including in Cinema's document; a standalone entry returns to settings.

Permanently unavailable motion artwork and embedded-profile options are absent from settings and the hidden-settings catalog. Their stored values remain available for switching branches. Dependent or reviewer-locked settings appear only while editable; disabled upload and other action buttons still communicate temporary action states. Join Split Words defaults to **Off** for new Lyssna settings, while explicit existing choices and legacy boolean choices are preserved.

The Standalone promotion and footer links share one bottom-anchored group, so sparse tabs cannot leave a gap between them. A non-shrinking content column ends with a 32-pixel spacer so the footer can scroll clear of the window edge. The scroll container adds no bottom padding, avoiding duplicate space that made the default Appearance tab overflow by 16 pixels. The desktop settings window is 792 pixels tall (10% taller than before), capped by the viewport with 24-pixel outer margins; narrow windows retain their viewport-filling layout. Lyssna's credit no longer describes the shared developer key.

Outside fullscreen, the lyrics toolbar sits at the artwork-side corner and follows artwork moved to the right. Without artwork it uses the right corner. The existing Bottom option uses the opposite corner, as in Lyssna. Views narrower than 640 pixels, or manually compacted views, use a scrollable vertical strip on the right with room reserved beside the lyrics. The breakpoint follows the lyrics pane's size rather than the entire Spotify window. Vertical tooltips open inward. Fullscreen and Cinema retain their existing layouts.
