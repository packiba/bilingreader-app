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
        let result: T
        req.onsuccess = () => { result = req.result as T }
        t.oncomplete = () => resolve(result)
        t.onerror = () => reject(t.error ?? req.error)
        t.onabort = () => reject(t.error ?? new Error('IndexedDB: транзакция прервана'))
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
  const all = await tx<StoredBook[]>('books', 'readonly', (s) => s.getAll())
  // The library only needs metadata. Keeping every book's full text in React
  // state for the whole session wasted memory; the text is re-read with
  // getBook() when a book is actually opened.
  return all.map((b) => ({ ...b, rawJson: '' }))
}

export function getBook(id: string): Promise<StoredBook | undefined> {
  return tx('books', 'readonly', (s) => s.get(id))
}

export function deleteBook(id: string): Promise<void> {
  return tx('books', 'readwrite', (s) => s.delete(id))
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
  })
}
