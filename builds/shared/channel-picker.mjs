export const CHANNEL_PICKER_STYLES = `
  .lyssna-channel-picker{position:relative;display:inline-flex;min-width:0;max-width:240px;flex:0 1 auto;}
  .lyssna-channel-picker-button{display:inline-flex;align-items:center;justify-content:space-between;gap:16px;min-width:128px;max-width:240px;min-height:32px;padding:0 12px;border:1px solid #ffffff26;border-radius:8px;background:#ffffff0d;color:inherit;font:inherit;font-size:13px;cursor:pointer;}
  .lyssna-channel-picker-value{display:grid;min-width:0;text-align:left;}
  .lyssna-channel-picker-value>span{grid-area:1/1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .lyssna-channel-picker-value>span:not([data-current]){visibility:hidden;}
  .lyssna-channel-picker-chevron{flex-shrink:0;opacity:.8;pointer-events:none;}
  .lyssna-channel-listbox{position:fixed;inset:auto;margin:0;padding:4px;box-sizing:border-box;min-width:0;max-width:calc(100vw - 16px);border:1px solid #ffffff26;border-radius:8px;background:#282828;color:#f1f1f1;box-shadow:0 8px 24px #0008;overflow-y:auto;overscroll-behavior:contain;list-style:none;z-index:1000000;font:13px/1.4 var(--encore-body-font-stack,var(--fallback-fonts,sans-serif));}
  .lyssna-channel-listbox[hidden]{display:none;}
  .lyssna-channel-option{display:grid;grid-template-columns:minmax(0,1fr) 12px;align-items:center;gap:12px;min-height:30px;padding:0 8px;border-radius:4px;cursor:pointer;}
  .lyssna-channel-option>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .lyssna-channel-option[data-active]{background:#ffffff18;color:#fff;}
  .lyssna-channel-option-check{visibility:hidden;}
  .lyssna-channel-option[aria-selected="true"] .lyssna-channel-option-check{visibility:visible;}
  .lyssna-channel-picker[data-theme="sl"] .lyssna-channel-picker-button{height:30px;min-height:30px;padding:0 10px 0 12px;border:0;border-radius:var(--radius-sm,8px);background:var(--accent-tint-bg,#dac4ff14);box-shadow:inset 0 0 0 1px var(--hairline,#d9c4ff26);color:var(--color-text-primary,#ddcefa);font-size:var(--text-caption-size,13px);font-weight:var(--w-medium,500);}
  .lyssna-channel-picker[data-theme="sl"] .lyssna-channel-picker-button:is(:hover,[aria-expanded="true"]){background:var(--accent-tint-bg-hover,#c8aaff22);box-shadow:inset 0 0 0 1px var(--hairline-strong,#d9c4ff33);}
  .lyssna-channel-picker[data-theme="sl"] .lyssna-channel-picker-chevron{color:var(--color-text-secondary,#bdafd4);}
  .lyssna-channel-listbox[data-theme="sl"]{background:var(--sl-sp-field-deep,#1d1830);border:0;box-shadow:inset 0 0 0 1px var(--hairline-strong,#d9c4ff33),0 14px 36px #0008;border-radius:var(--radius-md,8px);color:var(--color-text-secondary,#bdafd4);font-size:var(--text-caption-size,13px);}
  .lyssna-channel-listbox[data-theme="sl"] .lyssna-channel-option{font-weight:var(--w-medium,500);}
  .lyssna-channel-listbox[data-theme="sl"] .lyssna-channel-option:is([data-active],[aria-selected="true"]){color:var(--color-text-primary,#ddcefa);}
  .lyssna-channel-listbox[data-theme="sl"] .lyssna-channel-option[data-active]{background:var(--accent-tint-bg-hover,#c8aaff22);}
  .lyssna-channel-picker[data-theme="spotify"] .lyssna-channel-picker-button{min-height:32px;border:0;border-radius:4px;background:var(--background-tinted-base,#333);color:var(--text-base,#fff);font-size:14px;}
  .lyssna-channel-picker[data-theme="spotify"] .lyssna-channel-picker-button:hover{background:var(--background-tinted-highlight,#3e3e3e);}
  .lyssna-channel-listbox[data-theme="spotify"]{border:0;border-radius:4px;background:var(--background-elevated-base,#282828);color:var(--text-base,#fff);box-shadow:0 16px 24px #0006,0 6px 8px #0005;font-size:14px;}
  .lyssna-channel-listbox[data-theme="spotify"] .lyssna-channel-option{min-height:40px;border-radius:2px;}
  .lyssna-channel-listbox[data-theme="spotify"] .lyssna-channel-option[data-active]{background:var(--background-tinted-highlight,#ffffff1a);}
  .lyssna-channel-listbox[data-theme="spotify"] .lyssna-channel-option[aria-selected="true"]{color:var(--text-positive,#1ed760);}
`;

