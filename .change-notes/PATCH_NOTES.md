## v0.1.3

- **Spotify+ enhancements**
  Added an Enhancements tab with profile-menu hiding, Friend Activity, Spotify lyrics and Miniplayer button hiding, classic device and share menus, Disable Peek, playlist-folder selection and playlist cover art. F5 refresh is built in. Existing Spotify+ preferences and folder choices are imported, and Spotify+ is credited in Credits.

- **Keep Spotify+ installed**
  Spotify+ 0.3.6 automatically stands down with integrated Lyssna builds, leaving its menu, tools, styles and feature handlers unloaded. It resumes with Spicy Lyrics or builds without Enhancements. Lyssna shows one integration notice. Existing Spotify+ users need to update to 0.3.6 once to receive this support and its automatic launcher.

- **Automatic stable updates**
  The Lyssna channel now loads the latest published GitHub release when Spotify starts. Spotify+ also follows its published releases after the launcher update. Downloaded builds are checked against GitHub's checksum when available, with a cached runtime fallback if a later download fails. Custom branches and pinned versions keep their selected source.

- **Faster startup**
  Saved, verified builds start without waiting for GitHub, while update checks and downloads run in the background. New downloads try the faster Lyssna mirror first and must match GitHub's checksum. During slower starts, a spinner appears in the lyrics button's place until the plugin is ready.

- **lrc.red lyrics**
  Added lrc.red to Manage Sources, with an independent catalog lookup for timed lyrics, including word sync when available. Missing songwriter credits are filled from enabled sources in priority order without replacing the selected lyrics. Word-synced lrc.red results are labelled Apple Music (via lrc.red), with a clickable credit and an Open lrc.red link in Manage Sources.

- **Source priority**
  Word sync wins over line sync, then plain lyrics; your source order decides ties. Putting Spicy Lyrics first now keeps its community word sync instead of being overridden by the Apple Music preference. Removed that conflicting preference toggle. The new default order is Apple Music, lrc.red, Spicy Lyrics, Musixmatch, Spotify, LRCLIB and Netease. Saved custom orders are retained.

- **Build channels and switching**
  Fixed loading the official Spicy Lyrics build. Its Advanced tab now includes the channel selector, with a fallback at the top of Spotify settings instead of an extra profile-menu entry. Switching plugins while viewing lyrics opens the destination plugin's lyrics page. Saved routes are updated before switching so Spotify+ does not restore the wrong view when it resumes. The Spicy switch toast is now a dialog.

- **Branch manager and UI polish**
  Reworked the fallback branch manager with wider cards, compact host details, Back navigation and a dimmed backdrop. It uses neutral Lyssna styling, or a logo-free purple tint on the Spicy side. Channel controls and dropdown menus match Spotify settings or Spicy's Advanced tab. The settings close button has a larger click area, and Enhancements has a magic wand icon. Now Playing lyric controls use Lyssna's icons, and the Discord username setting has shorter wording.

### Additional changes

- **Startup loading indicator**
  Replaced the separate loading text box with a spinner in the playback bar's lyrics-button position. The normal lyrics button takes its place once the plugin is ready. Fast starts skip the indicator, and reduced-motion preferences are respected.

- **Build-channel dropdowns**
  Replaced the white native menu in Spicy Lyrics with a purple dropdown matching its other settings, including a checkmark for the selected channel. The fallback channel controls in Spotify settings use Spotify's colors and button styling. Dropdowns support keyboard navigation and Escape to close.

- **Settings buttons**
  Enlarged the settings close button's click area to 44 × 44 pixels without changing the icon or layout. The Enhancements tab now uses a magic wand icon.

## v0.1.2

- **Settings cleanup**
  Effects now live at the top of Lyrics instead of in a separate tab. Moved lyric options into Lyrics and background options into Appearance. Descriptions are shorter, and dependent settings appear only when relevant. Refined Background is now called Muted Background. Removed Increased Line Spacing, Player Below Cover and Frosted Scroll Button; seek and volume previews are always available.

- **Lyric styles and animation presets**
  Renderer styles are now named Lyssna and Apple Music. The former Pixel animator preset is now Lyssna (Default), and the former Default preset is called Spicy. New installs use Lyssna (Default); existing saved preset choices stay unchanged. Animator presets appear for Lyssna, while Background Vocal Pop-Out appears for Apple Music.

