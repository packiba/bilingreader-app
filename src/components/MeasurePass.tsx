import { memo, useLayoutEffect, useRef } from 'react'
import type { RenderRow } from '../types'
import type { ExpandMode } from '../store/settings'
import PairRowContent from './PairRowContent'

const ESTIMATED_ROW = 120

// Renders every row once, off-screen but with the exact same markup and width
// the reader uses, and reports each row's real height. The reader list then
// works off this static height map only — it never re-measures rows while the
// user scrolls, so nothing ever shifts under the viewport (the cause of the
// "jumps" the reader had with react-window's incremental measurement).
//
// Measurement is deferred until fonts have loaded: capturing heights while
// the fallback font is active produces stale sizes that stop matching reality
// the moment the real webfont swaps in, which made every row overflow its slot
// and the scroll position drift.
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
  const rowsRef = useRef(rows)
  rowsRef.current = rows

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    let timer = 0
    let lastKey = ''
    const take = () => {
      const heights: number[] = new Array(rowsRef.current.length)
      for (let i = 0; i < rowsRef.current.length; i++) {
        const child = root.children[i] as HTMLElement | undefined
        // Fall back rather than leaving a hole: a missing/zero reading here
        // (e.g. a row whose text happens to be empty, or one the DOM hasn't
        // painted yet) used to leave that index sized at 0 or undefined,
        // which react-window still has to render *some* slot for — visually
        // that's a blank gap where a real row should be while scrolling.
        const h = child?.offsetHeight
        heights[i] = h && h > 0 ? h : ESTIMATED_ROW
      }
      const key = heights.join(',')
      if (key === lastKey) return
      lastKey = key
      onCompleteRef.current(heights)
    }
    const schedule = () => {
      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(take, 0)
    }
    const fonts = document.fonts
    // Measurement must wait for real webfonts: capturing with the fallback
    // font yields sizes that stop matching as soon as the webfont swaps in.
    const ready = fonts ? fonts.ready.then(() => {}) : Promise.resolve()
    ready.then(schedule).catch(schedule)
    fonts?.addEventListener?.('loadingdone', schedule)
    // Safety net in case fonts.ready never settles on some WebKit builds.
    timer = window.setTimeout(take, 2000)
    return () => {
      if (timer) window.clearTimeout(timer)
      fonts?.removeEventListener?.('loadingdone', schedule)
      onCompleteRef.current = () => {}
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-measure-root
      style={{ position: 'absolute', left: -10000, top: 0, width, visibility: 'hidden', pointerEvents: 'none' }}
    >
      {rows.map((_, i) => (
        <div className="rowwrap" key={i}>
          <PairRowContent rows={rows} index={i} dark={false} fontSize={fontSize} expandMode={expandMode} read={false} />
        </div>
      ))}
    </div>
  )
}

export default memo(MeasurePass)