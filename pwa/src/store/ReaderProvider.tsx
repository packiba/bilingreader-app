import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { Book, RenderRow } from '../types'
import { buildRenderRows, computeChapterStarts, parseBook } from '../parser/bookParser'
import * as db from './db'
import type { StoredBook } from './db'
import { loadSettings, saveSettings } from './settings'
import type { ExpandMode } from './settings'
import { createTts } from '../tts/tts'
import type { TtsController } from '../tts/tts'
import { translateWord } from '../translate/translate'

export interface ReaderState {
  books: StoredBook[]
  book: Book | null
  bookId: string | null
  fileName: string
  currentPair: number
  fontSize: number
  dark: boolean
  columnsSwapped: boolean
  expandMode: ExpandMode
  readThrough: number
  readExceptions: number[]
  speakingPair: number | null
  isContinuousReading: boolean
  isLoading: boolean
  isImporting: boolean
  error: string | null
  scrollRequest: { index: number; token: number; isSlow: boolean } | null
}

function initialSettings() {
  const s = loadSettings()
  return {
    fontSize: s.fontSize,
    dark: s.dark,
    columnsSwapped: s.columnsSwapped,
    expandMode: s.expandMode
  }
}

const initialState: ReaderState = {
  books: [],
  book: null,
  bookId: null,
  fileName: '',
  currentPair: 0,
  ...initialSettings(),
  readThrough: -1,
  readExceptions: [],
  speakingPair: null,
  isContinuousReading: false,
  isLoading: false,
  isImporting: false,
  error: null,
  scrollRequest: null
}

type Action =
  | { type: 'SET_BOOKS'; books: StoredBook[] }
  | { type: 'SET_LOADING'; v: boolean }
  | { type: 'SET_IMPORTING'; v: boolean }
  | { type: 'SET_ERROR'; message: string | null }
  | { type: 'OPENED'; book: Book; bookId: string; fileName: string; progress: db.BookProgress }
  | { type: 'CLOSED' }
  | { type: 'SCROLL'; index: number; isSlow: boolean }
  | { type: 'USER_SCROLLED'; index: number }
  | { type: 'READ'; index: number }
  | { type: 'UNREAD'; index: number }
  | { type: 'FONT'; size: number }
  | { type: 'THEME'; dark: boolean }
  | { type: 'COLUMNS'; swapped: boolean }
  | { type: 'EXPAND'; mode: ExpandMode }
  | { type: 'SPEAK'; index: number | null; continuous: boolean }

function reducer(s: ReaderState, a: Action): ReaderState {
  switch (a.type) {
    case 'SET_BOOKS': return { ...s, books: a.books }
    case 'SET_LOADING': return { ...s, isLoading: a.v }
    case 'SET_IMPORTING': return { ...s, isImporting: a.v }
    case 'SET_ERROR': return { ...s, error: a.message }
    case 'OPENED': {
      const maxPair = Math.max(a.book.totalPairs - 1, 0)
      const restore = Math.min(a.progress.lastPair, maxPair)
      return {
        ...s,
        book: a.book,
        bookId: a.bookId,
        fileName: a.fileName,
        currentPair: restore,
        readThrough: a.progress.readThrough,
        readExceptions: a.progress.readExceptions,
        speakingPair: null,
        isContinuousReading: false,
        isLoading: false,
        isImporting: false,
        scrollRequest: { index: restore, token: (s.scrollRequest?.token ?? 0) + 1, isSlow: false }
      }
    }
    case 'CLOSED':
      return {
        ...initialState,
        books: s.books,
        dark: s.dark,
        fontSize: s.fontSize,
        columnsSwapped: s.columnsSwapped,
        expandMode: s.expandMode
      }
    case 'SCROLL':
      return { ...s, currentPair: a.index, scrollRequest: { index: a.index, token: (s.scrollRequest?.token ?? 0) + 1, isSlow: a.isSlow } }
    case 'USER_SCROLLED':
      return s.currentPair === a.index ? s : { ...s, currentPair: a.index }
    case 'READ': {
      const clamped = a.index
      if (clamped <= s.readThrough && !s.readExceptions.includes(clamped)) return s
      return {
        ...s,
        readThrough: Math.max(s.readThrough, clamped),
        readExceptions: s.readExceptions.filter((i) => i > clamped)
      }
    }
    case 'UNREAD':
      return a.index <= s.readThrough ? { ...s, readExceptions: [...new Set([...s.readExceptions, a.index])] } : s
    case 'FONT': return { ...s, fontSize: a.size }
    case 'THEME': return { ...s, dark: a.dark }
    case 'COLUMNS': return { ...s, columnsSwapped: a.swapped }
    case 'EXPAND': return { ...s, expandMode: a.mode }
    case 'SPEAK': return { ...s, speakingPair: a.index, isContinuousReading: a.continuous }
  }
}

