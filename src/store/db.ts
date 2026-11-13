const DB_NAME = 'biling-reader'
const DB_VERSION = 1

const STORES = ['books', 'progress', 'meta'] as const
type Store = (typeof STORES)[number]

// One shared connection instead of opening (and closing) a new one for every
// read/write. Rapid open/close cycles are unreliable in iOS WebKit, and after
// the app is backgrounded the connection can be closed under us — in which
// case writes used to fail silently and the reading position was never saved.
let dbPromise: Promise<IDBDatabase> | null = null
const OPEN_TIMEOUT_MS = 6000
// iOS WebKit has a long-standing bug where, after the app returns from the
// background, IndexedDB requests on an existing connection simply never
// complete (no success, no error). Without a deadline the library stayed
// empty and "Загрузка…" spun forever. A stuck transaction is aborted and
// retried once on a fresh connection.
const TX_TIMEOUT_MS = 15000

function isRetryableConnectionError(error: unknown): boolean {
  const name = error instanceof Error ? error.name : ''
  return name === 'InvalidStateError' || name === 'TransactionInactiveError' || name === 'TimeoutError'
}

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) return
      settled = true
      const error = new Error('IndexedDB не отвечает')
      error.name = 'TimeoutError'
      reject(error)
    }, OPEN_TIMEOUT_MS)
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    }
    req.onsuccess = () => {
      const db = req.result
      db.onclose = () => { if (dbPromise === p) dbPromise = null }
      db.onversionchange = () => { db.close(); if (dbPromise === p) dbPromise = null }
      window.clearTimeout(timer)
      if (settled) { db.close(); return }
      settled = true
      resolve(db)
    }
    req.onerror = () => {
      window.clearTimeout(timer)
      if (settled) return
      settled = true
      reject(req.error)
    }
  })
  dbPromise = p
  p.catch(() => { if (dbPromise === p) dbPromise = null })
  return p
}

async function tx<T = void>(store: Store, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  let lastError: unknown
  // One retry on a fresh connection covers "connection is closing" after the
  // app comes back from the background.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await getDb()
      return await new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = run(t.objectStore(store))
        let settled = false
        const finish = (fn: () => void) => {
          if (settled) return
          settled = true
          window.clearTimeout(timer)
          fn()
        }
        const timer = window.setTimeout(() => {
          try { t.abort() } catch { /* already finished */ }
          const error = new Error('IndexedDB не отвечает')
          error.name = 'TimeoutError'
          finish(() => reject(error))
        }, TX_TIMEOUT_MS)
        // The result is read once the transaction has committed, not in
        // onsuccess: a cursor request fires success repeatedly and is
        // "pending" again after continue(), where reading .result throws.
        t.oncomplete = () => finish(() => resolve((req.readyState === 'done' ? req.result : undefined) as T))
        t.onerror = () => finish(() => reject(t.error ?? req.error))
        t.onabort = () => finish(() => reject(t.error ?? new Error('IndexedDB: транзакция прервана')))
      })
    } catch (e) {
      lastError = e
      // Reopening helps when WebKit closed the connection in the background,
      // but retrying quota, validation, or application errors only repeats the
      // same failure and needlessly churns the database connection.
      if (attempt === 0 && isRetryableConnectionError(e)) {
        dbPromise = null
        continue
      }
      throw e
    }
  }
  throw lastError
}

export interface StoredBook {
  id: string
  name: string
  rawJson: string
  importedAt: number
  totalPairs: number
  title?: string
  author?: string
  coverDataUrl?: string
  // Language pair declared by the book (for the library badge) and the side
  // the user chose to have read aloud.
  langSrc?: string
  langTgt?: string
  ttsSide?: 'src' | 'tgt'
}

export interface BookProgress {
  lastPair: number
  readThrough: number
  readExceptions: number[]
  // When this snapshot was taken; lets the localStorage mirror and the
  // IndexedDB copy be compared so the newer one wins.
  updatedAt?: number
}

export function putBook(b: StoredBook): Promise<void> {
  return tx('books', 'readwrite', (s) => s.put(b, b.id))
}

export async function getBooks(): Promise<StoredBook[]> {
  // The library only needs metadata. getAll() used to materialise the full
  // text (and base64 cover) of EVERY book at once just to throw it away,
  // which on an iPad with a few large books is enough memory pressure for
  // Safari to kill the page. A cursor holds only one record at a time.
  const out: StoredBook[] = []
  await tx('books', 'readonly', (s) => {
    const req = s.openCursor()
    req.addEventListener('success', () => {
      const cursor = req.result
      if (!cursor) return
      const b = cursor.value as StoredBook
      out.push({ ...b, rawJson: '' })
      cursor.continue()
    })
    return req
  })
  return out
}

export function getBook(id: string): Promise<StoredBook | undefined> {
  return tx('books', 'readonly', (s) => s.get(id))
}

export async function deleteBook(id: string): Promise<void> {
  await tx('books', 'readwrite', (s) => s.delete(id))
  // Progress lives in its own store; without this it was orphaned forever.
  await tx('progress', 'readwrite', (s) => s.delete(id)).catch(() => {})
}

export function putProgress(id: string, p: BookProgress): Promise<void> {
  return tx('progress', 'readwrite', (s) => s.put(p, id))
}

export function getProgress(id: string): Promise<BookProgress | undefined> {
  return tx('progress', 'readonly', (s) => s.get(id))
}

export function setMeta(key: string, value: string): Promise<void> {
  return tx('meta', 'readwrite', (s) => s.put(value, key))
}

export function getMeta(key: string): Promise<string | undefined> {
  return tx('meta', 'readonly', (s) => s.get(key))
}

export async function clearAll(): Promise<void> {
  const db = await getDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES, 'readwrite')
    for (const name of STORES) t.objectStore(name).clear()
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error ?? new Error('IndexedDB: транзакция прервана'))
  })
}

// Ask the browser not to evict our storage under pressure. Best-effort: not
// every browser supports it, and Safari may decline.
export function requestPersistentStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => {})
  } catch { /* unsupported */ }
}

// Turns low-level storage errors into a message the reader can act on.
export function storageErrorMessage(e: unknown, fallback: string): string {
  const name = e instanceof Error || e instanceof DOMException ? e.name : ''
  if (name === 'QuotaExceededError') return 'Недостаточно места на устройстве для сохранения книги'
  if (name === 'TimeoutError') return 'Хранилище не отвечает. Попробуйте ещё раз или перезапустите приложение'
  return e instanceof Error && e.message ? e.message : fallback
}
