const cache = new Map<string, string>()

function langpair(isBulgarian: boolean): string {
  return isBulgarian ? 'bg|ru' : 'ru|bg'
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
      const t = await myMemory(word, pair, controller.signal)
      cache.set(key, t)
      return t
    } catch {
      const t = await libreTranslate(word, pair, controller.signal)
      cache.set(key, t)
      return t
    }
  } finally {
    window.clearTimeout(timeout)
  }
}