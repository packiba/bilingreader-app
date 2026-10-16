// Word lookup under a tap, for any script.
type SegmenterCtor = new (locale: string, opts: { granularity: 'word' }) => {
  segment(text: string): Iterable<{ segment: string; index: number; isWordLike?: boolean }>
}

// Finds the word around character offset `off` of `text`. Intl.Segmenter knows
// word boundaries for every script (including ones written without spaces,
// like Japanese or Chinese); the regex fallback handles plain alphabetic text.
export function wordAtOffset(text: string, off: number, lang: string): string | null {
  off = Math.max(0, Math.min(off, text.length))
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter
  if (Segmenter) {
    try {
      let before: string | null = null
      for (const seg of new Segmenter(lang, { granularity: 'word' }).segment(text)) {
        if (!seg.isWordLike) continue
        const end = seg.index + seg.segment.length
        if (off >= seg.index && off < end) return seg.segment.trim() || null
        if (end === off) before = seg.segment
      }
      return before ? before.trim() || null : null
    } catch {
      /* unsupported locale — fall through to the regex path */
    }
  }
  const isLetter = (c: string | undefined) => !!c && /[\p{L}\p{M}\p{N}]/u.test(c)
  const isJoiner = (c: string | undefined) => c === "'" || c === '\u2019' || c === '-'
  let left = off
  let right = off
  while (left > 0 && (isLetter(text[left - 1]) || (isJoiner(text[left - 1]) && isLetter(text[left - 2])))) left--
  while (right < text.length && (isLetter(text[right]) || (isJoiner(text[right]) && isLetter(text[right + 1])))) right++
  const word = text.slice(left, right).trim()
  return word.length > 0 ? word : null
}

function caretFromPoint(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  if (document.caretRangeFromPoint) {
    const r = document.caretRangeFromPoint(x, y)
    if (r) return { node: r.startContainer, offset: r.startOffset }
  }
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y)
    if (p) return { node: p.offsetNode, offset: p.offset }
  }
  return null
}

export function wordAtPoint(container: Element, x: number, y: number, lang: string): string | null {
  const caret = caretFromPoint(x, y)
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE || !container.contains(caret.node)) return null
  return wordAtOffset(caret.node.textContent ?? '', caret.offset, lang)
}
