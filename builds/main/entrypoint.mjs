// Built-in channel → [apiHost, storageHost, fixedVersion?] map
const CHANNEL_MAP = {
  Stable: ["ipixelgalaxy.com", "ipixelgalaxy.com"],
  Beta:   ["ipixelgalaxy.com", "ipixelgalaxy.com"],
};

const BUILT_IN_CHANNELS = Object.keys(CHANNEL_MAP);
const DEFAULT_API_HOST = CHANNEL_MAP.Stable[0];
const DEFAULT_STORAGE_HOST = CHANNEL_MAP.Stable[1];

const LS_PREFIX = "LyssnaLyrics-";
const CHANNELS_CHANGED_EVENT = "spicy-lyrics:channels-changed";
const lsGet = (key) => Spicetify.LocalStorage.get(`${LS_PREFIX}${key}`);
const lsSet = (key, value) => Spicetify.LocalStorage.set(`${LS_PREFIX}${key}`, value);

const usesNewSettingsDesign = () => {
  try {
    const raw = window.Spicetify?.LocalStorage?.get?.("SL:settings") ?? window.localStorage.getItem("SL:settings");
    const settings = JSON.parse(raw ?? "{}");
    return settings?.["experiment:newSettingsDesign"] !== false &&
      settings?.["experiment:newUpdatePromptDesign"] !== false;
  } catch {
    return true;
  }
};

const applySettingsDesign = (element, enabled = usesNewSettingsDesign()) => {
  element.classList.toggle("sle-classic", !enabled);
};

const syncSettingsDesign = () => {
  const enabled = usesNewSettingsDesign();
  for (const element of document.querySelectorAll(".sle-overlay, .sle-pill")) {
    applySettingsDesign(element, enabled);
  }
};

window.addEventListener("spicy-lyrics:settings-design-changed", syncSettingsDesign);
window.addEventListener("storage", (event) => {
  if (event.key === "SL:settings" || event.key === null) syncSettingsDesign();
});

// ─── Channel Storage Helpers ───

const isAllowedBuildHost = (host) => {
  try {
    const url = new URL(`https://${host}`);
    return !/(^|\.)(spicylyrics\.org|spikerko\.org)$/i.test(url.hostname) && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
};

const getCustomChannels = () => {
  try {
    const own = lsGet("customChannels");
    const raw = own ?? Spicetify.LocalStorage.get("SpicyLyrics-customChannels");
    if (raw) {
      const parsed = JSON.parse(raw);
      const clean = {};
      for (const [name, hosts] of Object.entries(parsed)) {
        if (name !== "Stable" && name !== "Beta" && Array.isArray(hosts) && (hosts.length === 2 || hosts.length === 3) && hosts.every(h => typeof h === "string") && isAllowedBuildHost(hosts[0]) && isAllowedBuildHost(hosts[1])) {
          clean[name] = hosts;
        }
      }
      if (own === null || own === undefined) {
        lsSet("customChannels", JSON.stringify(clean));
        const previous = Spicetify.LocalStorage.get("SpicyLyrics-buildChannel");
        if (previous && Object.hasOwn(clean, previous)) lsSet("buildChannel", previous);
      }
      return clean;
    }
  } catch (e) {
    console.warn("[Lyssna Lyrics] [Entry] Failed to parse custom channels:", e);
  }
  return {};
};

const saveCustomChannels = (channels) => {
  lsSet("customChannels", JSON.stringify(channels));
  window.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT));
};

const getFullChannelMap = () => ({ ...CHANNEL_MAP, ...getCustomChannels() });

const getCurrentChannel = () => { getCustomChannels(); return lsGet("buildChannel") ?? "Stable"; };

const setCurrentChannel = (name) => {
  lsSet("buildChannel", name);
  window.dispatchEvent(new Event(CHANNELS_CHANGED_EVENT));
};

