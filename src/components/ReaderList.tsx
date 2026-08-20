import { forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { VariableSizeList as List } from 'react-window'
import type { ListOnItemsRenderedProps } from 'react-window'
import { useReader } from '../store/ReaderProvider'
import PairRow from './PairRow'

const ESTIMATED_ROW = 120
const RESIZE_EPSILON = 1

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

// Wraps a single virtualized row so it can measure its own natural height
// synchronously after layout (useLayoutEffect, not requestAnimationFrame)
// and report it back to the list. This lets the list start rendering
// immediately with estimated sizes instead of first rendering the entire
// book off-screen just to measure every row up front — and it doesn't
// depend on a rAF callback that mobile browsers can defer/throttle while
// a backgrounded PWA is being resumed.
function MeasuredRow({
  index,
  style,
  onMeasured,
  children
}: {
  index: number
  style: React.CSSProperties
  onMeasured: (index: number, height: number) => void
  children: React.ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = innerRef.current
    if (el) onMeasured(index, el.offsetHeight)
  })

  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => onMeasured(index, el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [index, onMeasured])

  return (
    <div style={style}>
      <div ref={innerRef}>{children}</div>
    </div>
  )
}

export default function ReaderList() {
  const { rows, state, onUserScrolled } = useReader()
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const heightsRef = useRef<Map<number, number>>(new Map())
  const lastToken = useRef(0)
  const pendingScroll = useRef<number | null>(null)

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

  // Layout inputs that affect row height changed: forget what we measured
  // and let the currently-visible rows remeasure themselves on their next
  // render, rather than rendering the whole book off-screen again.
  useEffect(() => {
    heightsRef.current.clear()
    listRef.current?.resetAfterIndex(0, true)
  }, [state.bookId, state.columnsSwapped, state.fontSize, state.expandMode])

  const itemSize = useCallback((index: number) => heightsRef.current.get(index) ?? ESTIMATED_ROW, [])

  const handleMeasured = useCallback((index: number, height: number) => {
    if (height <= 0) return
    const prev = heightsRef.current.get(index)
    if (prev != null && Math.abs(prev - height) < RESIZE_EPSILON) return
    heightsRef.current.set(index, height)
    listRef.current?.resetAfterIndex(index, false)
  }, [])

  // Navigate on scrollRequest; retried once the list becomes available if
  // it isn't mounted yet (e.g. container size not measured on first paint).
  //
  // Scrolling always goes through react-window's own scrollToItem, which
  // keeps a single internal cache of row offsets (built up incrementally as
  // rows are actually rendered) and updates it via resetAfterIndex above.
  // A separate, hand-rolled cumulative-offset calculation was used here
  // before to animate "isSlow" scrolls smoothly, but for a book you're deep
  // into, most of the preceding rows have never been rendered/measured, so
  // that calculation fell back to the estimated row height for almost all
  // of them — landing far from the actual next row. Smooth animation is now
  // achieved by toggling CSS `scroll-behavior` on the scroll container
  // instead, so the target offset always comes from the one source of
  // truth (react-window's own metadata).
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

  const onItemsRendered = useCallback((p: ListOnItemsRenderedProps) => {
    onUserScrolled(p.visibleStartIndex)
  }, [onUserScrolled])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {size.width >= 100 && rows.length > 0 ? (
        <List
          ref={listRef}
          height={size.height}
          width={size.width}
          itemCount={rows.length}
          itemSize={itemSize}
          estimatedItemSize={ESTIMATED_ROW}
          overscanCount={4}
          outerElementType={ScrollOuter}
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => (
            <MeasuredRow index={index} style={style} onMeasured={handleMeasured}>
              <PairRow rows={rows} index={index} />
            </MeasuredRow>
          )}
        </List>
      ) : null}
    </div>
  )
}