- **Up Next placement**
  Added Off, Top Left and Bottom choices under Lyrics, with Top Left as the default. Up Next appears during the final 30 seconds in the lyrics page, Cinema View and fullscreen, including Canvas. Top placement sits above the cover or in the Canvas corner; Bottom fits beside pinned credits when there is room and stacks below them otherwise. Fixed hidden cards and footer overlap. Up Next stays hidden while the queue is open.

- **Credits and Now Playing lyrics**
  Refined credits use white text, with the lyrics source above writers or contributors when unpinned. Estimated line and word timing is identified alongside the source. Now Playing lyrics use the card’s available width and respect Off, No Writers and Full pinned-footer modes. The compact card grows to fit pinned credits without reducing the lyrics area, with tighter spacing when scrolled to the end and a scrollbar inset from the bottom.

- **Canvas in Now Playing**
  Canvas display follows Spotify’s own setting instead of a separate plugin option. When a Canvas is already playing in the lyrics view, Now Playing shows cover art to avoid displaying the same video twice.

- **Popup player**
  Renamed the window to Lyssna Lyrics Popup and moved Enable Popup Player into Lyrics. It defaults to Off for new installs, with existing saved choices retained; Popup Player Dock appears only while the player is enabled. Fixed the title overlapping lyrics, oversized space between credits, and compact-layout offsets. Lyric and credit sizes now follow the popup’s dimensions.

- **Fullscreen and return navigation**
  Escape and the fullscreen button now follow the same exit action. Exit Fullscreen returns to the lyrics page, while Exit to Cinema keeps Cinema View open. Fixed artwork remaining dim after leaving fullscreen and kept cover-art controls centered inside a background that fits the buttons. Fixed the lyrics button getting stuck instead of returning to the previous Spotify view.

- **Experimental Word Sync**
  Toggling the feature no longer rebuilds songs that need no timing corrections. Apple Music extra splits and backing-vocal repairs remain available, with a fix for backing vocals accumulating across repeated conversions. Static lyrics can use track-duration estimates when audio analysis is unavailable. Reduced repeated work during analysis-based conversion and shared simultaneous analysis requests.

## v0.1.1

- **Upstream 6.5.10**
  Added “Show Queue When a Song Has No Lyrics” under Layout. When enabled, Fullscreen and Cinema View open the queue for songs without lyrics and return to lyrics when they become available. This option defaults to Off.

- **Scrolling defaults**
  Smooth Scrolling and Early Scroll now default to On, including in TTML Reviewer mode. Early Scroll starts 250 ms before the next line by default. Existing saved choices stay unchanged outside Reviewer mode.

- **Line hover and TTML Reviewer**
  Line Hover Background now defaults to Off, including in Reviewer mode. Reviewer uses the plugin’s current defaults for its standard settings, while keeping exact seeking and still backgrounds for review.

- **Rendering fixes**
  Reduced rendering overhead after lyric animations settle and in Spotify’s older navigation layout. Fixed tiny leftover scroll offsets after lyric rows finish moving.

## v0.1.0

- **Lyssna Lyrics**
  Pixel Edition becomes Lyssna Lyrics, with Lyssna’s microphone icon, settings design and responsive lyrics toolbar. Original Spicy Lyrics and Arashii are credited in a dedicated Credits tab.

- **Run alongside Spicy Lyrics**
  Both extensions can stay installed and enabled, with separate pages, controls, branch choices, update history and local TTML collections. Existing local TTML files are copied into Lyssna. Compatible preferences stay shared by default; Advanced now includes “Don’t sync settings to Spicy Lyrics counterparts” for an independent setup.

- **A fresh version series**
  Lyssna starts at 0.1.0. Update prompts and patch notes recognize historical 100.10.x Pixel Edition releases as earlier versions.

- **Lyrics and contributor credits**
  Community and Apple Music lyrics use the public developer API. Contributor avatars return, and username lookup keeps matching display-name capitalization.

- **Settings and dialog cleanup**
  Added search, Credits, source management navigation and optional Liquid Glass. Removed the old purple update theme. Fixed duplicate closing panels, excess scrolling and footer spacing.

