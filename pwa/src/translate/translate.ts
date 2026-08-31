const cache = new Map<string, string>()

function langpair(isBulgarian: boolean): string {
  return isBulgarian ? 'bg|ru' : 'ru|bg'
}

// Google's public "gtx" client endpoint. Undocumented, but it's a plain GET
// with no custom headers, so it never triggers a CORS preflight, and Google
// answers it with Access-Control-Allow-Origin: * — unlike MyMemory and the
// public LibreTranslate instance, which either omit CORS headers entirely or
// (LibreTranslate) now gate most traffic behind an API key. This is the
// primary source; the other two stay on as fallbacks in case this endpoint
// is ever rate-limited or unreachable on a given network.
async function googleGtx(word: string, pair: string, signal: AbortSignal): Promise<string> {
  const [source, target] = pair.split('|')
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=' +
    source + '&tl=' + target + '&dt=t&q=' + encodeURIComponent(word)
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Google ${res.status}`)
  const data = (await res.json()) as unknown
  const text = Array.isArray(data) && Array.isArray(data[0])
    ? data[0].map((seg: unknown) => Array.isArray(seg) ? seg[0] : '').join('').trim()
    : ''
  if (!text || text.toLowerCase() === word.toLowerCase()) throw new Error('no translation')
  return text
}

async function myMemory(word: string, pair: string, signal: AbortSignal): Promise<string> {
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(word) +
    '&langpair=' +
    encodeURIComponent(pair)
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

async function libreTranslate(word: string, pair: string, signal: AbortSignal): Promise<string> {
  const [source, target] = pair.split('|')
  const res = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: word, source, target, format: 'text' })
  })
  if (!res.ok) throw new Error(`LibreTranslate ${res.status}`)
  const data = (await res.json()) as { translatedText?: string }
  const text = data.translatedText?.trim()
  if (!text || text.toLowerCase() === word.toLowerCase()) throw new Error('no translation')
  return text
}

export async function translateWord(word: string, isBulgarian: boolean): Promise<string> {
  const pair = langpair(isBulgarian)
  const key = `${pair}|${word}`
  const hit = cache.get(key)
  if (hit) return hit
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 8000)
  try {
    try {
      const t = await googleGtx(word, pair, controller.signal)
      cache.set(key, t)
      return t
    } catch {
      try {
        const t = await myMemory(word, pair, controller.signal)
        cache.set(key, t)
        return t
      } catch {
        const t = await libreTranslate(word, pair, controller.signal)
        cache.set(key, t)
        return t
      }
    }
  } finally {
    window.clearTimeout(timeout)
  }
}