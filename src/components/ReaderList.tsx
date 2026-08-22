import { forwardRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { VariableSizeList as List } from 'react-window'
import type { ListOnItemsRenderedProps } from 'react-window'
import { useReader } from '../store/ReaderProvider'
import PairRow from './PairRow'
import MeasurePass from './MeasurePass'

const ESTIMATED_ROW = 120

const ScrollOuter = forwardRef<HTMLDivElement, Record<string, unknown>>((props, ref) => {
  const { children, style, onScroll, onWheel, ...rest } = props as {
    children: React.ReactNode
    style: React.CSSProperties
    onScroll: (e: React.UIEvent) => void
    onWheel?: (e: React.WheelEvent) => void
    [k: string]: unknown
  }
  return (
    <div ref={ref} style={style} onScroll={onScroll} onWheel={onWheel} data-scroll {...rest}>
      {children}
    </div>
  )
})
ScrollOuter.displayName = 'ScrollOuter'

export default function ReaderList() {
  const { rows, state, onUserScrolled } = useReader()
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const heightsRef = useRef<Map<number, number>>(new Map())
  const lastToken = useRef(0)
  const pendingScroll = useRef<number | null>(null)
  const currentPairRef = useRef(state.currentPair)
  currentPairRef.current = state.currentPair

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    // Read the size synchronously on mount instead of waiting only for the
    // ResizeObserver's first (async) callback: on iOS/PWA, when the app is
    // resumed from the home screen, that first callback can be deferred
    // until the next scroll/touch gesture, which left the screen blank
    // until the user scrolled.
    const rect = el.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) setSize({ width: rect.width, height: rect.height })
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Re-measure whenever anything that affects row height changes. The
  // measure pass is fully static (all rows measured up front), so swapping
  // the map and calling resetAfterIndex once is a deliberate reflow, not an
  // incremental correction mid-scroll — the scroll position never shifts
  // under the user afterwards.
  const measureKey = useMemo(
    () => `${state.bookId}|${Math.round(size.width)}|${state.fontSize}|${state.columnsSwapped}|${state.expandMode}`,
    [state.bookId, size.width, state.fontSize, state.columnsSwapped, state.expandMode]
  )
  const measureKeyRef = useRef(measureKey)
  measureKeyRef.current = measureKey
  const snappedForKeyRef = useRef<string | null>(null)

  const handleMeasureComplete = useCallback((heights: number[]) => {
    const m = new Map<number, number>()
    for (let i = 0; i < heights.length; i++) m.set(i, heights[i])
    heightsRef.current = m
    listRef.current?.resetAfterIndex(0, true)
    // A webfont can finish loading in several stages, so MeasurePass may
    // report heights more than once per mount as they get refined. Only
    // correct the scroll position the first time for a given measureKey —
    // that's the one case where the previous heights (estimated, or from a
    // different font/column/book layout) could be far enough off to land on
    // the wrong row. Re-snapping on every later refinement served no purpose
    // and, worse, a programmatic scroll while the user has a finger down on
    // a word gets read by the browser as an interrupted gesture (no
    // pointerup), which was silently breaking tap-to-translate.
    if (snappedForKeyRef.current === measureKeyRef.current) return
    snappedForKeyRef.current = measureKeyRef.current
    const el = containerRef.current?.querySelector('[data-scroll]') as HTMLElement | null
    if (el) el.style.scrollBehavior = 'auto'
    listRef.current?.scrollToItem(currentPairRef.current, 'start')
  }, [])

  const itemSize = useCallback((index: number) => heightsRef.current.get(index) ?? ESTIMATED_ROW, [])

  // Navigate on scrollRequest; retried once the list becomes available if
  // it isn't mounted yet (e.g. container size not measured on first paint).
  //
  // Scrolling always goes through react-window's own scrollToItem, which
  // works off the static height map (see itemSize), so the landing position
  // is exact whether the target rows have ever been on screen or not.
  useEffect(() => {
    const req = state.scrollRequest
    if (!req) return
    if (req.token === lastToken.current) return
    lastToken.current = req.token
    pendingScroll.current = req.index
    if (!listRef.current) return
    const el = containerRef.current?.querySelector('[data-scroll]') as HTMLElement | null
    if (el) el.style.scrollBehavior = req.isSlow ? 'smooth' : 'auto'
    listRef.current.scrollToItem(req.index, 'start')
    pendingScroll.current = null
  }, [state.scrollRequest])

  useEffect(() => {
    if (pendingScroll.current == null) return
    if (!listRef.current) return
    const el = containerRef.current?.querySelector('[data-scroll]') as HTMLElement | null
    if (el) el.style.scrollBehavior = 'auto'
    listRef.current.scrollToItem(pendingScroll.current, 'start')
    pendingScroll.current = null
  }, [size.width, size.height, rows.length])

  const scrollRafRef = useRef<number | null>(null)
  const pendingIndexRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
  }, [])

  const onItemsRendered = useCallback((p: ListOnItemsRenderedProps) => {
    // react-window can call this many times within a single scroll gesture
    // (once per items-range change, which on a long book can be almost
    // every frame). Each call used to dispatch immediately, and every
    // dispatch re-renders the whole reader tree — competing with the
    // browser's own scroll/compositing work on the same frame budget.
    // Coalesce to at most one dispatch per animation frame.
    pendingIndexRef.current = p.visibleStartIndex
    if (scrollRafRef.current != null) return
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null
      if (pendingIndexRef.current != null) onUserScrolled(pendingIndexRef.current)
    })
  }, [onUserScrolled])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {size.width >= 100 && rows.length > 0 && (
        <MeasurePass
          key={measureKey}
          rows={rows}
          width={size.width}
          fontSize={state.fontSize}
          expandMode={state.expandMode}
          onComplete={handleMeasureComplete}
        />
      )}
      {size.width >= 100 && rows.length > 0 && (
        <List
          ref={listRef}
          height={size.height}
          width={size.width}
          itemCount={rows.length}
          itemSize={itemSize}
          estimatedItemSize={ESTIMATED_ROW}
          overscanCount={12}
          outerElementType={ScrollOuter}
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => (
            <div style={style}>
              <PairRow rows={rows} index={index} />
            </div>
          )}
        </List>
      )}
    </div>
  )
}