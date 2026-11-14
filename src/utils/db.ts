import { openDB, type IDBPDatabase } from "idb";
import Logger from "./Logger";

const dbLogger = new Logger("Database");

export const ObjectStores = {
  LyricsStore: "lyricsStore",
}

const upgrade = (db: IDBPDatabase) => {
  dbLogger.debug("Upgrade invoked");
  if (!db.objectStoreNames.contains(ObjectStores.LyricsStore)) {
    db.createObjectStore(ObjectStores.LyricsStore);
    dbLogger.debug("Created '", ObjectStores.LyricsStore, "' store");
  }
};

async function openLyricsDb() {
  const db = await openDB("lyssnalyrics", undefined, { upgrade });
  const migrationKey = "LL:localLyricsCopied";
  if (Spicetify.LocalStorage.get(migrationKey) === "true") return db;
  let legacy: IDBPDatabase | undefined;
  try {
    legacy = await openDB("spicylyrics", undefined, {
      upgrade(_database, oldVersion, _newVersion, transaction) {
        // An absent legacy database must not be created as part of this read.
        if (oldVersion === 0) transaction.abort();
      },
    });
    if (legacy.objectStoreNames.contains(ObjectStores.LyricsStore)) {
      const read = legacy.transaction(ObjectStores.LyricsStore, "readonly");
      const [keys, values] = await Promise.all([read.store.getAllKeys(), read.store.getAll()]);
      await read.done;
      const write = db.transaction(ObjectStores.LyricsStore, "readwrite");
      for (let index = 0; index < keys.length; index++) {
        if (await write.store.get(keys[index]) === undefined) await write.store.put(values[index], keys[index]);
      }
      await write.done;
    }
    Spicetify.LocalStorage.set(migrationKey, "true");
  } catch (error) {
    // Missing databases are normal on fresh installations; keep existing stores intact.
    if (!(error instanceof DOMException && error.name === "AbortError")) dbLogger.warn("Could not copy older local lyrics", error);
  } finally {
    legacy?.close();
  }
  return db;
}

export const dbPromise = openLyricsDb();

export async function ensurePersistence() {
  try {
    if (await navigator.storage.persisted()) return true;

    const granted = await navigator.storage.persist();
    if (!granted) {
      dbLogger.warn("Data persistence request was denied; This can lead to potential data loss")
    } else {
      dbLogger.debug("Data persistence request was accepted")
    }
    return granted;
  } catch (e) {
    dbLogger.warn("Persistence check failed")
    return false;
  }
}
