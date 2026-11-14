import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "@nanostores/react";
import { $allowHidingSettings, $hideHidingIcon } from "../../../utils/stores.ts";
import AppearanceSection from "./AppearanceSection.tsx";
import DeveloperSection from "./DeveloperSection.tsx";
import EffectsSection from "./EffectsSection.tsx";
import InterfaceSection from "./InterfaceSection.tsx";
import LyricsSection from "./LyricsSection.tsx";
import SourcesSection from "./SourcesSection.tsx";
import Footer from "./Footer.tsx";
import CreditsSection from "./CreditsSection.tsx";
import { BugReportPane } from "./BugReportSection.tsx";
import { AboutIcon } from "./icons.tsx";
import { SearchBar, ShowHiddenSettingsInSearchContext } from "./components.tsx";
import { LyssnaSettingsIcons as SettingsIcons } from "./LyssnaSettingsIcons.tsx";
import DiscordCreditsSettings from "./DiscordCreditsSettings.tsx";
import { PopupModal } from "../../Modal.ts";

const TABS = [
  ["Appearance", "Appearance", SettingsIcons.Appearance],
  ["Lyrics", "Lyrics Display", SettingsIcons.Lyrics],
  ["Effects", "Effects", SettingsIcons.Effects],
  ["Layout", "Interface", SettingsIcons.Layout],
  ["Sources", "Sources", SettingsIcons.Sources],
  ["Advanced", "Advanced", SettingsIcons.Advanced],
  ["Credits", "Credits", AboutIcon],
] as const;

