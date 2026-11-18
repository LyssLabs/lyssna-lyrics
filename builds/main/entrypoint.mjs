import { BUILT_IN_CHANNELS as CHANNEL_MAP, CHANNELS_CHANGED_EVENT, DEFAULT_CHANNEL, DEFAULT_BUILD_HOST, getChannelMap as getFullChannelMap, getCurrentChannel, isAllowedBuildHost, isReservedChannelName, readCustomChannels as getCustomChannels, saveCustomChannels, selectedChannel as selectChannel, setCurrentChannel } from "../shared/channels.mjs";
import { readActiveLyricsApp, recordActiveLyricsApp, rememberLyricsAppSwitch, restoreLyricsAppView, finishLyricsAppSwitch } from "../shared/app-state.mjs";
import { channelApp, channelBundleUrl, channelVersionUrl, readChannelVersion, TEST_BUILD_VERSION } from "../shared/build-paths.mjs";
import { beginLyricsLoad, finishLyricsLoad } from "../shared/integration.mjs";
import { fetchGitHubRelease, getCachedGitHubBundle, getGitHubBundle, importGitHubBundle } from "../shared/github-release.mjs";
import { CHANNEL_PICKER_STYLES, createChannelPicker } from "../shared/channel-picker.mjs";
import { startSpicyLyricsBackground } from "./spicy-background.mjs";

const ownsEntrypoint = !globalThis.__LYSSNA_LYRICS_ENTRYPOINT__;
if (ownsEntrypoint) globalThis.__LYSSNA_LYRICS_ENTRYPOINT__ = true;
if (ownsEntrypoint) beginLyricsLoad();

const BUILT_IN_CHANNELS = Object.keys(CHANNEL_MAP);
const DEFAULT_API_HOST = DEFAULT_BUILD_HOST;
const DEFAULT_STORAGE_HOST = DEFAULT_BUILD_HOST;

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
// own stylesheet to ensure the panel and ll-* components are always styled.