const moveCustomChannel = (name, direction) => {
  const channels = getCustomChannels();
  const names = Object.keys(channels);
  const index = names.indexOf(name);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= names.length) return;
  [names[index], names[nextIndex]] = [names[nextIndex], names[index]];
  saveCustomChannels(Object.fromEntries(names.map((channelName) => [channelName, channels[channelName]])));
};

// ─── Style injection ───
// The entrypoint runs independently of the plugin bundle, so it injects its
// own stylesheet to ensure the panel and sl-* components are always styled.

const injectStyles = () => {
  if (document.getElementById("spicy-lyrics-entry-styles")) return;
  const style = document.createElement("style");
  style.id = "spicy-lyrics-entry-styles";
  style.textContent = `
    .SpicyLyricsSettingsOverlay{position:fixed;inset:0;z-index:9998;background:transparent;}
    .SpicyLyricsSettingsContainer{position:fixed;z-index:9999;background:rgba(46,46,46,.72);border:1px solid var(--hairline,rgba(255,255,255,.16));border-radius:var(--radius-md,12px);display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--liquid-cast-soft,0 18px 52px rgba(0,0,0,.42)),inset 0 1px 0 rgba(255,255,255,.08);-webkit-backdrop-filter:var(--material-regular-blur,blur(24px));backdrop-filter:var(--material-regular-blur,blur(24px));}
    .SpicyLyricsSettingsHeader{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--hairline,rgba(255,255,255,.1));flex-shrink:0;}
    .SpicyLyricsSettingsHeader span{font-size:var(--text-headline-size,.95rem)!important;font-weight:var(--w-semibold,600);color:var(--color-text-primary,#fff);letter-spacing:0;}
    .SpicyLyricsSettingsHeaderClose{background:transparent;border:none;color:var(--color-text-secondary,rgba(255,255,255,.58));cursor:pointer;padding:6px;display:flex;align-items:center;justify-content:center;border-radius:var(--radius-sm,8px);transition:color .15s,background .15s,transform .12s;}
    .SpicyLyricsSettingsHeaderClose:hover{color:var(--color-text-primary,#fff);background:var(--accent-tint-bg,rgba(255,255,255,.1));}
    .SpicyLyricsSettingsHeaderClose:active{transform:scale(.96);}
    .SpicyLyricsSettingsScroll{flex:1;overflow-y:auto;padding:10px 16px 16px;}
    .SpicyLyricsSettingsScroll::-webkit-scrollbar{width:4px;}
    .SpicyLyricsSettingsScroll::-webkit-scrollbar-track{background:transparent;}
    .SpicyLyricsSettingsScroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px;}
    .sl-settings-group{font-size:var(--text-caption-size,.78rem)!important;font-weight:var(--w-semibold,600);color:var(--color-text-primary,#fff);letter-spacing:0;margin-top:18px;margin-bottom:4px;padding:12px 2px 8px;border-top:1px solid var(--hairline,rgba(255,255,255,.1));}
    .sl-settings-group:first-child{margin-top:8px;}
    .sl-settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 8px;border-radius:var(--radius-md,10px);transition:background .15s;}
    .sl-settings-row:hover{background:var(--accent-tint-bg,rgba(255,255,255,.09));}
    .sl-settings-label{font-size:var(--text-body-size,.875rem)!important;font-weight:var(--w-medium,500);color:var(--color-text-primary,rgba(255,255,255,.9));flex:1;line-height:1.35;}
    .sl-toggle{position:relative;display:inline-flex;width:40px;height:22px;flex-shrink:0;cursor:pointer;}
    .sl-toggle input{opacity:0;width:0;height:0;position:absolute;}
    .sl-toggle span{position:absolute;inset:0;background:rgba(0,0,0,.42);border-radius:100px;box-shadow:inset 0 1px 2px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.06);transition:background .2s,box-shadow .2s;}
    .sl-toggle span::after{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;background:rgba(245,245,245,.86);box-shadow:0 2px 5px rgba(0,0,0,.5),0 0 0 .5px rgba(0,0,0,.28);border-radius:50%;transition:transform .2s,background .2s;}
    .sl-toggle input:checked+span{background:rgba(255,255,255,.42);box-shadow:inset 0 1px 0 rgba(255,255,255,.3),inset 0 0 0 1px rgba(255,255,255,.24);}
    .sl-toggle input:checked+span::after{transform:translateX(18px);}
    .sl-select-wrap{position:relative;display:inline-flex;align-items:center;flex-shrink:0;max-width:220px;}
    .sl-select-wrap::after{content:"";position:absolute;right:9px;top:50%;width:12px;height:12px;transform:translateY(-50%);pointer-events:none;background:currentColor;opacity:.62;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") center/12px 12px no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") center/12px 12px no-repeat;}
    .sl-select{-webkit-appearance:none;appearance:none;background-color:var(--accent-tint-bg,rgba(255,255,255,.09));background-image:none!important;color:var(--color-text-primary,rgba(255,255,255,.9));border:0;box-shadow:inset 0 0 0 1px var(--hairline,rgba(255,255,255,.12));border-radius:var(--radius-sm,8px);padding:7px 28px 7px 10px;font-size:var(--text-caption-size,.8rem)!important;font-weight:var(--w-medium,500);cursor:pointer;width:100%;max-width:220px;}
    .SpicyLyricsSettingsContainer .sl-select:hover{background-color:var(--accent-tint-bg-hover,rgba(255,255,255,.14));background-image:none!important;box-shadow:inset 0 0 0 1px var(--hairline-strong,rgba(255,255,255,.25));}
    .sl-select option{background:#1a1a1a;color:rgba(255,255,255,.85);}
    .sl-select:focus{outline:none;box-shadow:inset 0 0 0 1px var(--hairline-strong,rgba(255,255,255,.28));}
    .sl-input{background:var(--accent-tint-bg,rgba(255,255,255,.09));border:0;box-shadow:inset 0 0 0 1px var(--hairline,rgba(255,255,255,.12));border-radius:var(--radius-sm,8px);color:var(--color-text-primary,rgba(255,255,255,.9));padding:7px 10px;font-size:var(--text-caption-size,.8rem)!important;flex-shrink:0;width:220px;outline:none;transition:box-shadow .15s,background .15s;}
    .sl-input::placeholder{color:var(--color-text-tertiary,rgba(255,255,255,.38));}
    .sl-input:focus{background:var(--accent-tint-bg-hover,rgba(255,255,255,.14));box-shadow:inset 0 0 0 1px var(--hairline-strong,rgba(255,255,255,.28));}
    .sl-btn{background:var(--accent-tint-bg,rgba(255,255,255,.09));color:var(--color-text-primary,rgba(255,255,255,.9));border:0;box-shadow:inset 0 0 0 1px var(--hairline,rgba(255,255,255,.12));border-radius:var(--radius-sm,8px);padding:7px 14px;font-size:var(--text-caption-size,.8rem)!important;font-weight:var(--w-semibold,600);cursor:pointer;flex-shrink:0;transition:background .15s,box-shadow .15s,transform .12s;}
    .sl-btn:hover{background:var(--accent-tint-bg-hover,rgba(255,255,255,.14));box-shadow:inset 0 0 0 1px var(--hairline-strong,rgba(255,255,255,.25));}
    .sl-btn:active{transform:scale(.97);}
    .sl-btn.sl-btn-primary{background:var(--accent,#fff);color:var(--accent-on-fill,#111);box-shadow:none;}
    .sl-btn.sl-btn-primary:hover{background:var(--accent-hover,#fff);box-shadow:none;}
    .sl-btn.sl-btn-danger{color:rgba(255,132,112,.95);box-shadow:inset 0 0 0 1px rgba(255,132,112,.28);}
    .sl-btn.sl-btn-danger:hover{background:rgba(255,132,112,.1);box-shadow:inset 0 0 0 1px rgba(255,132,112,.45);}
    .GenericModal:has(.slm),.GenericModal:has(.slm) .main-trackCreditsModal-container{border-radius:16px;}
    .main-trackCreditsModal-mainSection:has(.slm.scroll-x-hidden){overflow-x:hidden;}
  `;
  document.head.appendChild(style);
};

