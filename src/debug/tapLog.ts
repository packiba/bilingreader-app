// Minimal on-device diagnostic log for touch/pointer events. Exists only to
// let us SEE, directly on a phone or tablet screen with no devtools
// available, which events actually reach the app when the user taps a word —
// instead of continuing to guess from a desktop simulation that can't
// reproduce real finger jitter.
const MAX_ENTRIES = 14
let entries: string[] = []

export function pushTapLog(entry: string) {
  const t = new Date()
  const ts = `${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(t.getMilliseconds()).padStart(3, '0')}`
  entries = [...entries, `${ts}  ${entry}`].slice(-MAX_ENTRIES)
  window.dispatchEvent(new CustomEvent('taplog'))
}

export function getTapLog(): string[] {
  return entries
}

export function clearTapLog() {
  entries = []
  window.dispatchEvent(new CustomEvent('taplog'))
}