const injectStyles = () => {
  if (document.getElementById("lyssna-lyrics-entry-styles")) return;
  const style = document.createElement("style");
  style.id = "lyssna-lyrics-entry-styles";
  style.textContent = `

    .lyssna-entry-channel-row{align-items:center!important;flex-direction:row!important;gap:16px!important;}
    .lyssna-entry-channel-row>.sl-sp-label-wrap,.lyssna-entry-channel-row>.ll-sp-label-wrap{flex:1;min-width:0;}
    .lyssna-entry-channel-control{display:flex;align-items:center;gap:8px;min-width:0;flex:0 1 auto!important;width:auto!important;justify-content:flex-end;}
    .lyssna-channel-select-chevron{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:10px;height:10px;pointer-events:none;opacity:.8;}
    .lyssna-entry-channel-control :is(select,button):focus-visible{outline:2px solid currentColor;outline-offset:3px;}
    #lyssna-lyrics-spotify-channel-group{margin-bottom:24px;}
    #lyssna-lyrics-spotify-channel-group .x-settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:12px 0;}
    #lyssna-lyrics-spotify-channel-group .x-settings-firstColumn{flex:1;min-width:160px;}
    #lyssna-lyrics-spotify-channel-group label{display:block;color:var(--text-subdued,#b3b3b3);font-size:14px;}
    #lyssna-lyrics-spotify-channel-group p{margin:4px 0 0;color:var(--text-subdued,#b3b3b3);font-size:13px;}
    #lyssna-lyrics-spotify-channel-group .x-settings-button{min-height:32px;padding:6px 16px;background:transparent;color:var(--text-base,#fff);border:1px solid var(--essential-subdued,#727272);border-radius:999px;font:inherit;font-size:14px;font-weight:700;line-height:1.3;cursor:pointer;}
    #lyssna-lyrics-spotify-channel-group .x-settings-button:hover{border-color:var(--essential-base,#fff);}
    #lyssna-lyrics-spotify-channel-group h2{margin:0 0 8px;color:var(--text-base,#fff);font-size:24px;font-weight:700;}
    ${CHANNEL_PICKER_STYLES}
    .lyssna-loader-button{display:inline-flex!important;align-items:center;justify-content:center;opacity:1!important;cursor:progress;}
    .lyssna-loader-spinner{width:20px;height:20px;flex:0 0 auto;animation:lyssna-loader-spin .9s linear infinite;}
    @keyframes lyssna-loader-spin{to{transform:rotate(360deg);}}
    @media(prefers-reduced-motion:reduce){.lyssna-loader-spinner{animation:none;}}
    .LyssnaLyricsChannelOverlay{
      --channel-panel:#191919;--channel-surface:#222;--channel-text:#f4f4f4;--channel-muted:#aaa;
      --channel-border:rgba(255,255,255,.12);--channel-button:#303030;--channel-button-hover:#3a3a3a;
      --channel-primary:#f2f2f2;--channel-primary-text:#151515;
      position:fixed;inset:0;z-index:99998;display:grid;place-items:center;box-sizing:border-box;padding:24px;background:rgba(0,0,0,.56);
      font-family:var(--encore-body-font-stack,var(--fallback-fonts,sans-serif));color:var(--channel-text);color-scheme:dark;
    }
    .LyssnaLyricsChannelOverlay[data-app="spicy"]{
      --channel-panel:linear-gradient(125deg,#34202f,#241b32 58%,#1b1528);
      --channel-surface:rgba(226,205,255,.065);--channel-text:#e5d8fb;--channel-muted:#bfb0cf;
      --channel-border:rgba(224,203,255,.17);--channel-button:rgba(219,193,255,.12);--channel-button-hover:rgba(219,193,255,.2);
      --channel-primary:#dfd0fc;--channel-primary-text:#25172f;
    }
    .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsContainer{position:relative;display:flex;flex-direction:column;width:min(760px,100%);max-height:calc(100dvh - 48px);min-width:0;overflow:hidden;background:var(--channel-panel);border:1px solid var(--channel-border);border-radius:20px;box-shadow:0 24px 80px #0008;}
    .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsHeader{display:flex;align-items:center;gap:16px;padding:18px 20px;flex-shrink:0;}
    .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsHeaderTitle{margin:0;flex:1;min-width:0;color:var(--channel-text);font-size:18px;font-weight:650;line-height:1.3;}
    .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsHeaderClose{display:flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:0;border-radius:8px;background:transparent;color:var(--channel-muted);cursor:pointer;}
    .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsHeaderClose:hover{background:var(--channel-button);color:var(--channel-text);}
    .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsScroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:0 20px 24px;scrollbar-width:thin;scrollbar-color:var(--channel-border) transparent;}
    .LyssnaLyricsChannelOverlay .ll-channel-intro{margin:0 0 16px;color:var(--channel-muted);font-size:13px;line-height:1.5;}
    .LyssnaLyricsChannelOverlay .ll-channel-list{display:flex;flex-direction:column;gap:8px;}
    .LyssnaLyricsChannelOverlay .ll-channel-card{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:16px;padding:14px 16px;background:var(--channel-surface);border:1px solid var(--channel-border);border-radius:12px;}
    .LyssnaLyricsChannelOverlay .ll-channel-card[data-selected="true"]{border-color:color-mix(in srgb,var(--channel-text) 28%,transparent);}
    .LyssnaLyricsChannelOverlay .ll-channel-copy{min-width:0;}
    .LyssnaLyricsChannelOverlay .ll-channel-name{color:var(--channel-text);font-size:14px;font-weight:600;line-height:1.4;}
    .LyssnaLyricsChannelOverlay .ll-channel-hosts{margin-top:4px;overflow-wrap:anywhere;color:var(--channel-muted);font-size:12px;line-height:1.5;}
    .LyssnaLyricsChannelOverlay .ll-channel-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;flex-wrap:wrap;}
    .LyssnaLyricsChannelOverlay .ll-channel-selected{font-size:12px;font-weight:600;color:var(--channel-muted);padding:7px 10px;}
    .LyssnaLyricsChannelOverlay .ll-channel-footer{display:flex;justify-content:flex-end;margin-top:16px;}
    .LyssnaLyricsChannelOverlay .ll-settings-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0;}
    .LyssnaLyricsChannelOverlay .ll-settings-label{min-width:0;flex:1;color:var(--channel-text);font-size:14px;font-weight:500;line-height:1.4;}
    .LyssnaLyricsChannelOverlay .ll-settings-group{margin:12px 0 4px;padding:0;color:var(--channel-muted);font-size:12px;font-weight:600;line-height:1.5;}
    .LyssnaLyricsChannelOverlay .ll-channel-hint{margin:8px 0 16px;color:var(--channel-muted);font-size:12px;line-height:1.6;overflow-wrap:anywhere;}
    .LyssnaLyricsChannelOverlay .ll-channel-hint strong{color:var(--channel-text);}
    .LyssnaLyricsChannelOverlay .ll-input{box-sizing:border-box;width:240px;max-width:55%;height:34px;padding:0 10px;border:1px solid var(--channel-border);border-radius:8px;background:var(--channel-button);color:var(--channel-text);font:inherit;font-size:13px;}
    .LyssnaLyricsChannelOverlay .ll-input::placeholder{color:var(--channel-muted);}
    .LyssnaLyricsChannelOverlay .ll-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:6px 12px;flex-shrink:0;border:1px solid var(--channel-border);border-radius:8px;background:var(--channel-button);color:var(--channel-text);font:inherit;font-size:13px;font-weight:600;line-height:1.35;cursor:pointer;transition:background-color .15s ease,transform .12s ease;}
    .LyssnaLyricsChannelOverlay .ll-btn:hover:not(:disabled){background:var(--channel-button-hover);}
    .LyssnaLyricsChannelOverlay .ll-btn:active:not(:disabled){transform:scale(.97);}
    .LyssnaLyricsChannelOverlay .ll-btn:disabled{opacity:.35;cursor:default;}
    .LyssnaLyricsChannelOverlay .ll-btn-primary{background:var(--channel-primary);color:var(--channel-primary-text);border-color:transparent;}
    .LyssnaLyricsChannelOverlay .ll-btn-primary:hover:not(:disabled){background:color-mix(in srgb,var(--channel-primary) 88%,#aaa);}
    .LyssnaLyricsChannelOverlay .ll-btn-danger{color:#ff9b8d;border-color:#ff9b8d42;background:transparent;}
    .LyssnaLyricsChannelOverlay .ll-btn-danger:hover:not(:disabled){background:#ff9b8d12;}
    .LyssnaLyricsChannelOverlay .ll-channel-move{width:30px;min-height:30px;padding:0;}
    .LyssnaLyricsChannelOverlay .ll-select-wrap{position:relative;display:inline-flex;align-items:center;min-width:0;max-width:240px;color:var(--channel-text);}
    .LyssnaLyricsChannelOverlay .ll-select{appearance:none;-webkit-appearance:none;box-sizing:border-box;width:100%;min-width:140px;max-width:240px;height:34px;padding:0 30px 0 12px;border:1px solid var(--channel-border);border-radius:8px;background:var(--channel-button);color:var(--channel-text);font:inherit;font-size:13px;}
    .LyssnaLyricsChannelOverlay .ll-select option{background:#242124;color:var(--channel-text);}
    .LyssnaLyricsChannelOverlay .ll-toggle{position:relative;display:inline-flex;align-items:center;width:40px;height:22px;flex-shrink:0;cursor:pointer;}
    .LyssnaLyricsChannelOverlay .ll-toggle input{position:absolute;opacity:0;width:100%;height:100%;margin:0;cursor:pointer;}
    .LyssnaLyricsChannelOverlay .ll-toggle span{pointer-events:none;position:absolute;inset:0;border-radius:99px;background:#777;transition:background .15s ease;}
    .LyssnaLyricsChannelOverlay .ll-toggle span:after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .15s ease;}
    .LyssnaLyricsChannelOverlay .ll-toggle input:checked+span{background:#1ed760;}
    .LyssnaLyricsChannelOverlay[data-app="spicy"] .ll-toggle input:checked+span{background:#977dc6;}
    .LyssnaLyricsChannelOverlay .ll-toggle input:checked+span:after{transform:translateX(18px);}
    .LyssnaLyricsChannelOverlay :is(button,select,input):focus-visible{outline:2px solid var(--channel-text);outline-offset:3px;}
    .LyssnaLyricsChannelOverlay .ll-toggle:has(input:focus-visible){outline:2px solid var(--channel-text);outline-offset:3px;border-radius:99px;}
    @media(max-width:620px){
      .lyssna-entry-channel-row{flex-wrap:wrap;}
      .lyssna-entry-channel-row>.lyssna-entry-channel-control{margin-left:auto;}
      .LyssnaLyricsChannelOverlay{padding:12px;}
      .LyssnaLyricsChannelOverlay .LyssnaLyricsSettingsContainer{max-height:calc(100dvh - 24px);}
      .LyssnaLyricsChannelOverlay .ll-channel-card{grid-template-columns:minmax(0,1fr);gap:12px;}
      .LyssnaLyricsChannelOverlay .ll-channel-actions{justify-self:end;}
      .LyssnaLyricsChannelOverlay .ll-settings-row{flex-wrap:wrap;}
      .LyssnaLyricsChannelOverlay .ll-input{max-width:100%;flex:1 1 200px;}
    }
    @media(prefers-reduced-motion:reduce){.LyssnaLyricsChannelOverlay *{transition:none!important;}}
  `;
  document.head.appendChild(style);
};

