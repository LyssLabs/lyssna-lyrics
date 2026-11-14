import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@nanostores/react";
import { $allowHidingSettings, $hiddenSettingIds, $hideHidingIcon } from "../../../utils/stores.ts";
import { $ttmlReviewer, isHeldByReviewer, REVIEWER_LOCK_REASON } from "../../../utils/ttmlReviewer.ts";

export const HiddenSettingsContext = React.createContext(false);
export const ShowHiddenSettingsInSearchContext = React.createContext(false);
const SettingLabelContext = React.createContext<string | undefined>(undefined);

export function matches(query: string, label: string, description?: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return label.toLowerCase().includes(q) || (description ?? "").toLowerCase().includes(q);
}

export function Row({
  label,
  description,
  children,
  disabled,
  disabledReason,
  labelAccessory,
  stacked,
  settingId,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  labelAccessory?: React.ReactNode;
  stacked?: boolean;
  settingId?: string;
}) {
  const showHidden = useContext(HiddenSettingsContext);
  const showHiddenInSearch = useContext(ShowHiddenSettingsInSearchContext);
  const allowHidingSettings = useStore($allowHidingSettings);
  const hideHidingIcon = useStore($hideHidingIcon);
  const hiddenSettingIds = useStore($hiddenSettingIds);
  const reviewerOn = useStore($ttmlReviewer);
  const heldByReviewer = reviewerOn && !!settingId && isHeldByReviewer(settingId);
  if (heldByReviewer) {
    disabled = true;
    disabledReason = REVIEWER_LOCK_REASON;
  }
  if (disabled) return null;
  const isHidden = settingId && hiddenSettingIds.includes(settingId);
  if (settingId && isHidden && allowHidingSettings && !showHidden && !showHiddenInSearch) return null;
  const toggleVisibility = () => {
    if (!settingId) return;
    $hiddenSettingIds.set(isHidden ? hiddenSettingIds.filter((id) => id !== settingId) : [...hiddenSettingIds, settingId]);
  };
  return (
    <div
      className={`ll-sp-row ll-list-row${disabled ? " ll-sp-row--disabled" : ""}${stacked ? " ll-sp-row--stacked" : ""}`}
    >
      <div className="ll-sp-label-area">
        {settingId && settingId !== "advanced-hide-settings" && ((showHidden && isHidden) || (allowHidingSettings && !hideHidingIcon)) && (
          <button className="ll-sp-btn ll-sp-visibility-btn" onClick={toggleVisibility} aria-label={`${isHidden ? "Restore" : "Hide"} ${label}`} title={`${isHidden ? "Restore" : "Hide"} setting`}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M1.5 8s2.3-4 6.5-4 6.5 4 6.5 4-2.3 4-6.5 4-6.5-4-6.5-4Z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="1.8" stroke="currentColor" strokeWidth="1.4"/>{!isHidden && <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>}</svg>
          </button>
        )}
        <div className="ll-sp-label-wrap">
          <span className="ll-sp-label-line">
            <span className="ll-sp-label">{label}</span>
            {labelAccessory}
          </span>
          {description && <span className="ll-sp-description">{description}</span>}
        </div>
      </div>
      <div className="ll-sp-control">
        <fieldset disabled={disabled} style={{ display: "contents", padding: 0, margin: 0, border: 0 }}>
          <SettingLabelContext.Provider value={label}>{children}</SettingLabelContext.Provider>
        </fieldset>
      </div>
      {disabled && disabledReason && <div className="ll-sp-row-tooltip">{disabledReason}</div>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const label = useContext(SettingLabelContext);
  return (
    <label className="ll-sp-toggle">
      <input
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span className="ll-sp-toggle-track" />
    </label>
  );
}

export function Select({
  value,
  options,
  labels,
  onChange,
  disabled,
}: {
  value: string;
  options: string[];
  labels?: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <span className="ll-sp-select-wrap">
      <span className="ll-sp-select-sizer" aria-hidden="true">
        {options.map((opt, i) => (
          <span key={opt}>{labels?.[i] ?? opt}</span>
        ))}
      </span>
      <select
        className="ll-sp-select"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        disabled={disabled}
      >
        {options.map((opt, i) => (
          <option key={opt} value={opt}>
            {labels?.[i] ?? opt}
          </option>
        ))}
      </select>
    </span>
  );
}

/**
 * Bipolar position slider — a snapping range control centred on a neutral
 * point with a negative axis to the left and a positive axis to the right.
 * The filled segment grows outward from the centre toward the thumb, so the
 * sign of the value is conveyed by the direction of the fill. Pass a
 * `defaultValue` to surface an inline Reset affordance.
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  defaultValue,
  unit,
  onChange,
  disabled,
  editable = false,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
  editable?: boolean;
}) {
  // Keep in sync with the thumb width in settings-panel.css.
  const THUMB = 16;
  const range = max - min || 1;
  const clamped = Math.min(max, Math.max(min, value));
  const frac = (clamped - min) / range;
  const isBipolar = min < 0 && max > 0;
  const zeroFrac = ((isBipolar ? 0 : min) - min) / range;

  // Position of a fraction along the track, compensating for the thumb width
  // so the fill and centre tick line up with the native thumb at both ends.
  const [editing, setEditing] = useState(false);
  const formatValue = (number: number) => String(Math.round(number * 10_000) / 10_000);
  const [draft, setDraft] = useState(formatValue(value));
  const posFor = (f: number) =>
    `calc(${(f * 100).toFixed(4)}% + ${((0.5 - f) * THUMB).toFixed(3)}px)`;

  const fillFrom = isBipolar ? Math.min(zeroFrac, frac) : 0;
  const fillSpan = isBipolar ? Math.abs(frac - zeroFrac) : frac;

  // A bipolar fill grows out of the centre tick. A one-sided fill must start at
  // the track's own left edge — anchoring it to the thumb's centre at `min` left
  // a bare stub of track to the left of the fill.
  const fillStyle = isBipolar
    ? {
        left: posFor(fillFrom),
        width: `calc(${(fillSpan * 100).toFixed(4)}% - ${(fillSpan * THUMB).toFixed(3)}px)`,
      }
    : { left: "0px", width: posFor(frac) };

  const sign = isBipolar && value > 0 ? "+" : "";
  const valueLabel = `${sign}${formatValue(value)}${unit ? ` ${unit}` : ""}`;
  const changed = defaultValue !== undefined && value !== defaultValue;
  const commit = () => { const next = Number(draft); if (Number.isFinite(next)) onChange(Math.round(next * 10_000) / 10_000); else setDraft(formatValue(value)); setEditing(false); };

  return (
    <div className={`ll-sp-slider${disabled ? " ll-sp-slider--disabled" : ""}`}>
      <div className="ll-sp-slider-track-wrap">
        <span className="ll-sp-slider-track" />
        <span className="ll-sp-slider-fill" style={fillStyle} />
        {isBipolar && <span className="ll-sp-slider-center" style={{ left: posFor(zeroFrac) }} />}
        <input
          type="range"
          className="ll-sp-slider-input"
          min={min}
          max={max}
          step={step}
          value={clamped}
          onChange={(e) => onChange(Number(e.currentTarget.value))}
          disabled={disabled}
        />
      </div>
      <div className="ll-sp-slider-meta">
        {editing ? <input className="ll-sp-slider-value-input" autoFocus value={draft} onChange={(event) => setDraft(event.currentTarget.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); if (event.key === "Escape") { setDraft(formatValue(value)); setEditing(false); } }} /> : <button type="button" className="ll-sp-slider-value" disabled={!editable} onClick={() => { setDraft(formatValue(value)); setEditing(true); }}>{valueLabel}</button>}
        {changed && (
          <button
            type="button"
            className="ll-sp-slider-reset"
            onClick={() => onChange(defaultValue!)}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="ll-sp-section-title">{children}</p>;
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="ll-settings-section" aria-label={title}>
    <h3 className="ll-sp-section-title">{title}</h3>
    <div className="ll-settings-group">{children}</div>
  </section>;
}

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="ll-sp-search-wrap">
      <svg
        className="ll-sp-search-icon"
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <line
          x1="9.5"
          y1="9.5"
          x2="13"
          y2="13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        className="ll-sp-search"
        type="text"
        aria-label="Search settings"
        placeholder="Search settings…"
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        spellCheck={false}
      />
      {value && (
        <button
          className="ll-sp-search-clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="1"
              y1="1"
              x2="9"
              y2="9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="9"
              y1="1"
              x2="1"
              y2="9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="ll-sp-tooltip-wrap">
      {children}
      <div className="ll-sp-tooltip-bubble">{text}</div>
    </div>
  );
}

export function FilterDropdown({
  sections,
  value,
  onChange,
}: {
  sections: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateCoords = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const targetWindow = btn.ownerDocument.defaultView ?? window;
    setCoords({
      top: rect.bottom + 6,
      right: targetWindow.innerWidth - rect.right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    const targetDocument = btnRef.current?.ownerDocument ?? document;
    const targetWindow = targetDocument.defaultView ?? window;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onReflow = () => updateCoords();
    targetDocument.addEventListener("mousedown", handler);
    targetWindow.addEventListener("resize", onReflow);
    targetWindow.addEventListener("scroll", onReflow, true);
    return () => {
      targetDocument.removeEventListener("mousedown", handler);
      targetWindow.removeEventListener("resize", onReflow);
      targetWindow.removeEventListener("scroll", onReflow, true);
    };
  }, [open, updateCoords]);

  const allOptions = ["All", ...sections];

  const portalTarget =
    open && btnRef.current
      ? (btnRef.current.ownerDocument.querySelector(
          "lyssna-lyrics-modal.LyssnaLyricsModal .ll-modal-overlay"
        ) as HTMLElement | null)
      : null;

  return (
    <div className={`ll-sp-filter-wrap${open ? " ll-sp-filter-wrap--open" : ""}`} ref={wrapRef}>
      <button
        ref={btnRef}
        className={`ll-sp-filter-btn${open ? " open" : ""}${value !== "All" ? " active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <svg
          className="ll-sp-filter-icon"
          width="13"
          height="12"
          viewBox="0 0 13 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1h11M3 5h7M5 9h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="ll-sp-filter-label">{value === "All" ? "Filter" : value}</span>
        <svg
          className={`ll-sp-filter-chevron${open ? " rotated" : ""}`}
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M2 3.5L5 6.5L8 3.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open &&
        coords &&
        portalTarget &&
        createPortal(
          <div
            ref={menuRef}
            className="ll-sp-filter-menu"
            role="listbox"
            style={{ position: "fixed", top: coords.top, right: coords.right }}
            onClick={(e) => e.stopPropagation()}
          >
            {allOptions.map((s) => {
              const isActive = value === s;
              return (
                <button
                  key={s}
                  role="option"
                  aria-selected={isActive}
                  className={`ll-sp-filter-item${isActive ? " ll-sp-filter-item--active" : ""}`}
                  onClick={() => {
                    onChange(s);
                    setOpen(false);
                  }}
                >
                  <span className="ll-sp-filter-item-check">
                    {isActive && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M1.5 5L4 7.5L8.5 2.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  {s}
                </button>
              );
            })}
          </div>,
          portalTarget
        )}
    </div>
  );
}