// ─── Panel helper ───
// Creates an overlay matching the SpicyLyricsSettingsContainer style,
// centered within the Spotify viewport.

const showPanel = (title, buildContent) => {
  const existing = document.querySelector(".SpicyLyricsChannelOverlay");
  if (existing) existing.remove();

  const backdrop = document.createElement("div");
  backdrop.className = "SpicyLyricsSettingsOverlay SpicyLyricsChannelOverlay";

  const container = document.createElement("div");
  container.className = "SpicyLyricsSettingsContainer";

  const panelWidth = 540;

  function updatePosition() {
    const safeInset = 24;
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const w = Math.min(panelWidth, Math.max(320, availW - safeInset * 2));
    container.style.width     = `${w}px`;
    container.style.left      = `${(availW - w) / 2}px`;
    container.style.top       = `${availH / 2}px`;
    container.style.transform = "translateY(-50%)";
    container.style.maxHeight = `${Math.max(280, availH - safeInset * 2)}px`;
  }

  updatePosition();
  window.addEventListener("resize", updatePosition);

  const removalObserver = new MutationObserver(() => {
    if (!document.contains(backdrop)) {
      window.removeEventListener("resize", updatePosition);
      removalObserver.disconnect();
    }
  });
  removalObserver.observe(document.body, { childList: true });

  const header = document.createElement("div");
  header.className = "SpicyLyricsSettingsHeader";
  const titleEl = document.createElement("span");
  titleEl.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "SpicyLyricsSettingsHeaderClose";
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const close = () => backdrop.remove();
  closeBtn.addEventListener("click", close);
  backdrop.addEventListener("click", close);
  container.addEventListener("click", (e) => e.stopPropagation());

  header.appendChild(titleEl);
  header.appendChild(closeBtn);

  const scroll = document.createElement("div");
  scroll.className = "SpicyLyricsSettingsScroll";

  buildContent(scroll, close, { titleEl, container, backdrop });

  container.appendChild(header);
  container.appendChild(scroll);
  backdrop.appendChild(container);
  document.body.appendChild(backdrop);

  return close;
};