// ─── Panel helper ───
// Creates an overlay matching the LyssnaLyricsSettingsContainer style,
// centered within the Spotify viewport.

let closeChannelPanel;
const showPanel = (title, buildContent, { onBack } = {}) => {
  closeChannelPanel?.();
  const previousFocus = document.activeElement;

  const backdrop = document.createElement("div");
  backdrop.className = "LyssnaLyricsSettingsOverlay LyssnaLyricsChannelOverlay";
  backdrop.dataset.app = document.querySelector("sl-generic-modal.SpicyLyricsModal .slmodal-settingsPanel")
    ? "spicy" : readActiveLyricsApp(Spicetify.LocalStorage)?.app ?? channelApp(selectChannel());

  const container = document.createElement("div");
  container.className = "LyssnaLyricsSettingsContainer";
  container.setAttribute("role", "dialog");
  container.setAttribute("aria-modal", "true");
  container.setAttribute("aria-labelledby", "lyssna-channel-dialog-title");
  container.tabIndex = -1;

  const header = document.createElement("div");
  header.className = "LyssnaLyricsSettingsHeader";
  const titleEl = document.createElement("h2");
  titleEl.id = "lyssna-channel-dialog-title";
  titleEl.className = "LyssnaLyricsSettingsHeaderTitle";
  titleEl.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.className = "LyssnaLyricsSettingsHeaderClose";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Close build channels");
  closeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const close = () => {
    window.removeEventListener("keydown", onKeyDown, true);
    backdrop.remove();
    if (closeChannelPanel === close) closeChannelPanel = undefined;
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  };
  closeChannelPanel = close;
  const onKeyDown = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    } else if (event.key === "Tab") {
      event.stopImmediatePropagation();
      const controls = [...container.querySelectorAll("button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]")]
        .filter(element => element.getClientRects().length);
      if (!controls.length) { event.preventDefault(); container.focus(); return; }
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    }
  };
  const backBtn = makeBtn("← Back");
  backBtn.addEventListener("click", () => onBack ? reopenPanel(close, onBack) : close());
  closeBtn.addEventListener("click", close);
  let pressedBackdrop = false;
  backdrop.addEventListener("pointerdown", event => { pressedBackdrop = event.target === backdrop; });
  backdrop.addEventListener("click", event => { if (pressedBackdrop && event.target === backdrop) close(); });
  container.addEventListener("click", (e) => e.stopPropagation());

  header.append(backBtn, titleEl);
  header.appendChild(closeBtn);

  const scroll = document.createElement("div");
  scroll.className = "LyssnaLyricsSettingsScroll";

  buildContent(scroll, close, { titleEl, container, backdrop });

  container.appendChild(header);
  container.appendChild(scroll);
  backdrop.appendChild(container);
  document.body.appendChild(backdrop);
  window.addEventListener("keydown", onKeyDown, true);
  requestAnimationFrame(() => { if (backdrop.isConnected) container.focus({ preventScroll: true }); });

  return close;
};