- **Lyric controls and TTML review**
  Restored return-to-active-line controls, corrected their direction, adjusted lyric spacing and matched Spotify’s button sizes. Load TTML now offers Off, Apply on Temp and Always Apply reviewer modes, with an explanation button. Join Split Words defaults to Off.

- **Updates and community links**
  Update prompts have room for all actions and highlight the new Discord invite. Settings link to the new Lyssna Standalone download.

- **Easier installation**
  Added Windows, macOS and Linux install and uninstall scripts, a downloadable Lyssna launcher, and a rewritten README with the original archived.

- **Smoother lyric controls**
  Reduced stutter when moving across lyric controls and showing tooltips. Lyric fades stay steady between buttons.

## v100.10.54

- **Updated to be inline with 6.4.70**

## v100.10.53

- **Ok, actually fr, inline with 6.4.50 this time.**

## v100.10.52

- **Updated to be inline with 6.4.50**

## v100.10.51

- **Updated to be inline with 6.4.10**

## v100.10.50

- **Updated to be inline with 6.3.190**

## v100.10.49

- **Updated to be inline with 6.3.153**
  Added lyrics-card support for Spotify's newer Now Playing layout. Fixed doubled playback-bar offsets and faint duplicate interlude dots while they bounce.

### Pixel Edition changes

- **Lyric font fallback**
  Lyrics fall back to Spicy Lyrics' built-in font when more than half of their visible characters are unsupported by your custom font. Rechecks when the song, font, or romanization changes, while keeping your font preference saved.

- **Space Gravity in popout windows**
  Fixed starting and switching Space Gravity in popout windows while the main Spotify window is minimized.

- **Popout cover artwork**
  Fixed known artwork being replaced by generic covers. Popout artwork and backgrounds now refresh when cover metadata arrives late.

- **Loading errors and appearance**
  Fixed loading errors not appearing for invalid build hosts. Loading dialogs and retry notifications now follow New Settings and Update Design, including classic mode, even when the plugin cannot load.

- **Spotify 1.3.4 button highlight**
  Restored the active highlight on the Spicy Lyrics playbar icon in Spotify 1.3.4.

- **Settings menu entry**
  Spicy Lyrics Settings now uses the Spicy Lyrics logo and appears more consistently in Spotify's profile menu.

- **Less sidebar stutter**
  Reduced stutter during lyrics scrolling and in the Now Playing sidebar, including pinned credits and dynamic backgrounds.

## v100.10.48

- **Updated to be inline with 6.3.142**

### Pixel Edition changes

- **Settings and update design switch**
  Added New Settings and Update Design in Appearance. One switch controls settings, update dialogs, and update notifications together, and is enabled by default. Disable it for classic neutral styling. Both settings styles keep the Spicy Lyrics header, logo, and larger title, with a white logo in classic mode.

- **Lyric highlights after seeking**
  Fixed stale word and letter highlights after seeking or changing lines, including Simple Lyrics Mode. Fixed a lyric-rendering failure when font readiness cannot be checked.

- **Settings dialog layering**
  Fixed settings appearing behind other interface elements.

## v100.10.47

- **Updated to be inline with 6.3.98**

### Pixel Edition fixes

- **Automatic update checks**
  Checks the selected build channel's version file every five minutes. Choosing Update reloads Spotify to load the new version. Fixed-version channels stay pinned.

- **Clearer update prompts**
  The wider post-update prompt shows patch notes for Pixel Edition upgrades and a visible "New to Pixel Edition?" button. Available updates use the new notice design.

- **Credits in popout windows**
  Pinned community credits appear in Cinema and Picture-in-Picture while profile details load.

- **Smoother lyrics and loading**
  The expanded Now Playing lyrics card changes size more smoothly. Loading skeletons align with lyrics in sidebar, compact, fullscreen, and Picture-in-Picture views.

- **Less interface stutter**
  Lyrics, Spotify scrolling, and dynamic Now Playing backgrounds trigger less page restyling across Default, Pixel, and Custom animator presets.

## v100.10.46

- **Updated to be inline with 6.3.50**

### Pixel Edition fixes

- **Fixed doubled and ghosted lyrics**
  Active syllable lyrics no longer draw a second copy of the text behind moving words.