// ─── UI helpers ───

const makeRow = (labelText, control) => {
  const row = document.createElement("div");
  row.className = "sl-settings-row";
  const lbl = document.createElement("span");
  lbl.className = "sl-settings-label";
  lbl.textContent = labelText;
  row.appendChild(lbl);
  row.appendChild(control);
  return row;
};

const makeToggle = () => {
  const wrap = document.createElement("label");
  wrap.className = "sl-toggle";
  const input = document.createElement("input");
  input.type = "checkbox";
  const knob = document.createElement("span");
  wrap.appendChild(input);
  wrap.appendChild(knob);
  return { wrap, input };
};

const makeInput = (placeholder) => {
  const input = document.createElement("input");
  input.type = "text";
  input.className = "sl-input";
  input.placeholder = placeholder;
  return input;
};

const makeBtn = (text, modifiers = "") => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "sl-btn" + (modifiers ? " " + modifiers : "");
  btn.textContent = text;
  return btn;
};

const makeGroup = (text) => {
  const h = document.createElement("h3");
  h.className = "sl-settings-group";
  h.textContent = text;
  return h;
};

const makeBtnRow = () => {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;justify-content:flex-end;padding:8px 6px 2px;";
  return row;
};

const reopenPanel = (close, next) => {
  close();
  setTimeout(next, 100);
};

// ─── Channel Management UI ───