// ─── UI helpers ───

const makeRow = (labelText, control) => {
  const row = document.createElement("div");
  row.className = "ll-settings-row";
  const lbl = document.createElement("span");
  lbl.className = "ll-settings-label";
  lbl.textContent = labelText;
  row.appendChild(lbl);
  row.appendChild(control);
  const field = control.matches("input,select") ? control : control.querySelector("input,select");
  field?.setAttribute("aria-label", labelText);
  return row;
};

const makeToggle = () => {
  const wrap = document.createElement("label");
  wrap.className = "ll-toggle";
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
  input.className = "ll-input";
  input.placeholder = placeholder;
  return input;
};

const makeBtn = (text, modifiers = "") => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ll-btn" + (modifiers ? " " + modifiers : "");
  btn.textContent = text;
  return btn;
};

const makeGroup = (text) => {
  const h = document.createElement("h3");
  h.className = "ll-settings-group";
  h.textContent = text;
  return h;
};

const makeBtnRow = () => {
  const row = document.createElement("div");
  row.className = "ll-channel-footer ll-channel-actions";
  return row;
};

const wrapChannelSelect = (select, className = "ll-select-wrap") => {
  const wrap = document.createElement("span");
  wrap.className = className;
  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrow.classList.add("lyssna-channel-select-chevron");
  arrow.setAttribute("viewBox", "0 0 10 10");
  arrow.setAttribute("aria-hidden", "true");
  arrow.innerHTML = '<path d="M2 3.75 5 6.75 8 3.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';
  wrap.append(select, arrow);
  return wrap;
};

const channelHostSummary = hosts => `${hosts[0] === hosts[1] ? hosts[0] : `${hosts[0]} / ${hosts[1]}`}${hosts[2] ? ` · v${hosts[2]}` : ""}`;

const reopenPanel = (close, next) => {
  close();
  next();
};

// ─── Channel Management UI ───

const showChannelSwitcher = () => {
  showPanel("Build Channel", (scroll, close) => {
    const map = getFullChannelMap();
    const allNames = Object.keys(map);
    const current = getCurrentChannel();
    const select = document.createElement("select");
    select.className = "ll-select";
    for (const name of allNames) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      opt.selected = name === current;
      select.appendChild(opt);
    }

    const selectWrap = wrapChannelSelect(select, "ll-select-wrap");

    const channelControl = document.createElement("span");
    channelControl.style.cssText = "display:inline-flex;align-items:center;gap:8px;";
    const manageBtn = makeBtn("Manage");
    manageBtn.addEventListener("click", () => reopenPanel(close, showChannelManager));
    channelControl.append(selectWrap, manageBtn);
    const buildChannelRow = makeRow("Build Channel", channelControl);
    scroll.appendChild(buildChannelRow);

    const info = document.createElement("p");
    info.className = "ll-channel-hint";
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

    const applyBtn = makeBtn("Apply & Reload", "ll-btn-primary");
    applyBtn.addEventListener("click", () => { setCurrentChannel(select.value); close(); window.location.reload(); });
    btnRow.appendChild(applyBtn);

    scroll.appendChild(btnRow);
  });
};

