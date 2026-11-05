import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RenderRow } from '../types'
import type { ExpandMode } from '../store/settings'
import PairRowContent from './PairRowContent'

const ESTIMATED_ROW = 120
// Rows are measured in small batches and only CHUNK rows are ever in the DOM
// at once. Previously the whole book (tens of thousands of nodes) was mounted
// off-screen in one go and then left mounted for the life of the page, which
// froze the main thread on every re-measure and kept a huge hidden DOM in
// memory on the iPad.
const CHUNK = 100

// Renders rows off-screen, with the exact same markup and width the reader
// uses, and reports every row's real height. The reader list then works off
// this static height map only — it never re-measures while the user scrolls.
function MeasurePass({
  rows,
  width,
  fontSize,
  expandMode,
  onComplete
}: {
  rows: RenderRow[]
  width: number
  fontSize: number
  expandMode: ExpandMode | 'AWAITING'
  onComplete: (heights: number[]) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const heightsRef = useRef<number[]>([])
  const [ready, setReady] = useState(false)
  const [start, setStart] = useState(0)

  // Wait for webfonts (if any) so heights match the final glyph metrics;
  // never wait longer than 1.5 s in case fonts.ready stalls on WebKit.
  useEffect(() => {
    let cancelled = false
    const go = () => { if (!cancelled) setReady(true) }
    const timer = window.setTimeout(go, 1500)
    const fonts = document.fonts
    if (fonts?.ready) fonts.ready.then(go, go)
    else go()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [])

  useLayoutEffect(() => {
    if (!ready) return
    const root = rootRef.current
    if (!root) return
    const end = Math.min(start + CHUNK, rows.length)
    for (let i = start; i < end; i++) {
      const h = (root.children[i - start] as HTMLElement | undefined)?.offsetHeight
      heightsRef.current[i] = h && h > 0 ? h : ESTIMATED_ROW
    }
    if (end >= rows.length) {
      onCompleteRef.current(heightsRef.current.slice(0, rows.length))
      return
    }
    // Yield to the browser between batches so scrolling/touches stay alive.
    // requestAnimationFrame guarantees a paint/input opportunity between
    // batches; a chain of zero-delay timers can otherwise starve rendering on
    // slower mobile WebKit devices.
    const frame = window.requestAnimationFrame(() => setStart(end))
    return () => window.cancelAnimationFrame(frame)
  }, [ready, start, rows])

  const end = Math.min(start + CHUNK, rows.length)
  const slice: number[] = []
  if (ready) for (let i = start; i < end; i++) slice.push(i)

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-measure-root
      style={{ position: 'absolute', left: -10000, top: 0, width, visibility: 'hidden', pointerEvents: 'none' }}
    >
      {slice.map((i) => (
        <div className="rowwrap" key={i}>
          <PairRowContent rows={rows} index={i} dark={false} fontSize={fontSize} expandMode={expandMode} read={false} />
        </div>
      ))}
    </div>
  )
}

export default memo(MeasurePass)