function isRead(s: ReaderState, index: number): boolean {
  return index <= s.readThrough && !s.readExceptions.includes(index)
}

export interface WordPopupState {
  index: number
  x: number
  y: number
  word: string
  result: 'loading' | 'done' | 'err'
  text?: string
}

interface ReaderContextValue {
  state: ReaderState
  rows: RenderRow[]
  chapterStarts: number[]
  isRead: (index: number) => boolean
  importFile: (file: File) => Promise<void>
  openBook: (id: string) => Promise<void>
  deleteBook: (id: string) => Promise<void>
  closeBook: () => void
  markAsReadAndNext: (index: number) => void
  markAsUnread: (index: number) => void
  onUserScrolled: (index: number) => void
  setCurrentPair: (index: number, isSlow?: boolean) => void
  goToPrevChapter: () => void
  goToNextChapter: () => void
  toggleTheme: () => void
  toggleColumns: () => void
  toggleExpandMode: () => void
  expandColumn: (mode: 'SRC' | 'TGT') => void
  setFontSize: (n: number) => void
  toggleSpeak: (index: number) => void
  startContinuousReading: (index: number) => void
  stopSpeaking: () => void
  translateWordAction: (word: string, isBulgarian: boolean) => Promise<string>
  dismissError: () => void
  wordPopup: WordPopupState | null
  showWordPopup: (index: number, word: string, isBulgarian: boolean, x: number, y: number) => void
  closeWordPopup: () => void
}

const ReaderContext = createContext<ReaderContextValue | null>(null)

export function useReader(): ReaderContextValue {
  const ctx = useContext(ReaderContext)
  if (!ctx) throw new Error('useReader must be used within ReaderProvider')
  return ctx
}