const showAddCustomChannel = () => {
  showPanel("Add branch", (scroll, close) => {
    scroll.appendChild(makeGroup("Channel Details"));

    const nameInput = makeInput("e.g. My-Test-Server");
    scroll.appendChild(makeRow("Branch Name", nameInput));

    const apiInput = makeInput(`Default: ${DEFAULT_API_HOST}`);
    scroll.appendChild(makeRow("API Host", apiInput));

    const storageInput = makeInput(`Default: ${DEFAULT_STORAGE_HOST}`);
    const storageRow = makeRow("Storage Host", storageInput);
    scroll.appendChild(storageRow);

    const { wrap: sameWrap, input: sameCb } = makeToggle();
    scroll.appendChild(makeRow("Same host for API and storage", sameWrap));
    sameCb.addEventListener("change", () => {
      storageRow.style.display = sameCb.checked ? "none" : "";
    });

    const { wrap: fixedToggleWrap, input: fixedCb } = makeToggle();
    scroll.appendChild(makeRow("Use a fixed version", fixedToggleWrap));

    const fixedInput = makeInput("e.g. 0.1.2");
    const fixedRow = makeRow("Fixed Version", fixedInput);
    fixedRow.style.display = "none";
    scroll.appendChild(fixedRow);
    fixedCb.addEventListener("change", () => {
      fixedRow.style.display = fixedCb.checked ? "" : "none";
    });

    const note = document.createElement("p");
    note.className = "ll-channel-hint";
    note.innerHTML = `Leave API Host and Storage Host empty to use the defaults. To pull an older version, set a channel name, enable fixed version, and enter the version number.<br><br>The API host must serve <strong>/lyssna-plugin/version</strong> as plain text. The Storage host must serve the bundle at <strong>/lyssna-plugin/builds/lyssna-lyrics@{version}.mjs</strong> with CORS and <code>application/javascript</code>.`;
    scroll.appendChild(note);

    const btnRow = makeBtnRow();

    const cancelBtn = makeBtn("Cancel");
    cancelBtn.addEventListener("click", () => reopenPanel(close, showChannelManager));
    btnRow.appendChild(cancelBtn);

    const saveBtn = makeBtn("Save Branch", "ll-btn-primary");
    saveBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      const apiHostRaw = apiInput.value.trim();
      const storageHostRaw = sameCb.checked ? apiHostRaw : storageInput.value.trim();
      const fixedVersion = fixedCb.checked ? fixedInput.value.trim() : "";
      const apiHost = apiHostRaw || DEFAULT_API_HOST;
      const storageHost = storageHostRaw || DEFAULT_STORAGE_HOST;

      if (!isAllowedBuildHost(apiHost) || !isAllowedBuildHost(storageHost)) { Spicetify.showNotification("Enter a valid host without a scheme, query, or credentials.", true); return; }
      if (!name) { Spicetify.showNotification("Channel name is required", true); return; }
      if (fixedCb.checked && !fixedVersion) { Spicetify.showNotification("Fixed version is required when enabled", true); return; }
      if (isReservedChannelName(name)) { Spicetify.showNotification("That channel name is reserved. Choose another name.", true); return; }

      const channels = getCustomChannels();
      channels[name] = fixedVersion ? [apiHost, storageHost, fixedVersion] : [apiHost, storageHost];
      saveCustomChannels(channels);

      close();
      Spicetify.showNotification(`Branch "${name}" added`);
      showChannelManager();
    });
    btnRow.appendChild(saveBtn);

    scroll.appendChild(btnRow);
  }, { onBack: showChannelManager });
};

const showChannelManager = () => {
  const channels = getFullChannelMap();
  const names = Object.keys(channels);
  const customNames = Object.keys(getCustomChannels());
  const selected = getCurrentChannel();

  showPanel("Build channels", (scroll, close) => {
    const intro = document.createElement("p");
    intro.className = "ll-channel-intro";
    intro.textContent = "Switching channels reloads Spotify.";
    const list = document.createElement("div");
    list.className = "ll-channel-list";
    scroll.append(intro, list);
    for (const name of names) {
      const row = document.createElement("div");
      row.className = "ll-channel-card";
      row.dataset.selected = String(name === selected);

      const info = document.createElement("div");
      info.className = "ll-channel-copy";
      const nameEl = document.createElement("div");
      nameEl.className = "ll-channel-name";
      nameEl.textContent = name;
      const hostEl = document.createElement("div");
      hostEl.className = "ll-channel-hosts";
      hostEl.textContent = channelHostSummary(channels[name]);
      info.appendChild(nameEl);
      info.appendChild(hostEl);

      const actions = document.createElement("div");
      actions.className = "ll-channel-actions";
      const customIndex = customNames.indexOf(name);
      if (customNames.length > 1 && customIndex >= 0) {
        const upBtn = makeBtn("↑");
        upBtn.classList.add("ll-channel-move");
        upBtn.disabled = customIndex === 0;
        upBtn.title = "Move up";
        upBtn.setAttribute("aria-label", `Move ${name} up`);
        upBtn.addEventListener("click", () => {
          moveCustomChannel(name, -1);
          close();
          showChannelManager();
        });
        const downBtn = makeBtn("↓");
        downBtn.classList.add("ll-channel-move");
        downBtn.disabled = customIndex === customNames.length - 1;
        downBtn.title = "Move down";
        downBtn.setAttribute("aria-label", `Move ${name} down`);
        downBtn.addEventListener("click", () => {
          moveCustomChannel(name, 1);
          close();
          showChannelManager();
        });
        actions.append(upBtn, downBtn);
      }
      if (name === selected) {
        const selectedBtn = document.createElement("span");
        selectedBtn.className = "ll-channel-selected";
        selectedBtn.textContent = "Selected";
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
          const removeBtn = makeBtn("Remove", "ll-btn-danger");
          removeBtn.addEventListener("click", () => {
            const customChannels = getCustomChannels();
            delete customChannels[name];
            saveCustomChannels(customChannels);
            close();
            Spicetify.showNotification(`Branch "${name}" removed`);
            showChannelManager();
          });
          actions.appendChild(removeBtn);
        }
      }

      row.appendChild(info);
      row.appendChild(actions);
      list.appendChild(row);
    }

    const btnRow = makeBtnRow();
    const addBtn = makeBtn("Add Branch", "ll-btn-primary");
    addBtn.addEventListener("click", () => reopenPanel(close, showAddCustomChannel));
    btnRow.appendChild(addBtn);
    scroll.appendChild(btnRow);
  });
};