const showChannelSwitcher = () => {
  showPanel("Build Channel", (scroll, close) => {
    const map = getFullChannelMap();
    const allNames = Object.keys(map);
    const current = getCurrentChannel();
    const select = document.createElement("select");
    select.className = "sl-select";
    for (const name of allNames) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      opt.selected = name === current;
      select.appendChild(opt);
    }

    const selectWrap = document.createElement("span");
    selectWrap.className = "sl-select-wrap";
    selectWrap.appendChild(select);

    const channelControl = document.createElement("span");
    channelControl.style.cssText = "display:inline-flex;align-items:center;gap:8px;";
    const manageBtn = makeBtn("Manage");
    manageBtn.addEventListener("click", () => reopenPanel(close, showChannelManager));
    channelControl.append(selectWrap, manageBtn);
    const buildChannelRow = makeRow("Build Channel", channelControl);
    scroll.appendChild(buildChannelRow);

    const info = document.createElement("p");
    info.style.cssText = "margin:2px 8px 10px;font-size:0.72rem;color:rgba(255,255,255,0.35);line-height:1.5;";
    const updateInfo = () => {
      const hosts = map[select.value];
      if (!hosts) return (info.textContent = "");
      info.innerHTML = "";
      const h0 = document.createElement("strong"); h0.textContent = hosts[0];
      const h1 = document.createElement("strong"); h1.textContent = hosts[1];
      info.append(h0, " / ", h1);
      if (hosts[2]) {
        const fx = document.createElement("strong"); fx.textContent = hosts[2];
        info.append(" \u00b7 fixed: ", fx);
      }
    };
    updateInfo();
    select.addEventListener("change", updateInfo);
    scroll.appendChild(info);

    const btnRow = makeBtnRow();

    const applyBtn = makeBtn("Apply & Reload", "sl-btn-primary");
    applyBtn.addEventListener("click", () => { setCurrentChannel(select.value); close(); window.location.reload(); });
    btnRow.appendChild(applyBtn);

    scroll.appendChild(btnRow);
  });
};

const showAddCustomChannel = () => {
  showPanel("Add Channel", (scroll, close) => {
    scroll.appendChild(makeGroup("Channel Details"));

    const nameInput = makeInput("e.g. My-Test-Server");
    scroll.appendChild(makeRow("Branch Name", nameInput));

    const apiInput = makeInput(`Default: ${DEFAULT_API_HOST}`);
    scroll.appendChild(makeRow("API Host", apiInput));

    const storageInput = makeInput(`Default: ${DEFAULT_STORAGE_HOST}`);
    const storageRow = makeRow("Storage Host", storageInput);
    scroll.appendChild(storageRow);

    const { wrap: sameWrap, input: sameCb } = makeToggle();
    scroll.appendChild(makeRow("Use the same host for both API and Storage", sameWrap));
    sameCb.addEventListener("change", () => {
      storageRow.style.display = sameCb.checked ? "none" : "";
    });

    const { wrap: fixedToggleWrap, input: fixedCb } = makeToggle();
    scroll.appendChild(makeRow("Use a fixed version instead of fetching from /version", fixedToggleWrap));

    const fixedInput = makeInput("e.g. 5.19.11");
    const fixedRow = makeRow("Fixed Version", fixedInput);
    fixedRow.style.display = "none";
    scroll.appendChild(fixedRow);
    fixedCb.addEventListener("change", () => {
      fixedRow.style.display = fixedCb.checked ? "" : "none";
    });

    const note = document.createElement("p");
    note.style.cssText = "margin:4px 8px 10px;font-size:0.7rem;color:rgba(255,255,255,0.35);line-height:1.5;";
    note.innerHTML = `Leave API Host and Storage Host empty to use the defaults. To pull an older version, set a channel name, enable fixed version, and enter the version number.<br><br>The API host must serve <strong>/version</strong> as plain text. The Storage host must serve the bundle at <strong>/lyssna-lyrics@{version}.mjs</strong> with CORS and <code>application/javascript</code>.`;
    scroll.appendChild(note);

    const btnRow = makeBtnRow();

    const cancelBtn = makeBtn("Cancel");
    cancelBtn.addEventListener("click", () => reopenPanel(close, showChannelManager));
    btnRow.appendChild(cancelBtn);

    const saveBtn = makeBtn("Save Branch", "sl-btn-primary");
    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const apiHostRaw = apiInput.value.trim();
      const storageHostRaw = sameCb.checked ? apiHostRaw : storageInput.value.trim();
      const fixedVersion = fixedCb.checked ? fixedInput.value.trim() : "";
      const apiHost = apiHostRaw || DEFAULT_API_HOST;
      const storageHost = storageHostRaw || DEFAULT_STORAGE_HOST;

      if (!isAllowedBuildHost(apiHost) || !isAllowedBuildHost(storageHost)) { Spicetify.showNotification("Choose a Lyssna build host. Official plugin services are unsupported.", true); return; }
      if (!name) { Spicetify.showNotification("Channel name is required", true); return; }
      if (fixedCb.checked && !fixedVersion) { Spicetify.showNotification("Fixed version is required when enabled", true); return; }
      if (BUILT_IN_CHANNELS.includes(name)) { Spicetify.showNotification("Cannot override built-in channels", true); return; }

      const channels = getCustomChannels();
      channels[name] = fixedVersion ? [apiHost, storageHost, fixedVersion] : [apiHost, storageHost];
      saveCustomChannels(channels);

      close();
      Spicetify.showNotification(`Branch "${name}" added`);
      setTimeout(showChannelManager, 100);
    });
    btnRow.appendChild(saveBtn);

    scroll.appendChild(btnRow);
  });
};

