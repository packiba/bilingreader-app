import { useEffect, useRef, useState, useCallback } from 'react'
import { VariableSizeList as List } from 'react-window'
import type { ListOnItemsRenderedProps } from 'react-window'
import { useReader } from '../store/ReaderProvider'
import PairRow from './PairRow'

const ESTIMATED_ROW = 120

export default function ReaderList() {
  const { rows, state, onUserScrolled } = useReader()
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<List>(null)
  const [size, setSize] = useState({ width: 1, height: 1 })
  const [heights, setHeights] = useState<number[] | null>(null)
  const lastToken = useRef(0)
  const pendingScroll = useRef<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ width: r.width, height: r.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Reset measurement when the layout inputs change
  useEffect(() => {
    setHeights(null)
    pendingScroll.current = state.scrollRequest?.index ?? state.currentPair
  }, [state.bookId, state.columnsSwapped, state.fontSize, state.expandMode])

  // Measure rows once sizes are known
  useEffect(() => {
    if (size.width < 100) return
    if (heights != null) return
    const root = measureRef.current
    if (!root) return
    const raf = requestAnimationFrame(() => {
      const hs: number[] = []
      const children = Array.from(root.children) as HTMLElement[]
      for (let i = 0; i < children.length; i++) {
        hs.push(children[i].offsetHeight || ESTIMATED_ROW)
      }
      setHeights(hs)
    })
    return () => cancelAnimationFrame(raf)
  }, [size.width, heights, state.bookId, state.columnsSwapped, state.fontSize, state.expandMode])

  const itemSize = useCallback((index: number) => {
    return heights ? heights[index] ?? ESTIMATED_ROW : ESTIMATED_ROW
  }, [heights])

  // Navigate on scrollRequest; defer until heights are measured
  useEffect(() => {
    const req = state.scrollRequest
    if (!req) return
    if (req.token === lastToken.current) return
    lastToken.current = req.token
    if (heights == null) {
      pendingScroll.current = req.index
      return
    }
    listRef.current?.scrollToItem(req.index, 'start')
  }, [state.scrollRequest, heights])

  useEffect(() => {
    if (heights == null) return
    if (pendingScroll.current != null) {
      listRef.current?.scrollToItem(pendingScroll.current, 'start')
      pendingScroll.current = null
    }
  }, [heights])

  const onItemsRendered = useCallback((p: ListOnItemsRenderedProps) => {
    onUserScrolled(p.visibleStartIndex)
  }, [onUserScrolled])

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0 }}>
      {heights == null && size.width >= 100 ? (
        <div
          ref={measureRef}
          style={{ position: 'absolute', left: -20000, top: 0, width: size.width, visibility: 'hidden', pointerEvents: 'none' }}
          aria-hidden
        >
          {rows.map((_r, i) => (
            <div key={i} style={{ width: size.width }}>
              <PairRow rows={rows} index={i} />
            </div>
          ))}
        </div>
      ) : null}
      {heights != null && rows.length > 0 ? (
        <List
          ref={listRef}
          height={size.height}
          width={size.width}
          itemCount={rows.length}
          itemSize={itemSize}
          overscanCount={4}
          onItemsRendered={onItemsRendered}
        >
          {({ index, style }) => (
            <div style={style}>
              <PairRow rows={rows} index={index} />
            </div>
          )}
        </List>
      ) : null}
    </div>
  )
}