// ─── Expose channel manager globally for the plugin to use ───

if (ownsEntrypoint) window._lyssna_lyrics_channels = {
  showSwitcher: showChannelSwitcher,
  showAdd: showAddCustomChannel,
  showManage: showChannelManager,
  getCurrent: getCurrentChannel,
  getMap: getFullChannelMap,
};

// Add the switcher to upstream settings without modifying its downloaded bundle.
const CHANNEL_SETTING_GROUP_ID = "lyssna-lyrics-entry-channel-group";
const SPOTIFY_CHANNEL_GROUP_ID = "lyssna-lyrics-spotify-channel-group";
let channelSettingsObserver = null;
let channelSettingsRenderQueued = false;
const settingsRootObservers = new Map();

const createChannelSettingsRow = (prefix, rowId) => {
  const spotify = prefix === "spotify";
  const channels = getFullChannelMap();
  const current = channels[getCurrentChannel()] ? getCurrentChannel() : DEFAULT_CHANNEL;
  const row = document.createElement("div");
  row.id = rowId;
  row.className = spotify ? "x-settings-row" : `${prefix}-sp-row lyssna-entry-channel-row`;

  const labelWrap = document.createElement("div");
  labelWrap.className = spotify ? "x-settings-firstColumn" : `${prefix}-sp-label-wrap`;
  const label = document.createElement("label");
  label.className = spotify ? "encore-text-body-small" : `${prefix}-sp-label`;
  label.htmlFor = `${rowId}-select`;
  label.textContent = "Build Channel";
  const description = document.createElement(spotify ? "p" : "span");
  description.className = spotify ? "encore-text-body-small" : `${prefix}-sp-description`;
  description.id = `${rowId}-description`;
  description.textContent = "Reloads Spotify.";
  labelWrap.append(label, description);

  const control = document.createElement("div");
  control.className = `lyssna-entry-channel-control ${spotify ? "x-settings-secondColumn" : `${prefix}-sp-control`}`;
  const manage = document.createElement("button");
  manage.type = "button";
  manage.className = spotify ? "x-settings-button" : `${prefix}-sp-btn`;
  manage.textContent = "Manage";
  manage.addEventListener("click", showChannelManager);
  const picker = createChannelPicker({
    id: label.htmlFor, theme: prefix, options: Object.keys(channels), value: current,
    onSelect: name => {
      setCurrentChannel(name);
      window.location.reload();
    },
  });
  picker.querySelector("button").setAttribute("aria-describedby", description.id);
  control.append(picker, manage);
  row.append(labelWrap, control);
  return row;
};

const renderChannelSettings = () => {
  for (const modal of document.querySelectorAll(".slmodal-settingsPanel, .llmodal-settingsPanel")) {
    const prefix = modal.matches(".slmodal-settingsPanel") ? "sl" : "ll";
    const advancedPane = modal.querySelector(
      `#${prefix}-sp-panel[aria-labelledby="${prefix}-sp-tab-advanced"] .${prefix}-sp-pane-body`
    );
    const injected = modal.querySelector(`#${CHANNEL_SETTING_GROUP_ID}`);
    if (injected && injected.parentElement === advancedPane) continue;
    injected?.remove();
    if (!advancedPane) continue;
    // Current Lyssna builds already own a channel control.
    if (Array.from(modal.querySelectorAll(".sl-sp-label, .ll-sp-label"))
      .some(element => element.textContent?.trim() === "Build Channel")) continue;
    const group = document.createElement("div");
    group.id = CHANNEL_SETTING_GROUP_ID;
    group.className = `${prefix}-sp-group`;
    const card = document.createElement("div");
    card.className = `${prefix}-sp-card`;
    card.appendChild(createChannelSettingsRow(prefix, `${CHANNEL_SETTING_GROUP_ID}-row`));
    group.appendChild(card);
    advancedPane.prepend(group);
  }

  if (Spicetify.Platform.History.location.pathname !== "/preferences") return;
  const language = document.getElementById("desktop.settings.selectLanguage");
  const container = language?.closest(".x-settings-section")?.parentElement ??
    (language ? document.querySelector(".main-view-container__scroll-node-child main > div") : null);
  if (!container || document.getElementById(SPOTIFY_CHANNEL_GROUP_ID)) return;
  const group = document.createElement("section");
  group.id = SPOTIFY_CHANNEL_GROUP_ID;
  group.className = "x-settings-section";
  const title = document.createElement("h2");
  title.className = "encore-text-body-medium-bold";
  title.textContent = "Lyrics build channel";
  group.append(title, createChannelSettingsRow("spotify", `${SPOTIFY_CHANNEL_GROUP_ID}-row`));
  container.prepend(group);
};