- **Lyrics finish loading in popout windows**
  Cinema and Picture-in-Picture reveal lyrics and finish their loading transitions even when the main Spotify window is hidden or minimized.

- **Settings stay within reach**
  Tabs and search stay pinned while settings scroll. Changing tabs or searching returns the content to the top, and every settings tab has 36px of scrollable space below the footer.

- **Restored the settings menu entry**
  Open Spicy Lyrics Settings directly from Spotify's menu.

### How the upstream update fits Pixel Edition

- **Scrolling, animation, and Gravity**
  Upstream scrolling and animation changes are integrated with Default, Pixel, and Custom animator presets. Seek fade-in compensation also applies when clicking lyrics in Gravity mode.

- **Controls in the existing settings layout**
  Scrolling and seek controls live in Lyrics, and the Spotify lyrics-button option lives in Interface. The new controls support settings search and hiding.

- **Skeleton and spinner use the same loading flow**
  Both presentations keep the fork's queued and offline messages, track-change handling, and popout fixes. Switching the loading style during a fetch keeps the current loading state.

- **TTML and alternate lyric sources**
  Romanization spacing and background-vocal fixes are applied to the fork's TTML support. Your source priority, local TTML, and experimental word splitting are retained; alternate providers can still supply lyrics when the primary source is queued.

- **Fullscreen and backgrounds**
  Upstream fullscreen fixes respect the fork's Escape settings and optional closing animation. Progressive artwork loading uses the existing background modes and artwork fallbacks.

- **Recovery follows your build channel**
  Startup recovery supports custom channel hosts. Pinned channels keep their selected version, and official outage notices apply only to official channels. Existing Pixel installations continue loading the fork.

## v100.10.45

### Performance

- **Less lag with lyrics open**
  Reduced the rendering work that lyrics add when adjusting Spotify's volume and interacting with the player.

- **Smoother fullscreen volume dragging**
  Fullscreen and Cinema View volume sliders respond more smoothly, keep controls steady during dragging, and apply the final selected volume when released.

### Cinema and Picture-in-Picture

- **Lyrics stay visible when Spotify is hidden**
  Fixed lyrics disappearing from the Cinema Lyrics Window or Picture-in-Picture when the main Spotify window is hidden or minimized.

### Cover art

- **Better artwork fallback**
  Tracks with missing image sizes or labels now use available track, album, or podcast artwork instead of unnecessarily showing a placeholder.

## v100.10.44

### Upstream

- **Updated to upstream 6.3.20**
  Includes the latest upstream lyric handling, cache, and display changes.

### Cinema Lyrics Window

- **More reliable popout opening and closing**
  Closing the Cinema Lyrics Window while it is opening now cancels the pending setup. Switching to the main lyrics page or Picture-in-Picture transfers the view cleanly. A temporary rendering error no longer stops lyric updates.

- **Cover art no longer animates over itself**
  Opening Cinema no longer crossfades a track's cover art into the same image. Normal cover transitions still play when the track artwork changes.

### Lyrics and animation

- **Romanized-only lyrics remain visible**
  Lyrics that contain only a romanized form are kept and displayed instead of being removed as empty lines.

- **Gravity mode mounts after lyrics render**
  Space Gravity now waits for the lyric view to mount before taking over its layout.

### Animator presets

- **Preset sharing and clipboard actions fixed**
  Saved animator presets copy, import, and share without dropping their settings.

### Settings

- **Browser profile option**
  Add a browser profile in advanced settings and open community profiles with it.

## v100.10.43

- **Updated to upstream 6.3.15**

### Update popup

- **Patch notes after an update**
  The update popup now loads every patch-note entry between the installed and previous versions, with a scrollable reading area for larger updates.

- **Pixel Edition walkthrough**
  Updates from outside the 100.10 release series include a link to the Pixel Edition feature walkthrough.

### Settings

- **Settings sections reorganized**
  Appearance, Effects, Sources, and Advanced settings now appear in clearer sections with search and keyboard navigation. The panel has a pinned footer, tighter sizing, and a wider source manager.

- **Hide settings controls refined**
  Hidden settings filter correctly, protected controls stay available, and visual experiments can be hidden from the main panel.

### Lyric animation

