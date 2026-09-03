import { useEffect, useState } from 'react'
import { getTapLog, clearTapLog } from './tapLog'

// Visible-on-device diagnostic overlay. Shows exactly what pointer/click
// events the app is receiving in real time, so this can be checked directly
// on a phone or tablet without a computer, cable, or devtools.
export default function TapDebugOverlay() {
  const [log, setLog] = useState<string[]>(getTapLog())

  useEffect(() => {
    const onLog = () => setLog(getTapLog())
    window.addEventListener('taplog', onLog)
    return () => window.removeEventListener('taplog', onLog)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        maxHeight: '32vh',
        overflowY: 'auto',
        background: 'rgba(0,0,0,0.88)',
        color: '#7CFC7C',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        padding: '6px 8px',
        pointerEvents: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', marginBottom: 2 }}>
        <span>tap debug (tap a word, then read below)</span>
        <span onClick={clearTapLog} style={{ textDecoration: 'underline' }}>clear</span>
      </div>
      {log.length === 0 && <div style={{ color: '#777' }}>no events yet — tap a word above</div>}
      {log.map((line, i) => (
        <div key={i}>{line}</div>
      ))}
    </div>
  )
}