const registerChannelSettings = () => {
  if (channelSettingsObserver) return;
  const scheduleRender = () => {
    if (channelSettingsRenderQueued) return;
    channelSettingsRenderQueued = true;
    queueMicrotask(() => {
      channelSettingsRenderQueued = false;
      const roots = new Set(document.querySelectorAll(
        "sl-generic-modal.SpicyLyricsModal, lyssna-lyrics-modal.LyssnaLyricsModal"
      ));
      if (Spicetify.Platform.History.location.pathname === "/preferences") {
        const settingsPage = document.querySelector(".main-view-container, .Root__main-view");
        if (settingsPage) roots.add(settingsPage);
      }
      for (const [root, observer] of settingsRootObservers) {
        if (!roots.has(root)) {
          observer.disconnect();
          settingsRootObservers.delete(root);
        }
      }
      for (const root of roots) {
        if (settingsRootObservers.has(root)) continue;
        const observer = new MutationObserver(scheduleRender);
        observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-labelledby"] });
        settingsRootObservers.set(root, observer);
      }
      renderChannelSettings();
    });
  };
  channelSettingsObserver = new MutationObserver(scheduleRender);
  channelSettingsObserver.observe(document.body, { childList: true });
  Spicetify.Platform.History.listen(scheduleRender);
  window.addEventListener(CHANNELS_CHANGED_EVENT, () => {
    rememberLyricsAppSwitch(Spicetify.LocalStorage, Spicetify.Platform.History, channelApp(selectChannel()));
    document.querySelectorAll(`#${CHANNEL_SETTING_GROUP_ID}, #${SPOTIFY_CHANNEL_GROUP_ID}`).forEach(element => element.remove());
    scheduleRender();
  });
  scheduleRender();
};


const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));


let loading = false;
let initializationFailed = false;
let attempt = 0;
let notice;
let startupStatus;

function createLoadingStatus() {
  let button, observer, readyTimeout;
  let appName = "Lyssna Lyrics";
  const showTimeout = setTimeout(() => {
    if (!Spicetify.Playbar?.Button) return;
    const icon = '<svg class="lyssna-loader-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M12 3a9 9 0 0 1 9 9" stroke-linecap="round"/></svg>';
    button = new Spicetify.Playbar.Button(`Loading ${appName}`, icon, undefined, true, false, false);
    button.element.id = "LyssnaLyrics_LoadingButton";
    button.element.classList.add("lyssna-loader-button");
    button.element.setAttribute("aria-label", `Loading ${appName}`);
    button.element.setAttribute("aria-busy", "true");
    button.register();
  }, 400);
  function stop() {
    clearTimeout(showTimeout);
    clearTimeout(readyTimeout);
    observer?.disconnect();
    button?.deregister();
  }
  return {
    stop,
    setApp(app) {
      appName = app === "spicy" ? "Spicy Lyrics" : "Lyssna Lyrics";
      if (button) {
        button.label = `Loading ${appName}`;
        button.element.setAttribute("aria-label", button.label);
      }
    },
    finish(app) {
      const selector = app === "spicy" ? "#SpicyLyrics_PageButton, #SpicyLyricsPageSvg" : "#LyssnaLyrics_PageButton, #LyssnaLyricsPageSvg";
      if (document.querySelector(selector)) { stop(); return; }
      observer = new MutationObserver(() => { if (document.querySelector(selector)) stop(); });
      observer.observe(document.body, { childList: true, subtree: true });
      readyTimeout = setTimeout(stop, 12000);
    },
  };
}

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

