import React from "react";
import { flushSync } from "react-dom";
import ReactDOM from "react-dom/client";
import { $experiment } from "../../utils/experiments.ts";

import { LYSSNA_MICROPHONE_PATHS } from "../../brand.ts";
const BrandMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {LYSSNA_MICROPHONE_PATHS.map(d => <path key={d} fill="none" d={d} />)}
    <circle cx="16" cy="7" r="5" fill="none" />
  </svg>
);

export const NoticeLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a className="sl-notice-link" href={href} target="_blank" rel="noreferrer">
    {children}
  </a>
);

export type NoticeOptions = {
  title: string;
  content: React.ReactElement<{ style?: React.CSSProperties }>[];
  primary: { label: string; onClick: () => void };
  extraActions?: { label: string; onClick: () => void; className?: string }[];
  secondaryLabel: string;
  wide?: boolean;
  /** Escape, a backdrop click, and the secondary button all land here. */
  onDismiss?: () => void;
  /** A box the dialog grows out of, like the toast that opened it. */
  origin?: DOMRect | null;
};

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const centerOf = (rect: DOMRect, width = rect.width) => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
  width,
});

let closeActive: ((immediate?: boolean) => void) | null = null;

export function showNotice({ title, content, primary, extraActions, secondaryLabel, wide, onDismiss, origin }: NoticeOptions) {
  closeActive?.(true);

  const host = document.createElement("div");
  // body > div without an id or class is hidden by a global rule.
  host.className = "sl-notice-host";
  const root = ReactDOM.createRoot(host);
  const previousFocus = document.activeElement;
  let closed = false;
  const designStore = $experiment("newSettingsDesign");
  let unsubscribeDesign: (() => void) | undefined;
  let morphAnimation: Animation | undefined;
  // Only a press that starts and ends on the backdrop dismisses, so a text selection dragged outside doesn't.
  let pressedBackdrop = false;

  const close = (immediate = false) => {
    if (closed) return;
    closed = true;
    unsubscribeDesign?.();
    if (closeActive === close) closeActive = null;
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("focusin", onFocusIn);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    const remove = () => {
      root.unmount();
      host.remove();
    };
    if (immediate) return remove();
    overlay.classList.add("is-closing");
    overlay.classList.remove("is-open");
    setTimeout(remove, 200);
  };

  const dismiss = () => {
    if (closed) return;
    close();
    onDismiss?.();
  };

  // Listens on the document, not the overlay: Spotify can take focus after startup, and the keys must still work.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      // Keeps Spotify's own Escape shortcut from also firing.
      event.preventDefault();
      event.stopImmediatePropagation();
      dismiss();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...overlay.querySelectorAll<HTMLElement>("a[href], button")];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const current = document.activeElement as HTMLElement;
    if (event.shiftKey && (current === first || !focusable.includes(current))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (current === last || !focusable.includes(current))) {
      event.preventDefault();
      first.focus();
    }
  };

  const onFocusIn = (event: FocusEvent) => {
    if (!overlay.contains(event.target as Node)) primaryButton.focus({ preventScroll: true });
  };

  const stagger = (index: number) => ({ "--sl-i": index }) as React.CSSProperties;

  flushSync(() => {
    root.render(
      <div
        className="sl-notice-overlay"
        onPointerDown={(event) => (pressedBackdrop = event.target === event.currentTarget)}
        onClick={(event) => {
          if (pressedBackdrop && event.target === event.currentTarget) dismiss();
        }}
      >
        <div className={wide ? "sl-notice sl-notice--wide" : "sl-notice"} role="dialog" aria-modal="true" aria-labelledby="sl-notice-title" tabIndex={-1}>
          <div className="sl-notice-mark">
            <BrandMark />
          </div>
          <div className="sl-notice-heading" style={stagger(0)}>
            <p className="sl-notice-brand">
              <BrandMark />
              Lyssna Lyrics
            </p>
            <h2 className="sl-notice-title" id="sl-notice-title">
              {title}
            </h2>
          </div>
          {content.map((node, index) =>
            React.cloneElement(node, { key: index, style: { ...node.props.style, ...stagger(index + 1) } })
          )}
          <div className="sl-notice-actions" style={stagger(content.length + 1)}>
            {extraActions?.map((action) => (
              <button key={action.label} type="button" className={`sl-notice-button sl-notice-button--secondary ${action.className ?? ""}`} onClick={action.onClick}>
                <span>{action.label}</span>
              </button>
            ))}
            <button type="button" className="sl-notice-button sl-notice-button--quiet" onClick={dismiss}>
              {secondaryLabel}
            </button>
            <button
              type="button"
              className="sl-notice-button sl-notice-button--primary"
              onClick={() => {
                close();
                primary.onClick();
              }}
            >
              {primary.label}
            </button>
          </div>
        </div>
      </div>
    );
  });

  const overlay = host.firstElementChild as HTMLElement;
  const dialog = overlay.firstElementChild as HTMLElement;
  const primaryButton = overlay.querySelector<HTMLElement>(".sl-notice-button--primary")!;
  const syncDesign = () => {
    const enabled = designStore.get();
    overlay.classList.toggle("sl-notice-overlay--classic", !enabled);
    if (!enabled) morphAnimation?.cancel();
  };
  syncDesign();
  unsubscribeDesign = designStore.listen(syncDesign);
  document.body.append(host);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("focusin", onFocusIn);
  // Spotify blurs the page once while starting up, which drops focus to <body> without a focusin.
  overlay.addEventListener("focusout", (event) => {
    if (event.relatedTarget) return;
    setTimeout(() => {
      if (!closed && document.activeElement === document.body) primaryButton.focus({ preventScroll: true });
    });
  });
  overlay.getBoundingClientRect();
  overlay.classList.add("is-open");

  if (origin && designStore.get() && !reducedMotion.matches) {
    const from = centerOf(dialog.getBoundingClientRect(), dialog.offsetWidth);
    const to = centerOf(origin);
    morphAnimation = dialog.animate(
      [
        { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${to.width / from.width})`, opacity: 0 },
        { opacity: 1, offset: 0.35 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 420, easing: EASE_OUT }
    );
  }
  primaryButton.focus({ preventScroll: true });

  closeActive = close;
  return { close: () => close() };
}
