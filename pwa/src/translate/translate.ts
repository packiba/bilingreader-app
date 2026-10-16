import { mtCode } from '../languages'

type Provider = 'google' | 'mymemory' | 'libre'

const cache = new Map<string, string>()

// Google's public "gtx" client endpoint. Undocumented, but it's a plain GET
// with no custom headers, so it never triggers a CORS preflight, and Google
// answers it with Access-Control-Allow-Origin: * — unlike MyMemory and the
// public LibreTranslate instance, which either omit CORS headers entirely or
// (LibreTranslate) now gate most traffic behind an API key. This is the
// primary source; the other two stay on as fallbacks in case this endpoint
// is ever rate-limited or unreachable on a given network.
async function googleGtx(word: string, from: string, to: string, signal: AbortSignal): Promise<string> {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    encodeURIComponent(mtCode(from, 'google')) + '&tl=' + encodeURIComponent(mtCode(to, 'google')) +
    '&dt=t&q=' + encodeURIComponent(word)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Google ${res.status}`)
  const data = (await res.json()) as unknown
  const text = Array.isArray(data) && Array.isArray(data[0])
    ? data[0].map((seg: unknown) => Array.isArray(seg) ? seg[0] : '').join('').trim()
    : ''
  if (!text || text.toLowerCase() === word.toLowerCase()) throw new Error('no translation')
  return text
}

async function myMemory(word: string, from: string, to: string, signal: AbortSignal): Promise<string> {
  const pair = `${mtCode(from, 'mymemory')}|${mtCode(to, 'mymemory')}`
  const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(word) + '&langpair=' + encodeURIComponent(pair)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`MyMemory ${res.status}`)
  const data = (await res.json()) as {
    responseStatus?: number
    responseData?: { translatedText?: string }
  }
  const ok = data.responseStatus === 200 || data.responseStatus === undefined
  const text = data.responseData?.translatedText?.trim()
  if (!ok || !text || text.toLowerCase() === word.toLowerCase()) throw new Error('no translation')
  return text
}

async function libreTranslate(word: string, from: string, to: string, signal: AbortSignal): Promise<string> {
  const res = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: word, source: mtCode(from, 'libre'), target: mtCode(to, 'libre'), format: 'text' })
  })
  if (!res.ok) throw new Error(`LibreTranslate ${res.status}`)
  const data = (await res.json()) as { translatedText?: string }
  const text = data.translatedText?.trim()
  if (!text || text.toLowerCase() === word.toLowerCase()) throw new Error('no translation')
  return text
}

const PROVIDERS: Array<[Provider, (w: string, f: string, t: string, s: AbortSignal) => Promise<string>]> = [
  ['google', googleGtx],
  ['mymemory', myMemory],
  ['libre', libreTranslate]
]

// Translates `word` from language `from` into language `to` (ISO 639-1 codes).
export async function translateWord(word: string, from: string, to: string): Promise<string> {
  if (from === to) throw new Error('same language')
  const key = `${from}|${to}|${word}`
  const hit = cache.get(key)
  if (hit) return hit
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    let lastError: unknown = new Error('no provider')
    for (const [, run] of PROVIDERS) {
      try {
        const t = await run(word, from, to, controller.signal)
        cache.set(key, t)
        return t
      } catch (e) {
        lastError = e
        if (controller.signal.aborted) break
      }
    }
    throw lastError
  } finally {
    window.clearTimeout(timeout)
  }
}
