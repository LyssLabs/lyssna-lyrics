type Blob = Record<string, any>;

const SYNC_SETTINGS_KEY = "LL:settings";
const SYNC_DISABLED_FIELD = "dontSyncSpicySettings";

export function isSpicySettingsSyncDisabled(): boolean {
  try {
    return readBlob(SYNC_SETTINGS_KEY)[SYNC_DISABLED_FIELD] === true;
  } catch {
    return true;
  }
}

function readBlob(key: string): Blob {
  const raw = Spicetify.LocalStorage.get(key);
  if (raw == null) return {};
  const value = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid settings record: ${key}`);
  return value;
}

/** Fork-only fields move only after their own record has been written successfully. */
export function partitionedStorage(sharedKey: string, ownKey: string, sharedKeys: ReadonlySet<string>, managedKeys: ReadonlySet<string>) {
  let previous: Blob = {};
  let readable = true;
  let previouslyDetached = isSpicySettingsSyncDisabled();

  function save(value: Blob): void {
    if (!readable) return;
    try {
      const detached = ownKey === SYNC_SETTINGS_KEY
        ? value[SYNC_DISABLED_FIELD] === true
        : isSpicySettingsSyncDisabled();
      const shared = detached ? {} : readBlob(sharedKey);
      const own = readBlob(ownKey);
      for (const key of managedKeys) {
        if (value[key] === undefined) delete own[key];
        else own[key] = value[key];
        if (detached) continue;
        if (sharedKeys.has(key)) {
          // Avoid writing a cached snapshot over changes made by another view.
          if (!previouslyDetached && JSON.stringify(previous[key]) === JSON.stringify(value[key])) continue;
          if (value[key] === undefined) delete shared[key];
          else shared[key] = value[key];
        } else {
          delete shared[key];
        }
      }
      const ownJson = JSON.stringify(own);
      if (Spicetify.LocalStorage.get(ownKey) !== ownJson) Spicetify.LocalStorage.set(ownKey, ownJson);
      if (Spicetify.LocalStorage.get(ownKey) !== ownJson) throw new Error(`Could not preserve ${ownKey}`);
      if (!detached) {
        const sharedJson = JSON.stringify(shared);
        if (Spicetify.LocalStorage.get(sharedKey) !== sharedJson) Spicetify.LocalStorage.set(sharedKey, sharedJson);
        if (Spicetify.LocalStorage.get(sharedKey) !== sharedJson) throw new Error(`Could not save ${sharedKey}`);
      }
      previous = JSON.parse(JSON.stringify(value));
      previouslyDetached = detached;
    } catch (error) {
      console.warn("Lyssna Lyrics could not save settings; existing records were preserved", error);
    }
  }

  function load(): Blob {
    try {
      const detached = isSpicySettingsSyncDisabled();
      const shared = detached ? {} : readBlob(sharedKey);
      const own = readBlob(ownKey);
      const value = detached ? { ...own } : { ...shared };
      for (const [key, item] of Object.entries(own)) {
        if (detached || !sharedKeys.has(key)) value[key] = item;
      }
      previous = JSON.parse(JSON.stringify(value));
      // No shared record means the older SpicyLyrics-* migration still owns initialization.
      if (Spicetify.LocalStorage.get(sharedKey) != null) save(value);
      return value;
    } catch (error) {
      readable = false;
      console.warn("Lyssna Lyrics could not read settings; existing records were preserved", error);
      return {};
    }
  }

  return { load, save };
}
