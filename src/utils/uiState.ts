import { partitionedStorage } from "./settingsStorage.ts";
import { atom } from "nanostores";

export const UI_STATE_KEY = "SL:uiState";

export const LYSSNA_UI_STATE_KEY = "LL:uiState";
const SHARED_UI_KEYS = new Set(["isNowBarOpen", "nowBarSide", "forceCompactMode", "romanization", "npvLyricsOpen", "npvLyricsExpanded"]);
const MANAGED_UI_KEYS = new Set([...SHARED_UI_KEYS, "lastFetchedUri", "settingsMenuLocation", "IsNowBarOpen", "NowBarSide", "ForceCompactMode"]);
const uiStorage = partitionedStorage(UI_STATE_KEY, LYSSNA_UI_STATE_KEY, SHARED_UI_KEYS, MANAGED_UI_KEYS);
export const saveUiStateBlob = uiStorage.save;
export function importUiStateBlob(values: Record<string, any>): void {
  saveUiStateBlob({ ...uiStorage.load(), ...values });
}

function migrateUiStateKeys(blob: Record<string, any>): Record<string, any> {
  const renames: Record<string, string> = {
    "IsNowBarOpen": "isNowBarOpen",
    "NowBarSide": "nowBarSide",
    "ForceCompactMode": "forceCompactMode",
  };
  let changed = false;
  for (const [oldKey, newKey] of Object.entries(renames)) {
    if (oldKey in blob) {
      if (!(newKey in blob)) blob[newKey] = blob[oldKey];
      delete blob[oldKey];
      changed = true;
    }
  }
  if (changed) saveUiStateBlob(blob);
  return blob;
}

const _uiState: Record<string, any> = migrateUiStateKeys(uiStorage.load());

export function syncUiStateToSpicy(): void {
  saveUiStateBlob(_uiState);
}

function persistAtom<T>(key: string, defaultValue: T) {
  MANAGED_UI_KEYS.add(key);
  const store = atom<T>(_uiState[key] !== undefined ? _uiState[key] : defaultValue);
  store.listen((v) => {
    _uiState[key] = v;
    saveUiStateBlob(_uiState);
  });
  return store;
}

// UI state atoms (persisted, not settings-panel entries)
export const $isNowBarOpen = persistAtom<boolean>("isNowBarOpen", false);
export const $nowBarSide = persistAtom<"left" | "right">("nowBarSide", "left");
export const $forceCompactMode = persistAtom<boolean>("forceCompactMode", false);
export const $romanization = persistAtom<boolean>("romanization", false);
export const $lastFetchedUri = persistAtom<string | null>("lastFetchedUri", null);
export const $npvLyricsOpen = persistAtom<boolean>("npvLyricsOpen", true);
export const $npvLyricsExpanded = persistAtom<boolean>("npvLyricsExpanded", false);
export const $settingsMenuLocation = persistAtom<{
  route: "settings" | "hidden" | "animator";
  query: string;
  sectionFilter: string;
  scrollTop: number;
}>("settingsMenuLocation", {
  route: "settings",
  query: "",
  sectionFilter: "Appearance",
  scrollTop: 0,
});

// Runtime (ephemeral) atoms
export const $isGlobalNav = atom<boolean>(true);

(function watchGlobalNav() {
  // LyssnaLyrics_LegacyNav marks Spotify's old navigation for main.css, in place of a
  // body:has(.Root:not(.global-nav)) that walked the whole document on every check.
  function sync(root: Element) {
    const globalNav = root.classList.contains("global-nav");
    $isGlobalNav.set(globalNav);
    document.body.classList.toggle("LyssnaLyrics_LegacyNav", !globalNav);
  }

  function observe(root: Element) {
    sync(root);
    new MutationObserver(() => sync(root)).observe(root, { attributes: true, attributeFilter: ["class"] });
  }

  const existing = document.querySelector(".Root");
  if (existing) {
    observe(existing);
    return;
  }

  const mo = new MutationObserver((_, observer) => {
    const el = document.querySelector(".Root");
    if (el) {
      observer.disconnect();
      observe(el);
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