export type SettingsPanelState = { query: string; sectionFilter: string; scrollTop: number };
export default function SettingsPanel({ onOpenHiddenSettings, onManageAnimator, onManageBuildChannels, initialState, onStateChange }: { onOpenHiddenSettings?: () => void; onManageAnimator?: (state: SettingsPanelState) => void; onManageBuildChannels?: () => void; initialState?: SettingsPanelState; onStateChange?: (state: SettingsPanelState) => void }) {
  const [query, setQuery] = useState(initialState?.query ?? "");
  const initialTab = initialState?.sectionFilter === "TTML Reviewer" ? "Sources" : initialState?.sectionFilter ?? "Appearance";
  const [sectionFilter, setSectionFilter] = useState<string>(TABS.some(([, tab]) => tab === initialTab) || initialTab === "Got a Bug?" ? initialTab : "Appearance");
  const previousTab = useRef(sectionFilter === "Got a Bug?" ? "Appearance" : sectionFilter);
  const allowHidingSettings = useStore($allowHidingSettings);
  const hideHidingIcon = useStore($hideHidingIcon);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [marker, setMarker] = useState({ x: 0, width: 0 });
  const searching = Boolean(query.trim());

  useLayoutEffect(() => {
    const update = () => {
      const tab = tabRefs.current[TABS.findIndex(([, value]) => value === sectionFilter)];
      setMarker(tab && !searching ? { x: tab.offsetLeft, width: tab.offsetWidth } : { x: 0, width: 0 });
    };
    update();
    const observer = new ResizeObserver(update);
    if (tabsRef.current) observer.observe(tabsRef.current);
    return () => observer.disconnect();
  }, [sectionFilter, searching]);

  useLayoutEffect(() => {
    const targetWindow = scrollRef.current?.ownerDocument.defaultView ?? window;
    const frame = targetWindow.requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = initialState?.scrollTop ?? 0;
    });
    return () => targetWindow.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    onStateChange?.({ query, sectionFilter, scrollTop: 0 });
  }, [onStateChange, query, sectionFilter]);

  const selectTab = (tab: string) => {
    if (sectionFilter !== "Got a Bug?") previousTab.current = sectionFilter;
    setSectionFilter(tab);
    setQuery("");
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const key = event.key;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) return;
    event.preventDefault();
    const next = key === 'Home' ? 0 : key === 'End' ? TABS.length - 1 : (index + (key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    selectTab(TABS[next][1]);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="llm ll-sp-panel ll-sp-panel--settings">
      <div className="ll-sp-settings-header">
        <div className="ll-settings-heading">
          <h2><span aria-hidden="true">{SettingsIcons.General}</span>Lyssna Lyrics settings</h2>
          <SearchBar value={query} onChange={(value) => {
            setQuery(value);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }} />
          <button className="ll-settings-close" type="button" aria-label="Close settings" onClick={() => PopupModal.hide()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>
        </div>
        <div className="ll-sp-tabs" ref={tabsRef} role="tablist" aria-label="Settings categories" aria-orientation="horizontal">
        <span className="ll-settings-tab-marker" aria-hidden="true" style={{ transform: `translateX(${marker.x}px)`, width: marker.width, opacity: marker.width ? 1 : 0 }} />
        {TABS.map(([label, tab, icon], index) => <button
          key={tab}
          ref={(element) => { tabRefs.current[index] = element; }}
          className={`ll-sp-tab${sectionFilter === tab && !searching ? " ll-sp-tab--active" : ""}`}
          role="tab"
          type="button"
          aria-selected={sectionFilter === tab && !searching}
          tabIndex={(sectionFilter === tab && !searching) || (index === 0 && (searching || !TABS.some(([, value]) => value === sectionFilter))) ? 0 : -1}
          id={`ll-settings-tab-${tab.replaceAll(" ", "-")}`}
          aria-controls="ll-settings-content"
          onClick={() => selectTab(tab)}
          onKeyDown={(event) => onTabKeyDown(event, index)}
        ><span className="ll-sp-tab-icon" aria-hidden="true">{icon}</span>{label}</button>)}
        </div>

      </div>

      <div className="ll-sp-settings-scroll" ref={scrollRef}>
        <div className="ll-sp-settings-content">
          <div className="ll-sp-settings-main">
            <ShowHiddenSettingsInSearchContext.Provider value={searching}>
              <div id="ll-settings-content" role={searching || !TABS.some(([, tab]) => tab === sectionFilter) ? "region" : "tabpanel"} aria-label={searching ? "Search results" : sectionFilter}>
                <AppearanceSection query={query} sectionFilter={searching ? "All" : sectionFilter} />
                <LyricsSection query={query} sectionFilter={searching ? "All" : sectionFilter} />
                <DiscordCreditsSettings query={query} sectionFilter={searching ? "All" : sectionFilter} />
                <EffectsSection query={query} sectionFilter={searching ? "All" : sectionFilter} onManageAnimator={() => onManageAnimator?.({ query, sectionFilter, scrollTop: scrollRef.current?.scrollTop ?? 0 })} />
                <InterfaceSection query={query} sectionFilter={searching ? "All" : sectionFilter} />
                <SourcesSection query={query} sectionFilter={searching ? "All" : sectionFilter} />
                <DeveloperSection query={query} sectionFilter={searching ? "All" : sectionFilter} onOpenHiddenSettings={onOpenHiddenSettings ?? (() => {})} onManageBuildChannels={onManageBuildChannels} />
                {(sectionFilter === "Got a Bug?" || (searching && /bug|report|lag|slow|performance/i.test(query))) && <BugReportPane onBack={() => selectTab(previousTab.current)} />}
                {(sectionFilter === "Credits" || (searching && /credit|lyssna|spicy|standalone/i.test(query))) && <CreditsSection />}
              </div>
            </ShowHiddenSettingsInSearchContext.Provider>
          </div>
          <Footer onReportBug={() => selectTab("Got a Bug?")} reportBugActive={sectionFilter === "Got a Bug?"} />
          <div className="ll-settings-utilities" aria-label="Settings tools">
            {allowHidingSettings && <button type="button" aria-pressed={!hideHidingIcon} onClick={() => $hideHidingIcon.set(!hideHidingIcon)}>Hide settings</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
