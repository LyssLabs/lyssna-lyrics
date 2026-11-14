# Upstream 6.5.0 merge and performance review

Baseline: `ce0c471` on `dev`. Upstream: `a3adb8078dae2639c14d1aa6e9ec14086a156f11`, tagged `6.5.0`. Merge commit: `c299c4f`.

The two existing local commits remain in history. This is a development merge, with no version bump, release, push, or GitHub Actions run.

## Merge decisions

The merge brings in Bloom rendering, lyric sizing, romanization rows and spelling updates, syllable joining and pacing, unsynced auto-scroll, per-song offsets, queue and grouped controls, animated artwork, music-reactive backgrounds, bug reports, and TTML Reviewer mode.

The fork keeps its loader and release version, alternate lyric sources, animator presets, custom fonts, word filters, gravity renderer, pinned footer, settings navigation, volume placement, release-year display, and external Cinema window support. Upstream's equivalent footer and year controllers do not run alongside the fork's controllers. Background rendering stays on one callback per canvas in its owning window; the incoming global rendering callback was consolidated into that existing path.

Upstream's removed TTML parser was not restored. Its relevant fixes were ported into the fork's DOM parser: nonbreaking spaces, invalid syllable ends, and romanized word boundaries. Temporary uploads retain their source TTML when settings or spelling change. The incoming standalone scroll-target check was excluded to follow the repository's no-tests instruction.

## Performance findings

### Settled lyrics kept processing springs

The baseline syllable animator calls its settling routine for mounted sung lines even after `Settling` becomes false. This visits word and letter springs and builds style values every frame despite their resting state.

The unconditional settling path goes back to `f2825b4`. The larger upstream imports increased the work around it: `499ab0d` imported smooth scrolling with a hold of up to 40 mounted rows, and `3188908` restored the refreshed renderer and its additional letter effects. These are credible amplification mechanisms, not proof that either release caused the complaints.

The animator now skips a sung line after its springs settle. State changes and playback jumps still wake it. Overlapping lines finish their own springs before sleeping.

### Full pinned-footer geometry was measured during scrolling

The virtualizer calls `_updatePinnedFooterLayout` from its window-update path. Full footer mode reads two bounding rectangles, scroll dimensions, and computed margins after row positioning. A smooth glide can revisit this path every frame, even though scrolling does not change the footer layout.

The layout is now cached by viewport dimensions, footer size and mode, and lyric measurements. Resize notifications, remeasurement, trailing-content changes, and teardown invalidate the cache. The geometry also compensates for the glide's fractional translation. Unchanged row transforms and container heights are no longer assigned again.

### Scroll initialization discarded listener identities

`InitializeScrollEvents` replaced handler references before trying to remove previous handlers. Those removals used the new functions, so repeated initialization could retain old wheel and touch handlers. Normal apply paths often cleaned up first already; this is lifecycle hardening rather than a confirmed cause of widespread lag.

Initialization now cleans up before replacing its references.

## Verification and limits

`bun run build -test Y:\website` passed before the merge and after the final source changes. The final bundle transforms 335 modules and is copied as `Y:\website\spicy-lyrics@100.10.0.mjs`.

A separate TypeScript compilation emitted JavaScript for both the baseline and current source. Comparing source diagnostics found no newly introduced diagnostic messages. The repository still has existing compiler diagnostics, including the duplicate modal `title`, the legacy ReactDOM fallback, and existing tuple/type declarations; this is not a clean TypeScript type-check claim.

No tests were added or run. Spotify was not running during this session, so there is no live playback trace, measured FPS improvement, or visual acceptance result. The performance changes remove source-confirmed redundant work; identifying the complaints' dominant cause still requires an affected playback recording. The new bug-report pane can include recent smoothness and settings information.
