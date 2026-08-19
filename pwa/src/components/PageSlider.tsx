import { useRef, useState } from 'react'
import { useReader } from '../store/ReaderProvider'

export default function PageSlider() {
  const { state, chapterStarts, setCurrentPair } = useReader()
  const [drag, setDrag] = useState(false)
  const [dragVal, setDragVal] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!state.book) return null
  const total = Math.max(state.book.totalPairs, 1)
  const shown = drag ? dragVal : Math.max(0, Math.min(state.currentPair, total - 1))
  const pct = total > 1 ? (shown / (total - 1)) * 100 : 0

  const onPointerDown = () => {
    setDrag(true)
    setDragVal(Math.max(0, Math.min(state.currentPair, total - 1)))
  }
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDragVal(Number(e.target.value))
  }
  const release = () => {
    if (!drag) return
    setDrag(false)
    setCurrentPair(Math.max(0, Math.min(dragVal, total - 1)))
  }

  return (
    <div className="sliderrow">
      <input
        ref={inputRef}
        type="range"
        min={0}
        max={total - 1}
        value={shown}
        className="slider"
        onChange={onChange}
        onPointerDown={onPointerDown}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={() => { if (drag) release() }}
      />
      <div className="slidervis" aria-hidden>
        <div className="trackline" />
        {chapterStarts.map((s) => (
          <div key={s} className="tick" style={{ left: `${total > 1 ? (s / (total - 1)) * 100 : 0}%` }} />
        ))}
        <div className="thumb" style={{ left: `${pct}%` }} />
      </div>
      <span className="count">{shown + 1} / {total}</span>
    </div>
  )
}