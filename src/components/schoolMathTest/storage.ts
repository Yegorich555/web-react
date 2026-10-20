import { MathTask } from "./equation";
import type { RowResult } from "./mathRow";

/** Whole state of the test that is enough to continue after page reload */
export interface SavedState {
  tasks: MathTask[];
  results: RowResult[];
}

const dbName = "schoolMathTest";
const storeName = "state";
const key = "current";
/** Increment it when SavedState is changed so the old data is ignored */
const version = 1;
/** Wait for pointed time before saving to avoid writing on each keystroke */
const saveDebounceMs = 300;

let dbPromise: Promise<IDBDatabase> | undefined;
function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(storeName);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(storeName, mode).objectStore(storeName));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Returns saved state or null if it's missed/outdated/storage isn't available */
export async function loadState(): Promise<SavedState | null> {
  try {
    const v = await run<{ version: number; state: SavedState } | undefined>("readonly", (s) => s.get(key));
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
  if (pending) {
    const state = pending;
    pending = null;
    run("readwrite", (s) => s.put({ version, state }, key)).catch((err) => console.error("Can't save state into IndexedDB", err));
  }
}
window.addEventListener("pagehide", flush); // save changes at once if user closes/reloads page

/** Save state into IndexedDB (with debounce) */
export function saveState(state: SavedState): void {
  pending = state;
  clearTimeout(timer);
  timer = setTimeout(flush, saveDebounceMs);
}

/** Remove saved state from IndexedDB */
export function clearState(): Promise<void> {
  pending = null;
  clearTimeout(timer);
  return run("readwrite", (s) => s.delete(key)).catch((err) => console.error("Can't clear IndexedDB", err));
}
