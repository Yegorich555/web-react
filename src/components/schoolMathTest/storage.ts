import { MathTask } from "./equation";
import type { Field, RowResult } from "./mathRow";

/** Results of the test of pointed level */
export interface LevelResult {
  level: number;
  /** Editable inputs per row */
  fields: Field[][];
  results: RowResult[];
}

/** Whole state of the test that is enough to continue after page reload */
export interface SavedState extends LevelResult {
  tasks: MathTask[];
  /** Results of previous levels of the current round: all levels are exported together when the last level is finished */
  history: LevelResult[];
  /** All levels of the current round are already exported */
  isExported: boolean;
}

const dbName = "schoolMathTest";
const storeName = "state";
const stateKey = "current";
const fileIndexKey = "fileIndex";
/** Increment it when SavedState is changed so the old data is ignored */
const version = 5;
/** Wait for pointed time before saving to avoid writing on each keystroke */
const saveDebounceMs = 300;
/** indexedDB.open() can hang forever in some browsers/webviews: fail after timeout so the app is rendered anyway */
const openTimeoutMs = 3000;

/** Opened database: it's required to start transaction synchronously (on pagehide) */
let db: IDBDatabase | undefined;
let dbPromise: Promise<IDBDatabase> | undefined;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    let isTimeout = false;
    const timer = setTimeout(() => {
      isTimeout = true;
      reject(new Error("IndexedDB isn't opened in time"));
    }, openTimeoutMs);
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(storeName);
    req.onsuccess = () => {
      clearTimeout(timer);
      if (isTimeout) {
        req.result.close(); // promise is already rejected: the next call opens it again
        return;
      }
      db = req.result;
      resolve(db);
    };
    req.onerror = () => {
      clearTimeout(timer);
      reject(req.error);
    };
    req.onblocked = () => {
      clearTimeout(timer);
      reject(new Error("IndexedDB is blocked by another tab"));
    };
  }).catch((err: unknown) => {
    dbPromise = undefined; // otherwise every next call fails with the same error
    throw err;
  });
  return dbPromise;
}

const toPromise = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await openDb();
  return toPromise(fn(d.transaction(storeName, mode).objectStore(storeName)));
}

/** Returns saved state or null if it's missed/outdated/storage isn't available */
export async function loadState(): Promise<SavedState | null> {
  try {
    const v = await run<{ version: number; state: SavedState } | undefined>("readonly", (s) => s.get(stateKey));
    return v?.version === version ? v.state : null;
  } catch (err) {
    console.error("Can't read state from IndexedDB", err);
    return null;
  }
}

let pending: SavedState | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function flush(): void {
  clearTimeout(timer);
  if (!pending) {
    return;
  }
  const value = { version, state: pending };
  pending = null;
  const onError = (err: unknown): void => console.error("Can't save state into IndexedDB", err);
  if (db) {
    // WARN: transaction must be started synchronously otherwise browser can skip it on page unloading
    try {
      const tx = db.transaction(storeName, "readwrite");
      toPromise(tx.objectStore(storeName).put(value, stateKey)).catch(onError);
      tx.commit?.(); // don't wait for callbacks: otherwise the transaction is aborted by unloading
    } catch (err) {
      onError(err); // db can be closed by browser
    }
  } else {
    run("readwrite", (s) => s.put(value, stateKey)).catch(onError);
  }
}

/** Save state into IndexedDB (with debounce)
 * @param isImmediate save at once: use it when page is closing */
export function saveState(state: SavedState, isImmediate?: boolean): void {
  pending = state;
  clearTimeout(timer);
  if (isImmediate) {
    flush();
  } else {
    timer = setTimeout(flush, saveDebounceMs);
  }
}

/** Remove saved state from IndexedDB */
export function clearState(): Promise<void> {
  pending = null;
  clearTimeout(timer);
  return run("readwrite", (s) => s.delete(stateKey)).catch((err) => console.error("Can't clear IndexedDB", err));
}

let fileIndex = 0;
/** Returns next index for file name of exported results: it's stored to avoid the same names after reloading the page */
export async function nextFileIndex(): Promise<number> {
  try {
    const d = await openDb();
    const s = d.transaction(storeName, "readwrite").objectStore(storeName);
    const req = s.get(fileIndexKey);
    fileIndex = await new Promise<number>((resolve, reject) => {
      req.onsuccess = () => {
        const next = Math.max(fileIndex, Number(req.result) || 0) + 1;
        s.put(next, fileIndexKey); // read & write in the same transaction
        resolve(next);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Can't get file index from IndexedDB", err);
    ++fileIndex; // storage isn't available: use index in memory
  }
  return fileIndex;
}
