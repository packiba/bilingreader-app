import { memo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { RenderRow } from '../types'
import { useReaderRow } from '../store/ReaderProvider'
import { IconSpeaker, IconStop } from './icons'
import PairRowContent from './PairRowContent'

const SWIPE_THRESHOLD = 48
const LONG_PRESS_MS = 600

interface GestureState {
  sx: number
  sy: number
  t0: number
  active: boolean
  moved: boolean
  target: Element | null
}

function PairRow({ rows, index }: { rows: RenderRow[]; index: number }) {
  const reader = useReaderRow()
  const read = reader.isRead(index)

  const [dx, setDx] = useState(0)
  const cellRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<GestureState | null>(null)
  const speakerGesture = useRef<GestureState | null>(null)
  const longPressFired = useRef(false)

  const speaking = reader.speakingPair === index
  const speakerColor = speaking && reader.isContinuousReading
    ? 'var(--speech)'
    : speaking
      ? 'var(--accent)'
      : 'var(--text-dimmed)'

  const popup = reader.wordPopup?.index === index ? reader.wordPopup : null

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.target instanceof Element && e.target.closest('.speakerbtn')) return
    const target = e.target instanceof Element ? e.target : null
    gesture.current = { sx: e.clientX, sy: e.clientY, t0: performance.now(), active: false, moved: false, target }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g || e.target instanceof Element && (e.target as Element).closest('.speakerbtn')) return
    const dxv = e.clientX - g.sx
    const dyv = e.clientY - g.sy
    if (!g.active && Math.hypot(dxv, dyv) > 14) {
      g.active = true
      g.moved = true
    }
    if (g.active) {
      if (Math.abs(dxv) > Math.abs(dyv) && Math.abs(dxv) > SWIPE_THRESHOLD) {
        if (dxv < 0) reader.markAsReadAndNext(index)
        else reader.markAsUnread(index)
        gesture.current = null
        setDx(0)
      } else if (Math.abs(dxv) > Math.abs(dyv)) {
        setDx(dxv)
      } else {
        setDx(0)
      }
    }
  }

  const lastTapHandledAt = useRef(0)

  const tryOpenWord = (clientX: number, clientY: number, target: Element | null) => {
    if (!target) return
    const textEl = target.closest('.rowtext, .chapterhead')
    if (!textEl) return
    const word = wordAtPoint(textEl, clientX, clientY)
    if (!word) return
    const isBulgarian = !!target.closest('.bglang')
    const x = Math.max(8, Math.min(clientX, window.innerWidth - 250))
    const y = Math.min(clientY + 12, window.innerHeight - 120)
    reader.showWordPopup(index, word, isBulgarian, x, y)
    lastTapHandledAt.current = performance.now()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gesture.current
    gesture.current = null
    setDx(0)
    if (!g || g.moved) return
    const target = e.target instanceof Element ? e.target : null
    if (!target) return
    if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return
    tryOpenWord(e.clientX, e.clientY, target)
  }

  const CANCEL_AS_TAP_MS = 300

  const onPointerCancel = () => {
    // touch-action: pan-y exists so vertical scrolling stays native/smooth,
    // but that same setting lets the browser claim ANY touch with even a
    // couple of pixels of natural finger jitter as "the user is starting to
    // scroll" — and once it does, it fires pointercancel instead of
    // pointerup, with no compatibility click afterwards either. On a real
    // touchscreen this happens on nearly every tap (fingers always jitter a
    // little); a mouse or an automated test never jitters, which is why the
    // pointerup/click path above works perfectly there and nowhere else.
    // If the cancel arrives almost immediately and the pointer hadn't
    // already moved past the swipe-detection threshold, it's actually a tap
    // that got misclassified as a scroll — so open the word using the
    // coordinates captured at pointerdown, before any claim happened.
    const g = gesture.current
    gesture.current = null
    setDx(0)
    if (!g || g.moved || performance.now() - g.t0 >= CANCEL_AS_TAP_MS) return
    tryOpenWord(g.sx, g.sy, g.target)
  }

  // WebKit/iOS occasionally decides a still finger is the start of the
  // page's own vertical scroll (touch-action: pan-y invites this) and
  // cancels the pointer sequence instead of delivering pointerup — so the
  // logic above silently never runs, even though nothing actually scrolled
  // and the user experiences it as a plain tap doing nothing. A native
  // click event is far more reliably delivered by Safari for a genuine tap
  // even in that case, so it's used here as a fallback. Guarded against
  // double-firing (the pointer path already handled it a moment earlier)
  // and against firing on a real drag/swipe, which browsers don't follow
  // with a synthesized click.
  const onClick = (e: React.MouseEvent) => {
    if (performance.now() - lastTapHandledAt.current < 500) return
    if (e.target instanceof Element && e.target.closest('.speakerbtn, .popup')) return
    tryOpenWord(e.clientX, e.clientY, e.target instanceof Element ? e.target : null)
  }

  const onSpeakerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    speakerGesture.current = { sx: e.clientX, sy: e.clientY, t0: performance.now(), active: false, moved: false, target: null }
    longPressFired.current = false
  }

  const onSpeakerUp = (e: React.PointerEvent) => {
    e.stopPropagation()
    const g = speakerGesture.current
    speakerGesture.current = null
    if (!g) return
    const dt = performance.now() - g.t0
    const moved = Math.hypot(e.clientX - g.sx, e.clientY - g.sy)
    if (dt >= LONG_PRESS_MS && moved < 10) {
      longPressFired.current = true
      reader.startContinuousReading(index)
    }
  }

  const onSpeakerClick = () => {
    if (longPressFired.current) {
      longPressFired.current = false
      return
    }
    reader.toggleSpeak(index)
  }

  const expand = reader.expandMode as 'SRC' | 'TGT' | 'NONE' | 'AWAITING'

  return (
    <div
      ref={cellRef}
      className={`rowwrap ${index % 2 === 1 ? 'zebra' : ''} ${read ? 'dimmed' : ''}`}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
    >
      <PairRowContent
        rows={rows}
        index={index}
        dark={reader.dark}
        fontSize={reader.fontSize}
        expandMode={expand}
        read={read}
        dx={dx}
        speaker={
          <button
            className="iconbtn speakerbtn"
            style={{ position: 'absolute', top: 2, right: 2, width: 30, height: 30, color: speakerColor, background: 'transparent' }}
            onPointerDown={onSpeakerDown}
            onPointerUp={onSpeakerUp}
            onPointerCancel={() => { speakerGesture.current = null; longPressFired.current = false }}
            onClick={onSpeakerClick}
          >
            {speaking ? <IconStop size={16} /> : <IconSpeaker size={16} />}
          </button>
        }
      />
      {popup && createPortal(
        <div className="popup" style={{ left: popup.x, top: popup.y }} onClick={() => reader.closeWordPopup()}>
          <div className="wrap">
            <div className="word">{popup.word}</div>
            {popup.result === 'loading' && <div className="body">…</div>}
            {popup.result === 'done' && <div className="body">{popup.text}</div>}
            {popup.result === 'err' && <div className="err">Не удалось перевести</div>}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default memo(PairRow)

function wordAtPoint(container: Element, x: number, y: number): string | null {
  const caret = document.caretRangeFromPoint
  const range = caret ? caret.call(document, x, y) : null
  const node = range ? range.startContainer : null
  if (node && node.nodeType === Node.TEXT_NODE && node.parentElement && container.contains(node)) {
    const text = node.textContent ?? ''
    let off = range ? range.startOffset : 0
    off = Math.min(off, text.length)
    let left = off
    let right = off
    const isLetter = (c: string) => /[A-Za-zА-Яа-яЁё]/.test(c)
    while (left > 0 && isLetter(text[left - 1])) left--
    while (right < text.length && isLetter(text[right])) right++
    const word = text.slice(left, right).trim()
    return word.length > 0 ? word : null
  }
  // Fallback: pick the deepest element at point and pull a word from its text
  const el = document.elementFromPoint(x, y)
  const textEl = el?.closest('.rowtext, .chapterhead')
  if (textEl) {
    const text = textEl.textContent ?? ''
    const m = text.match(/[A-Za-zА-Яа-яЁё]+/u)
    return m ? m[0] : null
  }
  return null
}