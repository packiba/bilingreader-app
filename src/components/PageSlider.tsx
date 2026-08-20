import { useRef, useState } from 'react'
import { useReader } from '../store/ReaderProvider'

const clamp = (v: number, max: number) => Math.max(0, Math.min(v, max))

export default function PageSlider({ onDragPreview }: { onDragPreview?: (index: number | null) => void }) {
  const { state, chapterStarts, setCurrentPair } = useReader()
  const [drag, setDrag] = useState(false)
  const [dragVal, setDragVal] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)

  if (!state.book) return null
  const total = Math.max(state.book.totalPairs, 1)
  const shown = drag ? dragVal : clamp(state.currentPair, total - 1)
  const pct = total > 1 ? (shown / (total - 1)) * 100 : 0

  const indexFromClientX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return clamp(state.currentPair, total - 1)
    const ratio = (clientX - rect.left) / rect.width
    return clamp(Math.round(ratio * (total - 1)), total - 1)
  }

  const update = (idx: number) => {
    setDragVal(idx)
    onDragPreview?.(idx)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    try { trackRef.current?.setPointerCapture(e.pointerId) } catch { /* ignore */ }
    setDrag(true)
    update(indexFromClientX(e.clientX))
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    update(indexFromClientX(e.clientX))
  }

  const release = (e: React.PointerEvent) => {
    if (!drag) return
    setDrag(false)
    setCurrentPair(dragVal)
    onDragPreview?.(null)
    try { trackRef.current?.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
  }

  return (
    <div
      ref={trackRef}
      className="slidertrack"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div className="slidervis" aria-hidden>
        <div className="trackline" />
        {chapterStarts.map((s) => (
          <div key={s} className="tick" style={{ left: `${total > 1 ? (s / (total - 1)) * 100 : 0}%` }} />
        ))}
        <div className="thumb" style={{ left: `${pct}%` }} />
      </div>
    </div>
  )
}