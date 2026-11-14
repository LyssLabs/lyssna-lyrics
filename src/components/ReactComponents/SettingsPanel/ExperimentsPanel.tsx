import { useStore } from "@nanostores/react";
import { $experiment, forcedExperimentState, getAdvancedExperiments, getVisibleExperiments, setExperiment, type ExperimentId, type ResolvedExperiment } from "../../../utils/experiments.ts";
import { $enableExperimentalWordSync, $externalCinemaLyricsAllowed } from "../../../utils/stores.ts";
import { Row, SectionTitle, Toggle } from "./components.tsx";
import { EXPERIMENT_CATEGORIES } from "../../../utils/experiments.ts";
import { $ttmlReviewer, REVIEWER_LOCK_REASON } from "../../../utils/ttmlReviewer.ts";

const experimentSettingIds: Partial<Record<ExperimentId, string>> = {
  newProgressBarStyling: "appearance-sliderbar-styling",
  lyricsSkeleton: "lyrics-loading-skeleton",
};

/**
 * The Experiments sub-panel. Renders straight off the EXPERIMENTS registry, so a
 * new experiment shows up here the moment it's added to `utils/experiments.ts`.
 */
export default function ExperimentsPanel({ experimentIds, advancedOnly = false, showBuiltIn = true }: { experimentIds?: readonly ExperimentId[]; advancedOnly?: boolean; showBuiltIn?: boolean }) {
  return <div style={{ padding: "8px 0" }} className="llm w-40">
    <p className="ll-sp-experiments-note">These features are still being shaped. Toggle one off if you prefer how things worked before.</p>
    <ExperimentSettings experimentIds={experimentIds} advancedOnly={advancedOnly} showBuiltIn={showBuiltIn} />
  </div>;
}

export function ExperimentSettings({ title = false, experimentIds, advancedOnly = false, showBuiltIn = true }: { title?: boolean; experimentIds?: readonly ExperimentId[]; advancedOnly?: boolean; showBuiltIn?: boolean }) {
  const experimentalWordSync = useStore($enableExperimentalWordSync);
  const externalCinemaLyricsAllowed = useStore($externalCinemaLyricsAllowed);
  const reviewerOn = useStore($ttmlReviewer);
  const experiments = reviewerOn ? [] : (advancedOnly ? getAdvancedExperiments() : getVisibleExperiments()).filter(exp => forcedExperimentState(exp.id) === undefined);

  return (
    <>
      {title && <SectionTitle>Experiments</SectionTitle>}
      {EXPERIMENT_CATEGORIES.map((category) => {
        const entries = experiments.filter((exp) => exp.category === category.id && (!experimentIds || experimentIds.includes(exp.id)));
        return entries.length > 0 && <div key={category.id}>
          {!experimentIds && <SectionTitle>{category.title}</SectionTitle>}
          {entries.map((exp) => <ExperimentRow key={exp.id} experiment={exp} />)}
        </div>;
      })}
      {showBuiltIn && <><Row
        label="Enable Cinema Lyrics Window"
        description="Show or hide the Cinema Lyrics button in the playback bar."
        labelAccessory={
          <a
            className="ll-sp-help-link"
            href="https://github.com/iPixelGalaxy/lyssna-lyrics/blob/dev/ENABLE_DEVTOOLS.md"
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
          >
            Help
          </a>
        }
      >
        <Toggle checked={externalCinemaLyricsAllowed} onChange={(v) => $externalCinemaLyricsAllowed.set(v)} />
      </Row>
      <Row settingId="lyrics-experimental-word-sync" label="Experimental Word Sync" description="Estimate word sync for line or static lyrics.">
        <Toggle checked={experimentalWordSync} onChange={(v) => $enableExperimentalWordSync.set(v)} />
      </Row></>}
    </>
  );
}

function ExperimentRow({ experiment }: { experiment: ResolvedExperiment }) {
  const store = $experiment(experiment.id);
  const enabled = useStore(store);
  const forced = forcedExperimentState(experiment.id);
  const heldByReviewer = useStore($ttmlReviewer);

  return (
    <Row settingId={experimentSettingIds[experiment.id]} label={experiment.label} description={experiment.description} disabled={heldByReviewer || forced !== undefined} disabledReason={heldByReviewer ? REVIEWER_LOCK_REASON : forced ? "Forced on" : "Forced off"}>
      <Toggle checked={enabled} onChange={(v) => setExperiment(experiment.id, v)} />
    </Row>
  );
}
