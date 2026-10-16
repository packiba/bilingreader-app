// Language table shared by the parser (BLB metadata), TTS and translation.
// `code` is the canonical ISO 639-1 code stored in books and used for lookups.
export interface LangInfo {
  code: string
  name: string // shown in the UI (Russian)
  tts: string // BCP-47 tag handed to speechSynthesis
  aliases: string[] // lowercase alternative spellings accepted in book files
  mt?: { google?: string; mymemory?: string; libre?: string } // overrides where a provider wants a different code
}

export const LANGUAGES: LangInfo[] = [
  { code: 'ru', name: 'Русский', tts: 'ru-RU', aliases: ['rus', 'russian', 'русский'] },
  { code: 'bg', name: 'Болгарский', tts: 'bg-BG', aliases: ['bul', 'bulgarian', 'български', 'болгарский'] },
  { code: 'en', name: 'Английский', tts: 'en-US', aliases: ['eng', 'english', 'английский'] },
  { code: 'uk', name: 'Украинский', tts: 'uk-UA', aliases: ['ukr', 'ukrainian', 'українська', 'украинский'] },
  { code: 'be', name: 'Белорусский', tts: 'be-BY', aliases: ['bel', 'belarusian', 'белорусский'] },
  { code: 'pl', name: 'Польский', tts: 'pl-PL', aliases: ['pol', 'polish', 'polski', 'польский'] },
  { code: 'cs', name: 'Чешский', tts: 'cs-CZ', aliases: ['ces', 'cze', 'czech', 'čeština', 'чешский'] },
  { code: 'sk', name: 'Словацкий', tts: 'sk-SK', aliases: ['slk', 'slo', 'slovak', 'словацкий'] },
  { code: 'sl', name: 'Словенский', tts: 'sl-SI', aliases: ['slv', 'slovenian', 'словенский'] },
  { code: 'sr', name: 'Сербский', tts: 'sr-RS', aliases: ['srp', 'serbian', 'сербский'] },
  { code: 'hr', name: 'Хорватский', tts: 'hr-HR', aliases: ['hrv', 'croatian', 'хорватский'] },
  { code: 'mk', name: 'Македонский', tts: 'mk-MK', aliases: ['mkd', 'mac', 'macedonian', 'македонский'] },
  { code: 'de', name: 'Немецкий', tts: 'de-DE', aliases: ['deu', 'ger', 'german', 'deutsch', 'немецкий'] },
  { code: 'fr', name: 'Французский', tts: 'fr-FR', aliases: ['fra', 'fre', 'french', 'français', 'французский'] },
  { code: 'es', name: 'Испанский', tts: 'es-ES', aliases: ['spa', 'spanish', 'español', 'испанский'] },
  { code: 'it', name: 'Итальянский', tts: 'it-IT', aliases: ['ita', 'italian', 'italiano', 'итальянский'] },
  { code: 'pt', name: 'Португальский', tts: 'pt-PT', aliases: ['por', 'portuguese', 'português', 'португальский'] },
  { code: 'nl', name: 'Нидерландский', tts: 'nl-NL', aliases: ['nld', 'dut', 'dutch', 'нидерландский', 'голландский'] },
  { code: 'sv', name: 'Шведский', tts: 'sv-SE', aliases: ['swe', 'swedish', 'шведский'] },
  { code: 'da', name: 'Датский', tts: 'da-DK', aliases: ['dan', 'danish', 'датский'] },
  { code: 'no', name: 'Норвежский', tts: 'nb-NO', aliases: ['nor', 'nb', 'nn', 'norwegian', 'норвежский'] },
  { code: 'fi', name: 'Финский', tts: 'fi-FI', aliases: ['fin', 'finnish', 'финский'] },
  { code: 'el', name: 'Греческий', tts: 'el-GR', aliases: ['ell', 'gre', 'greek', 'греческий'] },
  { code: 'tr', name: 'Турецкий', tts: 'tr-TR', aliases: ['tur', 'turkish', 'турецкий'] },
  { code: 'ro', name: 'Румынский', tts: 'ro-RO', aliases: ['ron', 'rum', 'romanian', 'румынский'] },
  { code: 'hu', name: 'Венгерский', tts: 'hu-HU', aliases: ['hun', 'hungarian', 'венгерский'] },
  { code: 'lt', name: 'Литовский', tts: 'lt-LT', aliases: ['lit', 'lithuanian', 'литовский'] },
  { code: 'lv', name: 'Латышский', tts: 'lv-LV', aliases: ['lav', 'latvian', 'латышский'] },
  { code: 'et', name: 'Эстонский', tts: 'et-EE', aliases: ['est', 'estonian', 'эстонский'] },
  { code: 'ka', name: 'Грузинский', tts: 'ka-GE', aliases: ['kat', 'geo', 'georgian', 'грузинский'] },
  { code: 'hy', name: 'Армянский', tts: 'hy-AM', aliases: ['hye', 'arm', 'armenian', 'армянский'] },
  { code: 'he', name: 'Иврит', tts: 'he-IL', aliases: ['heb', 'hebrew', 'iw', 'иврит'] },
  { code: 'ar', name: 'Арабский', tts: 'ar-SA', aliases: ['ara', 'arabic', 'арабский'] },
  { code: 'fa', name: 'Персидский', tts: 'fa-IR', aliases: ['fas', 'per', 'persian', 'farsi', 'персидский'] },
  { code: 'hi', name: 'Хинди', tts: 'hi-IN', aliases: ['hin', 'hindi', 'хинди'] },
  { code: 'ja', name: 'Японский', tts: 'ja-JP', aliases: ['jpn', 'japanese', 'японский'] },
  { code: 'zh', name: 'Китайский', tts: 'zh-CN', aliases: ['zho', 'chi', 'chinese', 'китайский'], mt: { google: 'zh-CN', mymemory: 'zh-CN', libre: 'zh' } },
  { code: 'ko', name: 'Корейский', tts: 'ko-KR', aliases: ['kor', 'korean', 'корейский'] },
  { code: 'vi', name: 'Вьетнамский', tts: 'vi-VN', aliases: ['vie', 'vietnamese', 'вьетнамский'] },
  { code: 'th', name: 'Тайский', tts: 'th-TH', aliases: ['tha', 'thai', 'тайский'] },
  { code: 'id', name: 'Индонезийский', tts: 'id-ID', aliases: ['ind', 'indonesian', 'индонезийский'] },
  { code: 'la', name: 'Латынь', tts: 'it-IT', aliases: ['lat', 'latin', 'латынь', 'латинский'] }
]

const BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l]))
const BY_ALIAS = new Map<string, string>()
for (const l of LANGUAGES) for (const a of l.aliases) BY_ALIAS.set(a, l.code)

export function langInfo(code: string): LangInfo | undefined {
  return BY_CODE.get(code)
}

export function langName(code: string): string {
  return BY_CODE.get(code)?.name ?? code.toUpperCase()
}

// Accepts "ru", "RU", "ru-RU", "ru_RU", "rus", "Russian", "русский"… and returns
// the canonical code. Unknown but code-shaped values (2–3 letters) are kept as
// they are, so a language missing from the table still works with TTS and
// translation by its plain code.
export function normalizeLang(raw: string | null | undefined): string | null {
  if (!raw) return null
  const v = raw.trim().toLowerCase().replace(/_/g, '-')
  if (v === '') return null
  if (BY_CODE.has(v)) return v
  const alias = BY_ALIAS.get(v)
  if (alias) return alias
  const primary = v.split('-')[0]
  if (BY_CODE.has(primary)) return primary
  const primaryAlias = BY_ALIAS.get(primary)
  if (primaryAlias) return primaryAlias
  return /^[a-z]{2,3}$/.test(primary) ? primary : null
}

export function ttsTag(code: string): string {
  return BY_CODE.get(code)?.tts ?? code
}

export function mtCode(code: string, provider: 'google' | 'mymemory' | 'libre'): string {
  return BY_CODE.get(code)?.mt?.[provider] ?? code
}