async function fetchChannelVersion(channel) {
  const response = await fetch(channelVersionUrl(channel), { cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error("Version request failed: " + response.status);
  const version = await readChannelVersion(channel, response);
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) throw new Error("Invalid build version");
  return version;
}

async function resolveStableBuild(channel) {
  const repo = "lyssna-lyrics";
  let release;
  try {
    release = await fetchGitHubRelease(repo, version => `lyssna-lyrics@${version}.mjs`, { force: true });
  } catch (error) {
    console.warn("GitHub release unavailable; checking the Lyssna website:", error);
    try {
      return { version: await fetchChannelVersion(channel) };
    } catch (websiteError) {
      const githubBundle = await getCachedGitHubBundle(repo);
      if (!githubBundle) throw websiteError;
      console.warn("Using the cached Lyssna Lyrics release after both version lookups failed:", websiteError);
      return { version: githubBundle.version, githubBundle };
    }
  }
  const githubBundle = await getGitHubBundle(repo, release);
  return { version: githubBundle.version, githubBundle };
}

async function load() {
  if (loading || initializationFailed) return;
  loading = true;
  beginLyricsLoad();
  notice?.remove();
  startupStatus?.stop();
  const status = startupStatus = createLoadingStatus();
  let loadedApp;
  try {
    const channel = selectChannel();
    const app = channelApp(channel);
    status.setApp(app);
    if (app !== "lyssna") finishLyricsLoad(false);
    if (app === "spicy" && channel.fixedVersion) {
      throw new Error("Spicy Lyrics serves its current public build through the official loader. Choose the built-in Spicy Lyrics channel without a fixed version.");
    }
    let version = channel.fixedVersion;
    let githubBundle;
    if (channel.name === "Lyssna" && !version) {
      ({ version, githubBundle } = await resolveStableBuild(channel));
    }
    if (!version) version = await fetchChannelVersion(channel);
    if (typeof version !== "string" || !VERSION_PATTERN.test(version)) throw new Error("Invalid build version");
    const configured = Spicetify.Config?.extensions ?? [];
    const enabled = Array.isArray(configured) ? configured : String(configured).split("|");
    const separateSpicy = enabled.some(name => /^spicy-lyrics\.(?:mjs|js)$/.test(name.trim()));
    if (app === "spicy" && (separateSpicy || window._spicy_lyrics || window.SpicyLyrics)) {
      Spicetify.showNotification?.("Spicy Lyrics is enabled separately. Select Lyssna in the Lyssna build-channel menu to run both.");
      return;
    }
    if (app === "lyssna" && /^100\.10\./.test(version) && separateSpicy) {
      throw new Error("Pixel Edition versions predate coexistence support. Select a current Lyssna version to run alongside Spicy Lyrics.");
    }
    if (app === "lyssna") startSpicyLyricsBackground();
    const previousApp = readActiveLyricsApp(Spicetify.LocalStorage)?.app;
    restoreLyricsAppView(Spicetify.LocalStorage, Spicetify.Platform.History, app);
    if (app === "lyssna") window._lyssna_lyrics_metadata = { LoadedVersion: version, PreviousApp: previousApp ?? null };
    else window._spicy_lyrics_metadata = { LoadedVersion: version };
    window._lyssna_lyrics_channel = { name: channel.name, fixedVersion: channel.fixedVersion };
    const refresh = app === "lyssna" && version === TEST_BUILD_VERSION ? `&v=${Date.now()}` : "";
    const url = channelBundleUrl(channel, version) + "?attempt=" + attempt++ + refresh;
    try {
      if (githubBundle) await importGitHubBundle(githubBundle);
      else await import(url);
    } catch (error) {
      // Retrying a bundle that already ran can duplicate its event listeners.
      initializationFailed = !(error instanceof TypeError && /dynamically imported module|importing a module script failed/i.test(error.message));
      throw error;
    }
    recordActiveLyricsApp(Spicetify.LocalStorage, app, version);
    finishLyricsLoad(app === "lyssna");
    finishLyricsAppSwitch(Spicetify.LocalStorage);
    loadedApp = app;
    if (app === "spicy" && previousApp === "lyssna") {
      void showSpicyStartupDialog(version).catch(error => console.warn("Could not show the Spicy Lyrics startup dialog:", error));
    }
  } catch (error) {
    finishLyricsLoad(false);
    showFailure(error);
  } finally {
    loading = false;
    if (loadedApp) status.finish(loadedApp);
    else status.stop();
  }
}

async function showSpicyStartupDialog(version) {
  // Wait for upstream startup so a genuine update notice takes priority over the switch notice.
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (document.querySelector(".sltoaster")) {
      if (!document.querySelector(".sl-notice-host")) renderSpicySwitchDialog(version);
      return;
    }
    await sleep(100);
  }
}

function renderSpicySwitchDialog(version) {
  // Reuse the loaded upstream notice styles; its exported helper is developer-only.
  const host = document.createElement("div");
  host.className = "sl-notice-host";
  host.innerHTML = `<div class="sl-notice-overlay"><div class="sl-notice" role="dialog" aria-modal="true" aria-labelledby="lyssna-spicy-switch-title" tabindex="-1"><div class="sl-notice-heading"><p class="sl-notice-brand">Spicy Lyrics</p><h2 class="sl-notice-title" id="lyssna-spicy-switch-title">Switched to Spicy Lyrics</h2></div><p class="sl-notice-text"></p><div class="sl-notice-actions"><button type="button" class="sl-notice-button sl-notice-button--quiet">Release notes</button><button type="button" class="sl-notice-button sl-notice-button--primary">Continue</button></div></div></div>`;
  host.querySelector(".sl-notice-text").textContent = `Now running Spicy Lyrics ${version}.`;
  const overlay = host.firstElementChild;
  const buttons = host.querySelectorAll("button");
  const previousFocus = document.activeElement;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.classList.add("is-closing");
    overlay.classList.remove("is-open");
    setTimeout(() => host.remove(), 200);
    if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
  };
  const onKeyDown = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    } else if (event.key === "Tab") {
      event.preventDefault();
      buttons[document.activeElement === buttons[0] ? 1 : 0].focus({ preventScroll: true });
    }
  };
  buttons[0].addEventListener("click", () => {
    window.open(`https://github.com/Spikerko/spicy-lyrics/releases/tag/${encodeURIComponent(version)}`, "_blank", "noopener,noreferrer");
    close();
  });
  buttons[1].addEventListener("click", close);
  let pressedBackdrop = false;
  overlay.addEventListener("pointerdown", event => { pressedBackdrop = event.target === overlay; });
  overlay.addEventListener("click", event => { if (pressedBackdrop && event.target === overlay) close(); });
  document.body.append(host);
  document.addEventListener("keydown", onKeyDown, true);
  requestAnimationFrame(() => {
    if (closed) return;
    overlay.classList.add("is-open");
    buttons[1].focus({ preventScroll: true });
  });
}

async function run() {
  if (!ownsEntrypoint) return;
  while (!window.Spicetify?.React || !Spicetify.ReactDOM || !Spicetify.ReactDOMServer || !Spicetify.LocalStorage || !Spicetify.Platform?.History?.listen) await sleep(100);
  injectStyles();
  registerChannelSettings();
  await load();
}

run().catch(error => console.error("[Lyssna Lyrics] Loader failed:", error));
