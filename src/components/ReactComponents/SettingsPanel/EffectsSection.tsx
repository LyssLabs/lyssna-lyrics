import { useStore } from "@nanostores/react";
import React from "react";
import { $allowHidingSettings, $hiddenSettingIds, $rendererVisualStyle } from "../../../utils/stores.ts";
import { $animatorPreset, ANIMATOR_PRESETS, ANIMATOR_PRESET_LABELS, type AnimatorPreset } from "../../../utils/Lyrics/Animator/Tuning.ts";
import { matches, Row, SettingsSection, Select } from "./components.tsx";
import { ExperimentSettings } from "./ExperimentsPanel.tsx";
import { $ttmlReviewer } from "../../../utils/ttmlReviewer.ts";

export default function EffectsSection({ query, sectionFilter, showHidden = false, onManageAnimator }: { query: string; sectionFilter: string; showHidden?: boolean; onManageAnimator?: () => void }) {
  const allowHidingSettings = useStore($allowHidingSettings);
  const hiddenIds = useStore($hiddenSettingIds);
  const renderer = useStore($rendererVisualStyle);
  const animatorPreset = useStore($animatorPreset);
  const reviewer = useStore($ttmlReviewer);
  if (reviewer) return null;
  if (sectionFilter !== "All" && sectionFilter !== "Lyrics Display") return null;
  const visible = (id: string) => showHidden ? hiddenIds.includes(id) : !allowHidingSettings || !hiddenIds.includes(id) || Boolean(query.trim());
  const animator = renderer === "spring" && visible("effects-animator-presets") && matches(query, "Animator Presets", "Choose Lyssna, Spicy, or Custom animation.");
  const backingVocals = renderer === "bloom" && visible("lyrics-background-vocals") && matches(query, "Background Vocal Pop-Out", "Reveal tagged backing vocals while their group plays.");
  if (!animator && !backingVocals) return null;
  return <SettingsSection title="Effects">
    {animator && <Row settingId="effects-animator-presets" label="Animator Presets" description="Choose Lyssna, Spicy, or Custom animation."><span style={{ display: "flex", gap: 8, alignItems: "center" }}><Select value={animatorPreset} options={[...ANIMATOR_PRESETS]} labels={ANIMATOR_PRESETS.map(preset => ANIMATOR_PRESET_LABELS[preset])} onChange={value => $animatorPreset.set(value as AnimatorPreset)} />{animatorPreset === "Custom" && onManageAnimator && <button className="ll-sp-btn" type="button" onClick={onManageAnimator}>Manage</button>}</span></Row>}
    {backingVocals && <ExperimentSettings experimentIds={["backgroundLinePop"]} showBuiltIn={false} />}
  </SettingsSection>;
}