export function createChannelPicker({ id, theme, options, value, onSelect }) {
  const wrap = document.createElement("span");
  wrap.className = "lyssna-channel-picker";
  wrap.dataset.theme = theme;
  const button = document.createElement("button");
  button.type = "button";
  button.id = id;
  button.className = `lyssna-channel-picker-button ${theme === "spotify" ? "x-settings-dropdown" : `${theme}-sp-select`}`;
  button.setAttribute("role", "combobox");
  button.setAttribute("aria-label", "Build Channel");
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-controls", `${id}-listbox`);
  const text = document.createElement("span");
  text.className = "lyssna-channel-picker-value";
  for (const name of options) {
    const span = document.createElement("span");
    span.textContent = name;
    if (name === value) span.dataset.current = "";
    else span.setAttribute("aria-hidden", "true");
    text.append(span);
  }
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.classList.add("lyssna-channel-picker-chevron");
  arrow.setAttribute("width", "10");
  arrow.setAttribute("height", "10");
  arrow.setAttribute("viewBox", "0 0 10 10");
  arrow.setAttribute("aria-hidden", "true");
  arrow.innerHTML = '<path d="M2 3.75 5 6.75 8 3.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  button.append(text, arrow);

  const list = document.createElement("ul");
  list.id = `${id}-listbox`;
  list.className = "lyssna-channel-listbox";
  list.dataset.theme = theme;
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Build Channel");
  list.setAttribute("popover", "manual");
  list.hidden = true;
  const nativePopover = typeof list.showPopover === "function";
  const selected = Math.max(0, options.indexOf(value));
  let active = selected, open = false, search = "", lastSearch = 0;
  let removalObserver;
  const items = options.map((name, index) => {
    const item = document.createElement("li");
    item.className = "lyssna-channel-option";
    item.id = `${id}-option-${index}`;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(index === selected));
    const label = document.createElement("span");
    label.textContent = name;
    item.append(label);
    const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    check.classList.add("lyssna-channel-option-check");
    check.setAttribute("width", "12");
    check.setAttribute("height", "12");
    check.setAttribute("viewBox", "0 0 12 12");
    check.setAttribute("aria-hidden", "true");
    check.innerHTML = '<path d="m2.5 6 2.25 2.25L9.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
    item.append(check);
    item.addEventListener("pointermove", () => { if (active !== index) setActive(index); });
    item.addEventListener("click", () => choose(index));
    list.append(item);
    return item;
  });

  function setActive(index) {
    items[active]?.removeAttribute("data-active");
    active = (index + options.length) % options.length;
    items[active].dataset.active = "";
    button.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  }
  function position() {
    const rect = button.getBoundingClientRect();
    const roomBelow = innerHeight - rect.bottom - 12, roomAbove = rect.top - 12;
    const above = roomBelow < Math.min(280, options.length * (theme === "spotify" ? 40 : 30) + 8) && roomAbove > roomBelow;
    list.style.width = `${Math.min(Math.max(rect.width, 160), innerWidth - 16)}px`;
    list.style.maxHeight = `${Math.max(32, Math.min(280, above ? roomAbove : roomBelow))}px`;
    list.style.left = `${Math.max(8, Math.min(rect.right - list.getBoundingClientRect().width, innerWidth - list.getBoundingClientRect().width - 8))}px`;
    list.style.top = `${above ? Math.max(8, rect.top - list.getBoundingClientRect().height - 4) : rect.bottom + 4}px`;
  }
  function cleanup() {
    open = false;
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-activedescendant");
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("pointerdown", onOutside, true);
    window.removeEventListener("resize", position);
    window.removeEventListener("scroll", onScroll, true);
    removalObserver?.disconnect();
    removalObserver = undefined;
  }
  function close(restoreFocus = false) {
    if (nativePopover && list.matches(":popover-open")) list.hidePopover();
    list.hidden = true;
    cleanup();
    if (restoreFocus && button.isConnected) button.focus({ preventScroll: true });
  }
  function choose(index) {
    close(true);
    if (options[index] !== value) onSelect(options[index]);
  }
  function show(index = selected) {
    list.hidden = false;
    if (nativePopover) list.showPopover();
    open = true;
    search = "";
    button.setAttribute("aria-expanded", "true");
    position();
    setActive(index);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("resize", position);
    window.addEventListener("scroll", onScroll, true);
    // Observe only while open so removing a settings panel cannot leave global handlers behind.
    removalObserver = new MutationObserver(() => { if (!button.isConnected) close(); });
    removalObserver.observe(document.body, { childList: true, subtree: true });
  }
  function onOutside(event) {
    if (!wrap.contains(event.target)) close();
  }
  function onScroll(event) {
    if (!list.contains(event.target)) close();
  }
  function onKeyDown(event) {
    if (event.key === "Tab") { close(); return; }
    if (event.key === "Escape") { event.preventDefault(); event.stopImmediatePropagation(); close(true); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Enter" || event.key === " ") choose(active);
      else setActive(event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : active + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      search = (Date.now() - lastSearch < 600 ? search : "") + event.key.toLocaleLowerCase();
      lastSearch = Date.now();
      const index = options.findIndex(name => name.toLocaleLowerCase().startsWith(search));
      if (index >= 0) setActive(index);
    }
  }
  list.addEventListener("beforetoggle", event => { if (event.newState === "closed") cleanup(); });
  button.addEventListener("click", () => open ? close() : show());
  button.addEventListener("keydown", event => {
    if (!open && ["ArrowDown", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      show(event.key === "ArrowUp" ? options.length - 1 : selected);
    }
  });
  wrap.append(button, list);
  return wrap;
}