const showChannelManager = () => {
  const channels = getFullChannelMap();
  const names = Object.keys(channels);
  const customNames = Object.keys(getCustomChannels());
  const selected = getCurrentChannel();

  showPanel("Manage Branches", (scroll, close) => {
    for (const name of names) {
      const row = document.createElement("div");
      row.className = "sl-settings-row";

      const info = document.createElement("div");
      const nameEl = document.createElement("div");
      nameEl.style.cssText = "font-weight:600;font-size:0.875rem;color:rgba(255,255,255,0.85);";
      nameEl.textContent = name;
      const hostEl = document.createElement("div");
      hostEl.style.cssText = "font-size:0.72rem;color:rgba(255,255,255,0.4);margin-top:2px;";
      hostEl.textContent = `${channels[name][0]} / ${channels[name][1]}${channels[name][2] ? ` \u00b7 fixed: ${channels[name][2]}` : ""}`;
      info.appendChild(nameEl);
      info.appendChild(hostEl);

      const actions = document.createElement("div");
      actions.style.cssText = "display:flex;gap:8px;align-items:center;";
      const customIndex = customNames.indexOf(name);
      if (customNames.length > 1 && customIndex >= 0) {
        const upBtn = makeBtn("↑");
        upBtn.style.cssText = "padding:7px 9px;";
        upBtn.disabled = customIndex === 0;
        upBtn.title = "Move up";
        upBtn.setAttribute("aria-label", `Move ${name} up`);
        upBtn.addEventListener("click", () => {
          moveCustomChannel(name, -1);
          close();
          setTimeout(showChannelManager, 100);
        });
        const downBtn = makeBtn("↓");
        downBtn.style.cssText = "padding:7px 9px;";
        downBtn.disabled = customIndex === customNames.length - 1;
        downBtn.title = "Move down";
        downBtn.setAttribute("aria-label", `Move ${name} down`);
        downBtn.addEventListener("click", () => {
          moveCustomChannel(name, 1);
          close();
          setTimeout(showChannelManager, 100);
        });
        actions.append(upBtn, downBtn);
      }
      if (name === selected) {
        const selectedBtn = makeBtn("Selected");
        selectedBtn.disabled = true;
        selectedBtn.style.cssText = "opacity:.45;cursor:default;";
        actions.appendChild(selectedBtn);
      } else {
        const switchBtn = makeBtn("Switch");
        switchBtn.addEventListener("click", () => {
          setCurrentChannel(name);
          close();
          window.location.reload();
        });
        actions.appendChild(switchBtn);

        if (!BUILT_IN_CHANNELS.includes(name)) {
          const removeBtn = makeBtn("Remove", "sl-btn-danger");
          removeBtn.addEventListener("click", () => {
            const customChannels = getCustomChannels();
            delete customChannels[name];
            saveCustomChannels(customChannels);
            close();
            Spicetify.showNotification(`Branch "${name}" removed`);
            setTimeout(showChannelManager, 100);
          });
          actions.appendChild(removeBtn);
        }
      }

      row.appendChild(info);
      row.appendChild(actions);
      scroll.appendChild(row);
    }

    const btnRow = makeBtnRow();
    const addBtn = makeBtn("Add Branch", "sl-btn-primary");
    addBtn.addEventListener("click", () => reopenPanel(close, showAddCustomChannel));
    btnRow.appendChild(addBtn);
    scroll.appendChild(btnRow);
  });
};