- **Animator presets**
  Choose Default, Pixel, or Custom behavior. Custom presets can be edited, saved, loaded, shared, and imported. Default matches upstream animation behavior while Pixel keeps Spicy Lyrics behavior.

- **Smoother lyric transitions**
  Lyrics position before they reveal. Lines ending at the same time now finish their animation instead of leaving one line raised. The existing low-frame-rate flash protection remains in place.

- **Comma spacing**
  Lyric commas now keep correct spacing, including Unicode punctuation.

### Lyrics view

- **Refined view controls**
  Fullscreen controls have updated glass styling, wrapping, hover behavior, opacity, positioning, and rounded edges.

- **Credit reveals fixed**
  Community credit details load asynchronously and fade in place. Pinned provider and writer credits remain visible correctly.

- **Other fixes**
  The local TTML database back button now returns correctly. Source credits distinguish automatic splitting from provider-supplied timing.

## v100.10.42

### Reliability

- **Recover from damaged settings and cache data**
  Invalid settings, interface state, and cache records no longer block startup or lyric fetching. Valid stored fields remain intact when missing or incompatible fields are repaired.

- **Keep animation loops alive**
  Interval-driven UI no longer creates duplicate loops after a restart. A callback failure no longer freezes later updates.

- **Prevent stale lyrics after database changes**
  Deleting local TTML while changing tracks no longer applies results to the wrong song. Old database errors also clear when the track list becomes empty.

### Artwork

- **Prevent stale cover art**
  Rapid track changes no longer allow an older artwork request to replace the current cover. Repeated loads share pending requests, expired entries refresh correctly, and failed blob conversions fall back to the original image URL.

### Playback controls

- **Fix interrupted volume drags**
  Fullscreen and Cinema volume controls now release correctly after pointer cancellation, touch cancellation, window blur, or teardown. Right-clicks and horizontal-only wheel input no longer change volume.

- **Fix interrupted and duplicate seeks**
  Timeline drags now release their control lock after cancellation or blur, stop when the track changes, and avoid sending the same seek twice. Invalid timing and zero-width timelines are ignored.

## v100.10.41

- **Pinned Lyrics Footer**
  Appearance now has Off, No Writers, and Full modes. No Writers pins source and community credits while writers scroll at lyric end.

- **Experimental splitting labels**
  Lyrics sources now show compact `(+ extra splits)` and `(+ experimental splitting)` labels.

- **Space Gravity active-line control**
  Fixed the active-line arrow remaining visible after leaving Space Gravity mode.

- **Playback progress fallback**
  Playback progress now falls back to player state when local position updates stall.

## v100.10.40

- **In-app community profiles**
  Contributor profiles now open directly inside Spotify instead of sending you to a browser. Fallback to browser if it fails to fetch the profile.

- **Build Channel controls redesigned**
  The Advanced settings section now places Build Channel at the top, with an inline branch dropdown and a Manage button.

- **Branch manager**
  Manage Branches now lists Stable, Beta, and all saved custom branches in one place. You can switch branches directly, see the active branch as Selected, add new branches, and remove custom branches.

- **Protected built-in branches**
  Stable and Beta remain available in the manager but cannot be removed.

- **Stable-plugin support**
  The entrypoint adds the same channel selector and branch manager to the upstream Stable plugin settings, without modifying the upstream plugin.

- **Safer Musixmatch fallback**
  Musixmatch results are rejected when they belong to the wrong track, preventing mismatched lyrics from appearing.

- **Lyric timing restored**
  Restored upstream lyric timing behavior.

- **Custom font improvements**
  Added a webfont source option and disabled synthetic font styling for more faithful custom-font rendering.

## v100.10.39

- **Updated to be inline with 6.3.12 to follow API changes**

- Add settings hiding, with a manager, restore controls, live edits, and search access.

- Remove the nonfunctional Timeline Outside Media Box option.

- Fixed brief white flash on next active lyric line during low frame rates.

- **Unique Word Filters**
  Added `Gibberish`, `all lowercase`, `ALL UPPERCASE`, and `Off`.

- **Settings layout**
  Moved Space Gravity and Unique Word Filters to top of Lyrics Display. Dropdowns now size left for longer options.

## v100.10.38

- Updated to be inline with 6.3.10

