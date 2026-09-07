/**
 * IndexedDB wrapper for high-performance browser storage.
 * Replaces localStorage for large datasets (3000+ instruments, signals, journal).
 * localStorage has a 5-10MB limit and blocks the main thread on read/write.
 * IndexedDB has no practical limit and is async (non-blocking).
 * 
 * Includes retry logic for connection-closing errors during concurrent access.
 */

const DB_NAME = "nabz-market";
const DB_VERSION = 2; // Incremented to force schema refresh and fix transaction issues
const MAX_RETRIES = 3;
const RETRY_DELAY = 150; // ms

// Store names
export const STORES = {
  INSTRUMENTS: "instruments",
  SIGNALS: "signals",
  SIGNAL_HISTORY: "signal_history",
  CODEL: "codal",
  JOURNAL: "journal",
  CACHE_META: "cache_meta",
  PORTFOLIO: "portfolio",
  ALERTS: "alerts",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let _db: IDBDatabase | null = null;
let _opening = false;
let _openPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db && _db.objectStoreNames.length > 0) return Promise.resolve(_db);
  
  // Debounce concurrent open calls
  if (_opening && _openPromise) return _openPromise;

  _opening = true;
  _openPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // Instruments store — keyed by insCode
      if (!db.objectStoreNames.contains(STORES.INSTRUMENTS)) {
        const store = db.createObjectStore(STORES.INSTRUMENTS, { keyPath: "_id" });
        store.createIndex("segment", "segment", { unique: false });
        store.createIndex("symbol", "symbol", { unique: false });
        store.createIndex("last", "last", { unique: false });
      }

      // Signals store
      if (!db.objectStoreNames.contains(STORES.SIGNALS)) {
        const store = db.createObjectStore(STORES.SIGNALS, { keyPath: "_id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("symbol", "symbol", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }

      // Signal history — completed/closed signals
      if (!db.objectStoreNames.contains(STORES.SIGNAL_HISTORY)) {
        const store = db.createObjectStore(STORES.SIGNAL_HISTORY, { keyPath: "_id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("result", "result", { unique: false });
      }

      // Codal reports
      if (!db.objectStoreNames.contains(STORES.CODEL)) {
        const store = db.createObjectStore(STORES.CODEL, { keyPath: "_id" });
        store.createIndex("symbol", "symbol", { unique: false });
        store.createIndex("publishDate", "publishDate", { unique: false });
      }

      // Journal entries
      if (!db.objectStoreNames.contains(STORES.JOURNAL)) {
        const store = db.createObjectStore(STORES.JOURNAL, { keyPath: "_id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("symbol", "symbol", { unique: false });
      }

      // Cache metadata (timestamps, etags)
      if (!db.objectStoreNames.contains(STORES.CACHE_META)) {
        db.createObjectStore(STORES.CACHE_META, { keyPath: "key" });
      }

      // Portfolio store
      if (!db.objectStoreNames.contains(STORES.PORTFOLIO)) {
        const store = db.createObjectStore(STORES.PORTFOLIO, { keyPath: "_id" });
        store.createIndex("symbol", "symbol", { unique: false });
        store.createIndex("addedAt", "addedAt", { unique: false });
      }

      // Alerts store
      if (!db.objectStoreNames.contains(STORES.ALERTS)) {
        const store = db.createObjectStore(STORES.ALERTS, { keyPath: "_id" });
        store.createIndex("symbol", "symbol", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("active", "active", { unique: false });
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      
      // Handle version change (another tab upgraded the DB)
      db.onversionchange = () => {
        db.close();
        _db = null;
        _opening = false;
        _openPromise = null;
      };
      
      // Handle connection loss
      db.onerror = () => {
        _db = null;
        _opening = false;
        _openPromise = null;
      };
      
      _db = db;
      _opening = false;
      resolve(db);
    };

    req.onerror = () => {
      _opening = false;
      _openPromise = null;
      reject(req.error);
    };

    req.onblocked = () => {
      _opening = false;
      _openPromise = null;
      reject(new Error("IDB blocked by another connection"));
    };
  });

  return _openPromise;
}

/** Reset DB connection state — call when you get connection errors */
function resetDB(): void {
  try { _db?.close(); } catch { /* ignore */ }
  _db = null;
  _opening = false;
  _openPromise = null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Execute an IDB operation with retry logic */
async function withRetry<T>(fn: (db: IDBDatabase) => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const db = await openDB();
      return await fn(db);
    } catch (e) {
      if (attempt < retries) {
        resetDB();
        await sleep(RETRY_DELAY * (attempt + 1));
        continue;
      }
      throw e;
    }
  }
  throw new Error("IDB operation failed after retries");
}

/* ═══════════════════════════════════════════════════════════════
   Generic CRUD operations
   ═══════════════════════════════════════════════════════════════ */

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  return withRetry(async (db) => {
    return new Promise<T[]>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readonly", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        
        let completed = false;
        
        req.onsuccess = () => {
          if (!completed) {
            completed = true;
            resolve(req.result as T[]);
          }
        };
        
        req.onerror = () => {
          if (!completed) {
            completed = true;
            reject(req.error || new Error("GetAll request failed"));
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("GetAll transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("GetAll transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

export async function get<T>(storeName: StoreName, key: string): Promise<T | undefined> {
  return withRetry(async (db) => {
    return new Promise<T | undefined>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readonly", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        const req = store.get(key);
        
        let completed = false;
        
        req.onsuccess = () => {
          if (!completed) {
            completed = true;
            resolve(req.result as T | undefined);
          }
        };
        
        req.onerror = () => {
          if (!completed) {
            completed = true;
            reject(req.error || new Error("Get request failed"));
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Get transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Get transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

export async function put<T>(storeName: StoreName, value: T): Promise<void> {
  return withRetry(async (db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        // Defensive: ensure _id exists for stores that require it
        const storeNamesNeedingId: string[] = [
          STORES.INSTRUMENTS, STORES.SIGNALS, STORES.SIGNAL_HISTORY,
          STORES.CODEL, STORES.JOURNAL,
        ];
        let fixedValue = value;
        if (storeNamesNeedingId.includes(storeName) && value && typeof value === "object" && !(value as Record<string, unknown>)._id) {
          fixedValue = { ...value, _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) } as T;
        }
        
        const tx = db.transaction(storeName, "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        const req = store.put(fixedValue);
        
        let completed = false;
        
        req.onsuccess = () => {
          // Wait for transaction to complete
        };
        
        req.onerror = () => {
          if (!completed) {
            completed = true;
            reject(req.error || new Error("Put request failed"));
          }
        };
        
        tx.oncomplete = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

export async function putAll<T extends { _id: string }>(
  storeName: StoreName,
  values: T[],
): Promise<void> {
  return withRetry(async (db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        
        let completed = false;
        let successCount = 0;
        const total = values.length;
        
        for (const v of values) {
          const req = store.put(v);
          req.onsuccess = () => {
            successCount++;
            if (successCount === total && !completed) {
              completed = true;
              resolve();
            }
          };
          req.onerror = () => {
            if (!completed) {
              completed = true;
              reject(req.error || new Error("Put request failed"));
            }
          };
        }
        
        tx.oncomplete = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Bulk transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Bulk transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

export async function remove(storeName: StoreName, key: string): Promise<void> {
  return withRetry(async (db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        const req = store.delete(key);
        
        let completed = false;
        
        req.onsuccess = () => {
          // Wait for transaction completion
        };
        
        req.onerror = () => {
          if (!completed) {
            completed = true;
            reject(req.error || new Error("Delete request failed"));
          }
        };
        
        tx.oncomplete = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Delete transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Delete transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

export async function clear(storeName: StoreName): Promise<void> {
  return withRetry(async (db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        const req = store.clear();
        
        let completed = false;
        
        req.onsuccess = () => {
          // Wait for transaction completion
        };
        
        req.onerror = () => {
          if (!completed) {
            completed = true;
            reject(req.error || new Error("Clear request failed"));
          }
        };
        
        tx.oncomplete = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Clear transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Clear transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

export async function count(storeName: StoreName): Promise<number> {
  return withRetry(async (db) => {
    return new Promise<number>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readonly", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        const req = store.count();
        
        let completed = false;
        
        req.onsuccess = () => {
          if (!completed) {
            completed = true;
            resolve(req.result);
          }
        };
        
        req.onerror = () => {
          if (!completed) {
            completed = true;
            reject(req.error || new Error("Count request failed"));
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Count transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Count transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

/** Bulk save in a single transaction — safe and fast */
export async function bulkSave<T extends { _id?: string }>(
  storeName: StoreName,
  values: T[],
): Promise<void> {
  return withRetry(async (db) => {
    return new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, "readwrite", { durability: "relaxed" });
        const store = tx.objectStore(storeName);
        
        let completed = false;
        let successCount = 0;
        const total = values.length;
        
        for (const v of values) {
          // Ensure _id exists for stores that require it
          const item = !v._id 
            ? { ...v, _id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
            : v;
            
          const req = store.put(item);
          req.onsuccess = () => {
            successCount++;
            if (successCount === total && !completed) {
              completed = true;
              resolve();
            }
          };
          req.onerror = () => {
            if (!completed) {
              completed = true;
              reject(req.error || new Error("Bulk save request failed"));
            }
          };
        }
        
        tx.oncomplete = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };
        
        tx.onerror = () => {
          if (!completed) {
            completed = true;
            reject(tx.error || new Error("Bulk save transaction failed"));
          }
        };
        
        tx.onabort = () => {
          if (!completed) {
            completed = true;
            reject(new Error("Bulk save transaction aborted"));
          }
        };
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Transaction failed"));
      }
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   Cache metadata — for smart cache invalidation
   ═══════════════════════════════════════════════════════════════ */

interface CacheMeta {
  key: string;
  timestamp: number;
  ttl: number; // time-to-live in ms
}

export async function isCacheValid(key: string, ttlMs: number): Promise<boolean> {
  try {
    const meta = await get<CacheMeta>(STORES.CACHE_META, key);
    if (!meta) return false;
    return Date.now() - meta.timestamp < ttlMs;
  } catch {
    return false;
  }
}

export async function setCacheTimestamp(key: string, ttlMs: number): Promise<void> {
  try {
    await put(STORES.CACHE_META, { key, timestamp: Date.now(), ttl: ttlMs });
  } catch {
    // Non-critical — silently ignore
  }
}

/* ═══════════════════════════════════════════════════════════════
   Bulk operations for instruments
   ═══════════════════════════════════════════════════════════════ */

export async function saveInstruments(instruments: { _id: string }[]): Promise<void> {
  await putAll(STORES.INSTRUMENTS, instruments);
  await setCacheTimestamp("instruments", 30 * 60 * 1000); // 30 min TTL
}

export async function getInstruments<T>(): Promise<T[]> {
  return getAll<T>(STORES.INSTRUMENTS);
}