// ─── Expose channel manager globally for the plugin to use ───

window._spicy_lyrics_channels = {
  showSwitcher: showChannelSwitcher,
  showAdd: showAddCustomChannel,
  showManage: showChannelManager,
  getCurrent: getCurrentChannel,
  getMap: getFullChannelMap,
};

// ─── Stable Settings Injection ───
// Stable renders its own settings modal. Observe that modal and add one native
// row without importing or patching the upstream bundle.

const CHANNEL_SETTING_ROW_ID = "spicy-lyrics-entry-channel-row";
const CHANNEL_SETTING_GROUP_ID = "spicy-lyrics-entry-channel-group";
let channelSettingsObserver = null;
let channelSettingsRenderQueued = false;

const renderChannelSettings = () => {
  const modal = document.querySelector(
    "sl-generic-modal.SpicyLyricsModal .slmodal-settingsPanel"
  );
  if (!modal || document.getElementById(CHANNEL_SETTING_ROW_ID)) return;

  // Pixel builds already render their own channel control.
  if (Array.from(modal.querySelectorAll(".sl-sp-label"))
    .some((element) => element.textContent?.trim() === "Build Channel")) return;

  const advancedPane = modal.querySelector(
    '#sl-sp-panel[aria-labelledby="sl-sp-tab-advanced"] .sl-sp-pane-body'
  );
  const developerTitle = Array.from(modal.querySelectorAll(".sl-sp-section-title"))
    .find((element) => element.textContent?.trim() === "Developer");
  if (!advancedPane && !developerTitle) return;

  const channels = getFullChannelMap();
  const current = channels[getCurrentChannel()] ? getCurrentChannel() : "Stable";
  const row = document.createElement("div");
  row.id = CHANNEL_SETTING_ROW_ID;
  row.className = advancedPane ? "sl-sp-row sl-sp-row--stacked" : "sl-sp-row sl-list-row";

  const labelWrap = document.createElement("div");
  labelWrap.className = "sl-sp-label-wrap";
  const label = document.createElement("span");
  label.className = "sl-sp-label";
  label.textContent = "Build Channel";
  const description = document.createElement("span");
  description.className = "sl-sp-description";
  description.textContent = "Choose the release stream used after reload.";
  labelWrap.append(label, description);

  const control = document.createElement("div");
  control.className = "sl-sp-control";
  control.style.display = "flex";
  control.style.alignItems = "center";
  control.style.gap = "8px";
  control.style.minWidth = "0";
  const manage = document.createElement("button");
  manage.type = "button";
  manage.className = "sl-sp-btn";
  manage.textContent = "Manage";
  manage.addEventListener("click", showChannelManager);
  const select = document.createElement("select");
  select.className = "sl-sp-select";
  select.style.minWidth = "0";
  select.style.maxWidth = "100%";
  select.setAttribute("aria-label", "Build Channel");
  for (const name of Object.keys(channels)) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = name === current;
    select.appendChild(option);
  }
  select.addEventListener("change", () => {
    setCurrentChannel(select.value);
    window.location.reload();
  });
  control.append(select, manage);
  row.append(labelWrap, control);
  if (advancedPane) {
    const group = document.createElement("div");
    group.id = CHANNEL_SETTING_GROUP_ID;
    group.className = "sl-sp-group";
    const card = document.createElement("div");
    card.className = "sl-sp-card";
    card.appendChild(row);
    group.appendChild(card);
    advancedPane.prepend(group);
  } else {
    developerTitle.after(row);
  }
};