- **Split gibberish words**
  Space Gravity now separates gibberish lyrics into individual words.

## v100.10.37

- **Space Gravity Mode**
  Refined word physics, pacing, rotation, density, cover-art avoidance, control clearance, lyric seeking, credits, and overlapping-line highlighting.

- **Better word handling**
  Space Gravity now preserves generated-word, CJK, and TTML word boundaries. Fixed missing characters and romanization alignment.

- **DJ cover colours**
  Now Playing and fullscreen lyrics use DJ cover-art colours without canvas rendering. Fixed DJ release-year display.

- **Cinema and popup fixes**
  Cinema settings now close correctly. Stale popup buttons no longer remain after startup.

## v100.10.36

- **Space Gravity Mode**
  Improved word visibility, duet colours, instrumental endings, credits, cover avoidance, and switching mode without rebuilding lyrics.
  Line and static lyrics now use temporary word sync when Gravity needs it.

- **Instrumental dots**
  Restored smooth full dot animation and fade-out.

- **Lyric seek lead-in removed**
  Clicking lyrics now seeks at their exact timing point again.

- **Pinned credits**
  Improved final-lyric clearance and fade behavior.

- **Cinema**
  Cinema pop-out now disabled by default.

- **Scrollbar**
  Fixed hover visibility.

## v100.10.35

- **Space Gravity Mode**
  An Appearance option lets synced lyric words drift freely from their normal line positions. It supports instrumental dots, background vocals, duet colouring, cover-art avoidance, and persistent credits.

- **Experimental Apple Music word sync**
  Apple Music lyrics can split combined words and hyphenated phrases into timed words. Bracketed backing vocals are recognised as background vocals, and credits note when word splitting helped.

- **Pinned lyric credits**
  Experiments can keep credits and source information visible while scrolling, with enough room to reach final lyrics.

- **Lyric click lead-in**
  Clicking a lyric now seeks 400ms before its timing point for a smoother handoff.

- **Added Extra Glow On Active Line**
Added Extra Glow if hovering over active line

## v100.10.34

- **Stable playback timeline**
  Fullscreen playback progress stays on Spotify's live clock when Playback Offset changes.

- **Local TTML spaces**
  Locally uploaded TTML keeps word boundaries from spaces inside timed spans, including word-synced lyrics.

- **Experimental SliderBar wording**
  The experimental progress-bar setting now uses the upstream SliderBar name and description.

## v100.10.33

- **Updated for 6.3.0**
  Synced the fork with upstream 6.3.0 changes while retaining the fork's fullscreen volume placement options.

- **Fullscreen volume controls**
  Volume sliders now use the upstream volume icon inside a glass-style bar. Left, right, and below placements brighten on mouse activity, expand while hovered or dragged, and use matching thickness.

- **Rounded playback progress**
  The played portion of the fullscreen timeline now has rounded ends instead of a flat progress edge.

- **Experimental settings**
  Cinema Lyrics Window and Experimental Word Sync moved to Experiments. The Cinema setting now enables its playback-bar button directly and includes the DevTools help link. Popup Lyrics settings now describe their playback-bar button behavior.

## v100.10.32

- Updated to be inline with 6.2.4

## v100.10.31

### Features

- **Configurable lyrics-view cache button**
  Advanced settings can now show a cache button in lyrics controls. Choose whether it clears current-song caches, current state, or stored cache.

- **Tighter settings dropdowns**
  Settings dropdowns now resize to the selected option instead of reserving space for their longest option.

- **Faster multi-source lyric loading**
  Enabled lyric sources now start together while configured priority and Apple Music quality rules still choose the result.

- **Scroll to active lyric control**
  When the active lyric leaves the viewport, a directional button can bring it back into view. Enabled by default and configurable in settings.

- **Lyric-shaped loading preview**
  Lyrics now show a shimmer preview shaped from the first available lyric source while the final result is selected.

### Fixes

- **Stable lyric updates**
  Reloading lyrics or changing romanization keeps the current reading position instead of briefly jumping to the top. Lines ending at the same time no longer leave one line raised.

- **Local TTML romanization parsing**
  Locally uploaded TTML now reads nested romanization data.

- **Smoother lyric loading handoff**
  Loading previews now clear cleanly before the finished lyric view appears.