export function ReaderProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const stateRef = useRef(state)
  stateRef.current = state
  const persistTimer = useRef<number | null>(null)
  const ttsRef = useRef<TtsController | null>(null)
  // Lives outside the reducer: purely transient UI state, not persisted, and
  // deliberately a single shared slot (not per-row local state) so opening a
  // translation on one word always replaces whatever popup was already open
  // instead of stacking up — a row's local useState couldn't do that, since
  // each virtualized row is its own independent component instance.
  const [wordPopup, setWordPopup] = useState<WordPopupState | null>(null)
  const popupToken = useRef(0)

  const closeWordPopup = useCallback(() => {
    popupToken.current++
    setWordPopup(null)
  }, [])

  const showWordPopup = useCallback((index: number, word: string, isBulgarian: boolean, x: number, y: number) => {
    const token = ++popupToken.current
    setWordPopup({ index, x, y, word, result: 'loading' })
    translateWord(word, isBulgarian).then(
      (t) => { if (popupToken.current === token) setWordPopup((p) => (p ? { ...p, result: 'done', text: t } : p)) },
      () => { if (popupToken.current === token) setWordPopup((p) => (p ? { ...p, result: 'err' } : p)) }
    )
  }, [])

  const flush = useCallback((s: ReaderState) => {
    if (!s.bookId || !s.book) return
    db.putProgress(s.bookId, {
      lastPair: s.currentPair,
      readThrough: s.readThrough,
      readExceptions: s.readExceptions
    })
  }, [])

  const schedulePersist = useCallback(() => {
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    persistTimer.current = window.setTimeout(() => {
      persistTimer.current = null
      flush(stateRef.current)
    }, 500)
  }, [flush])

  const advanceContinuous = useCallback((from: number) => {
    const s = stateRef.current
    const nextIdx = from + 1
    const nextText = s.book?.bulgarianPairs[nextIdx]
    if (nextText == null) {
      dispatch({ type: 'SPEAK', index: null, continuous: false })
      return
    }
    dispatch({ type: 'SPEAK', index: nextIdx, continuous: true })
    dispatch({ type: 'SCROLL', index: nextIdx, isSlow: true })
    ttsRef.current?.speak(nextText)
  }, [])

  if (!ttsRef.current) {
    const tts = createTts()
    tts.onDone = () => {
      const s = stateRef.current
      if (s.isContinuousReading && s.speakingPair != null) {
        advanceContinuous(s.speakingPair)
      } else {
        dispatch({ type: 'SPEAK', index: null, continuous: false })
      }
    }
    tts.onError = () => dispatch({ type: 'SPEAK', index: null, continuous: false })
    tts.onMissingVoice = () => {
      dispatch({ type: 'SPEAK', index: null, continuous: false })
      dispatch({ type: 'SET_ERROR', message: 'Болгарский голос для чтения вслух не найден на этом устройстве' })
    }
    ttsRef.current = tts
  }

  useEffect(() => {
    const onHide = () => {
      if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
      flush(stateRef.current)
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flush])

  useEffect(() => {
    db.getBooks().then((books) => dispatch({ type: 'SET_BOOKS', books }))
    db.getMeta('lastBookId').then((id) => {
      if (id) openBook(id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openBook = useCallback(async (id: string) => {
    dispatch({ type: 'SET_LOADING', v: true })
    try {
      const stored = await db.getBook(id)
      if (!stored) throw new Error('Книга не найдена')
      const book = parseBook(stored.rawJson)
      const progress = (await db.getProgress(id)) ?? { lastPair: 0, readThrough: -1, readExceptions: [] }
      await db.setMeta('lastBookId', id).catch(() => {})
      dispatch({ type: 'OPENED', book, bookId: id, fileName: stored.name, progress })
    } catch (e) {
      dispatch({ type: 'SET_LOADING', v: false })
      dispatch({ type: 'SET_ERROR', message: e instanceof Error ? e.message : 'Не удалось открыть книгу' })
    }
  }, [])

  const importFile = useCallback(async (file: File) => {
    dispatch({ type: 'SET_IMPORTING', v: true })
    try {
      const text = await file.text()
      const book = parseBook(text)
      const id = `${file.name}-${Date.now()}`
      await db.putBook({ id, name: file.name.replace(/\.json$/i, ''), rawJson: text, importedAt: Date.now(), totalPairs: book.totalPairs })
      const books = await db.getBooks()
      dispatch({ type: 'SET_BOOKS', books })
      await openBook(id)
    } catch (e) {
      dispatch({ type: 'SET_IMPORTING', v: false })
      dispatch({ type: 'SET_ERROR', message: e instanceof Error ? e.message : 'Не удалось открыть файл' })
    }
  }, [openBook])

  const deleteBook = useCallback(async (id: string) => {
    await db.deleteBook(id)
    const books = await db.getBooks()
    dispatch({ type: 'SET_BOOKS', books })
    if (stateRef.current.bookId === id) {
      dispatch({ type: 'CLOSED' })
    }
  }, [])

  const closeBook = useCallback(() => {
    flush(stateRef.current)
    if (persistTimer.current != null) window.clearTimeout(persistTimer.current)
    dispatch({ type: 'CLOSED' })
  }, [flush])

  const chapterStarts = useMemo(
    () => (state.book ? computeChapterStarts(state.book, state.columnsSwapped) : []),
    [state.book, state.columnsSwapped]
  )

  const rows = useMemo(
    () => (state.book ? buildRenderRows(state.book, state.columnsSwapped) : []),
    [state.book, state.columnsSwapped]
  )

  const markAsReadAndNext = useCallback((index: number) => {
    const s = stateRef.current
    const total = s.book?.totalPairs ?? 0
    const clamped = Math.max(0, Math.min(index, total - 1))
    dispatch({ type: 'READ', index: clamped })
    if (clamped + 1 < total) {
      dispatch({ type: 'SCROLL', index: clamped + 1, isSlow: true })
    }
    schedulePersist()
  }, [schedulePersist])

  const markAsUnread = useCallback((index: number) => {
    dispatch({ type: 'UNREAD', index })
    schedulePersist()
  }, [schedulePersist])

  const onUserScrolled = useCallback((index: number) => {
    dispatch({ type: 'USER_SCROLLED', index })
    schedulePersist()
  }, [schedulePersist])

  const setCurrentPair = useCallback((index: number, isSlow = false) => {
    const s = stateRef.current
    const total = s.book?.totalPairs ?? 0
    dispatch({ type: 'SCROLL', index: Math.max(0, Math.min(index, total - 1)), isSlow })
    schedulePersist()
  }, [schedulePersist])

  const goToPrevChapter = useCallback(() => {
    const s = stateRef.current
    if (chapterStarts.length === 0) return
    const cur = s.currentPair
    const curStart = [...chapterStarts].reverse().find((v) => v <= cur)
    if (curStart == null) return
    const prev = cur === curStart
      ? chapterStarts[Math.max(0, chapterStarts.indexOf(curStart) - 1)]
      : curStart
    if (prev !== cur) setCurrentPair(prev)
  }, [chapterStarts, setCurrentPair])

  const goToNextChapter = useCallback(() => {
    const s = stateRef.current
    if (chapterStarts.length === 0) return
    const cur = s.currentPair
    const curStart = [...chapterStarts].reverse().find((v) => v <= cur)
    if (curStart == null) return
    const idx = chapterStarts.indexOf(curStart)
    const next = idx < chapterStarts.length - 1 ? chapterStarts[idx + 1] : cur
    if (next !== cur) setCurrentPair(next)
  }, [chapterStarts, setCurrentPair])

  const toggleTheme = useCallback(() => {
    const next = !stateRef.current.dark
    dispatch({ type: 'THEME', dark: next })
    saveSettings({ ...loadSettings(), dark: next })
  }, [])

  const toggleColumns = useCallback(() => {
    const next = !stateRef.current.columnsSwapped
    dispatch({ type: 'COLUMNS', swapped: next })
    saveSettings({ ...loadSettings(), columnsSwapped: next })
  }, [])

  const toggleExpandMode = useCallback(() => {
    const cur = stateRef.current.expandMode
    const next = cur === 'NONE' ? 'AWAITING' : 'NONE'
    dispatch({ type: 'EXPAND', mode: next })
    if (next === 'NONE') saveSettings({ ...loadSettings(), expandMode: 'NONE' })
  }, [])

  const expandColumn = useCallback((mode: Extract<ExpandMode, 'SRC' | 'TGT'>) => {
    dispatch({ type: 'EXPAND', mode })
    saveSettings({ ...loadSettings(), expandMode: mode })
  }, [])

  const setFontSize = useCallback((n: number) => {
    const size = Math.max(12, Math.min(24, n))
    dispatch({ type: 'FONT', size })
    saveSettings({ ...loadSettings(), fontSize: size })
  }, [])

  const toggleSpeak = useCallback((index: number) => {
    const s = stateRef.current
    if (s.speakingPair === index) {
      ttsRef.current?.stop()
      dispatch({ type: 'SPEAK', index: null, continuous: false })
      return
    }
    const text = s.book?.bulgarianPairs[index]
    if (text == null) return
    dispatch({ type: 'SPEAK', index, continuous: false })
    ttsRef.current?.speak(text)
  }, [])

  const startContinuousReading = useCallback((index: number) => {
    const s = stateRef.current
    const text = s.book?.bulgarianPairs[index]
    if (text == null) return
    dispatch({ type: 'SPEAK', index, continuous: true })
    ttsRef.current?.speak(text)
  }, [])

  const stopSpeaking = useCallback(() => {
    ttsRef.current?.stop()
    dispatch({ type: 'SPEAK', index: null, continuous: false })
  }, [])

  const translateWordAction = useCallback((word: string, isBulgarian: boolean) => translateWord(word, isBulgarian), [])

  const dismissError = useCallback(() => dispatch({ type: 'SET_ERROR', message: null }), [])

  const value: ReaderContextValue = {
    state, rows, chapterStarts,
    isRead: (index) => isRead(state, index),
    importFile, openBook, deleteBook, closeBook,
    markAsReadAndNext, markAsUnread, onUserScrolled, setCurrentPair,
    goToPrevChapter, goToNextChapter,
    toggleTheme, toggleColumns, toggleExpandMode, expandColumn, setFontSize,
    toggleSpeak, startContinuousReading, stopSpeaking, translateWordAction, dismissError,
    wordPopup, showWordPopup, closeWordPopup
  }

  return <ReaderContext.Provider value={value}>{children}</ReaderContext.Provider>
}