const registerChannelSettings = () => {
  if (channelSettingsObserver) return;
  const scheduleRender = () => {
    if (channelSettingsRenderQueued) return;
    channelSettingsRenderQueued = true;
    queueMicrotask(() => {
      channelSettingsRenderQueued = false;
      renderChannelSettings();
    });
  };
  channelSettingsObserver = new MutationObserver(scheduleRender);
  channelSettingsObserver.observe(document.body, { childList: true, subtree: true });
  window.addEventListener(CHANNELS_CHANGED_EVENT, () => {
    const injected = document.getElementById(CHANNEL_SETTING_GROUP_ID) ??
      document.getElementById(CHANNEL_SETTING_ROW_ID);
    injected?.remove();
    scheduleRender();
  });
  scheduleRender();
};


const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const selectChannel = () => {
  const channels = getFullChannelMap();
  const name = getCurrentChannel();
  const hosts = channels[name] ?? channels.Stable;
  return { apiHost: hosts[0], storageHost: hosts[1], fixedVersion: hosts[2] };
};

let loading = false;
let initializationFailed = false;
let attempt = 0;
let notice;

function showFailure(error) {
  console.error("[Lyssna Lyrics] Could not load:", error);
  notice?.remove();
  notice = document.createElement("div");
  notice.className = "lyssna-loader-notice";
  notice.setAttribute("role", "alert");
  notice.style.cssText = "position:fixed;bottom:90px;right:24px;z-index:999999;max-width:400px;padding:20px;background:#202124;color:white;border:1px solid #62666d;border-radius:12px;box-shadow:0 8px 28px #0008;font:14px/1.5 sans-serif";
  const message = document.createElement("p");
  message.textContent = initializationFailed
    ? "Lyssna Lyrics could not start. Reload Spotify after fixing or switching the build channel."
    : "Lyssna Lyrics could not download. Check your connection or switch the build channel, then retry.";
  notice.append(message);
  for (const [label, action] of [
    ...(!initializationFailed ? [["Retry", () => void load()]] : []),
    ["Build channels", () => showChannelManager()],
    ["Discord", () => window.open("https://discord.gg/qfYAsFQawp", "_blank", "noopener,noreferrer")],
    ["Dismiss", () => notice.remove()],
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.style.cssText = "padding:8px 12px;margin:4px;border:1px solid #a0a0a0;border-radius:6px;color:white;background:#30333a;cursor:pointer";
    button.addEventListener("click", action);
    notice.append(button);
  }
  document.body.append(notice);
}

async function load() {
  if (loading || initializationFailed) return;
  loading = true;
  notice?.remove();
  try {
    const channel = selectChannel();
    let version = channel.fixedVersion;
    if (!version) {
      const response = await fetch("https://" + channel.apiHost + "/version", { cache: "no-store", signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error("Version request failed: " + response.status);
      version = (await response.text()).trim();
    }
    if (!VERSION_PATTERN.test(version)) throw new Error("Invalid build version");
    window._spicy_lyrics_metadata = { LoadedVersion: version };
    const url = "https://" + channel.storageHost + "/lyssna-lyrics@" + encodeURIComponent(version) + ".mjs?attempt=" + attempt++;
    try {
      await import(url);
    } catch (error) {
      // Retrying a bundle that already ran can duplicate its event listeners.
      initializationFailed = !(error instanceof TypeError && /dynamically imported module|importing a module script failed/i.test(error.message));
      throw error;
    }
  } catch (error) {
    showFailure(error);
  } finally {
    loading = false;
  }
}

async function run() {
  while (!window.Spicetify?.React || !Spicetify.ReactDOM || !Spicetify.ReactDOMServer || !Spicetify.LocalStorage) await sleep(100);
  injectStyles();
  registerChannelSettings();
  await load();
}

run().catch(error => console.error("[Lyssna Lyrics] Loader failed:", error));
