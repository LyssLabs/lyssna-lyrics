import { useStore } from "@nanostores/react";
import { $ttmlReviewer, getOtherLyricsExtensions, REVIEWER_EXPERIMENTS_OFF, REVIEWER_SETTINGS } from "../../../utils/ttmlReviewer.ts";
import { getExperiment } from "../../../utils/experiments.ts";

const LABELS: Record<string, string> = {
  playbackOffset: "Playback offset", seekFadeCompensation: "Seek fade-in compensation", scrollLeadEnabled: "Early scroll", smoothScrolling: "Smooth scrolling",
  animationFpsCapEnabled: "Frame-rate limit", rendererVisualStyle: "Renderer style", minimalLyricsMode: "Minimal lyrics", syllableMerge: "Join split words",
  lineHoverBackground: "Line hover background", duetLinePadding: "Wide duet padding", creditsFollowLastLine: "Credits follow the last singer", customFontEnabled: "Custom lyrics font",
  spaceGravityMode: "Space Gravity", memeFormat: "Word filters", animatorPreset: "Animator preset", enableExperimentalWordSync: "Experimental word sync",
  staticBackgroundMode: "Background", staticBackgroundBlur: "Background blur", showNpvDynamicBg: "Animated Now Playing background",
};

export function ReviewerPane({ onBack }: { onBack: () => void }) {
  const active = useStore($ttmlReviewer);
  const others = getOtherLyricsExtensions();
  return <div className="slm sl-reviewer-details">
    <button type="button" className="sl-sp-btn" onClick={onBack}>Back to Load TTML</button>
    <p>Reviewer mode saves your preferences before applying the profile below. When it stops, your original preferences return.</p>
    <dl className="sl-reviewer-modes">
      <dt>Off</dt><dd>Use your usual settings.</dd>
      <dt>Apply on Temp</dt><dd>Apply only while a file from Temporary Load is displayed. Resetting it, loading regular lyrics, or changing tracks restores your settings. Session and persistent loads use your usual settings.</dd>
      <dt>Always Apply</dt><dd>Apply to all lyrics until you choose another mode.</dd>
    </dl>
    <p role="status">Review profile: {active ? "active" : "inactive"}.</p>
    {others.length > 0 && <p className="sl-sp-banner">{others.join(" and ")} can still change lyrics. Reviewer mode does not change other extensions.</p>}
    <h3>What changes</h3>
    <dl className="sl-reviewer-values">
      {REVIEWER_SETTINGS.map(({ key, shown }) => <div key={key}><dt>{LABELS[key] ?? key}</dt><dd>{shown}</dd></div>)}
      <div><dt>Per-song offsets</dt><dd>Ignored</dd></div>
      {REVIEWER_EXPERIMENTS_OFF.map(id => getExperiment(id)).filter(experiment => !experiment.hidden).map(experiment => <div key={experiment.id}><dt>{experiment.label}</dt><dd>{experiment.forceState === true ? "Forced on" : "Off"}</dd></div>)}
      <div><dt>Other experiments</dt><dd>Default</dd></div>
    </dl>
  </div>;
}
