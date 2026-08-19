const DB_NAME = 'biling-reader'
const DB_VERSION = 1

const STORES = ['books', 'progress', 'meta'] as const
type Store = (typeof STORES)[number]

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T = void>(store: Store, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode)
    const req = run(t.objectStore(store))
    req.onsuccess = () => resolve(req.result as T)
    req.onerror = () => reject(req.error)
    t.oncomplete = () => db.close()
    t.onerror = () => reject(t.error)
  })
}

export interface StoredBook {
  id: string
  name: string
  rawJson: string
  importedAt: number
  totalPairs: number
}

export interface BookProgress {
  lastPair: number
  readThrough: number
  readExceptions: number[]
}

export function putBook(b: StoredBook): Promise<void> {
  return tx('books', 'readwrite', (s) => s.put(b, b.id))
}

export function getBooks(): Promise<StoredBook[]> {
  return tx('books', 'readonly', (s) => s.getAll())
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
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORES, 'readwrite')
    for (const name of STORES) t.objectStore(name).clear()
    t.oncomplete = () => { db.close(); resolve() }
    t.onerror = () => reject(t.error)
  })
}