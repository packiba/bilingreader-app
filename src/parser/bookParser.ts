import type { AlignedPair, Book, BookCover, BookMeta, BookNode, Chapter, RenderRow } from '../types'
import { displayTitleSrc, displayTitleTgt } from '../types'
import { normalizeLang } from '../languages'

// Used for books that don't declare their languages (legacy JSON arrays and
// BLB files without `book.lang_src` / `book.lang_tgt`) — this is what the app
// assumed before languages became configurable.
export const DEFAULT_LANG_SRC = 'ru'
export const DEFAULT_LANG_TGT = 'bg'

function optString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  if (typeof v !== 'string' || v.trim() === '') return null
  return v
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

// Non-object entries (null, numbers, strings) are skipped instead of crashing
// the parser with a TypeError like "Cannot use 'in' operator…".
function objArray(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? v.filter(isObj) : []
}

function pairArray(v: unknown): AlignedPair[] {
  return objArray(v).flatMap((p) => {
    const src = p['src']
    const tgt = p['tgt']
    if (typeof src !== 'string' || typeof tgt !== 'string') return []
    const pair: AlignedPair = { src, tgt }
    if (p['src_par'] === true) pair.srcPar = true
    if (p['tgt_par'] === true) pair.tgtPar = true
    return [pair]
  })
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : []
}

function numberOrNull(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function isNestedFormat(root: Record<string, unknown>): boolean {
  return 'type' in root || 'children' in root || ('pairs' in root && !('pair_num' in root))
}

function parsePairs(node: Record<string, unknown>): AlignedPair[] {
  const pairs = pairArray(node['pairs'])
  if (pairs.length > 0) return pairs
  // Legacy flat format: src_sents / tgt_sents zipped by index
  const src = stringArray(node['src_sents'])
  const tgt = stringArray(node['tgt_sents'])
  return src.map((s, i) => ({ src: s, tgt: tgt[i] ?? '' })).filter((p) => p.src !== '' || p.tgt !== '')
}

function parseNode(obj: Record<string, unknown>): BookNode {
  const titleSrc = optString(obj, 'title_src')
  const titleTgt = optString(obj, 'title_tgt')
  const number =
    numberOrNull(obj['subchapter_num']) ??
    numberOrNull(obj['chapter_num']) ??
    numberOrNull(obj['pair_num'])
  const pairs = parsePairs(obj)
  if (pairs.length > 0) {
    return { kind: 'chapter', number, titleSrc, titleTgt, pairs }
  }
  const children = objArray(obj['children']).map(parseNode)
  return {
    kind: 'container',
    type: typeof obj['type'] === 'string' && obj['type'] !== '' ? obj['type'] : 'container',
    number,
    titleSrc,
    titleTgt,
    children
  }
}

function flatten(nodes: BookNode[]): Chapter[] {
  const out: Chapter[] = []
  let pairNum = 1
  const walk = (node: BookNode, pathSrc: string[], pathTgt: string[]) => {
    if (node.kind === 'chapter') {
      out.push({
        pairNum: pairNum++,
        titleSrc: node.titleSrc,
        titleTgt: node.titleTgt,
        pairs: node.pairs,
        pathSrc,
        pathTgt
      })
    } else {
      const nextSrc = pathSrc.concat(node.titleSrc ? [node.titleSrc] : [])
      const nextTgt = pathTgt.concat(node.titleTgt ? [node.titleTgt] : [])
      for (const child of node.children) walk(child, nextSrc, nextTgt)
    }
  }
  for (const n of nodes) walk(n, [], [])
  return out
}

function chaptersFromFlat(root: Array<Record<string, unknown>>): Chapter[] {
  return root.map((obj, i) => ({
    pairNum: numberOrNull(obj['pair_num']) ?? i + 1,
    titleSrc: optString(obj, 'title_src'),
    titleTgt: optString(obj, 'title_tgt'),
    pairs: parsePairs(obj),
    pathSrc: [],
    pathTgt: []
  }))
}

function parseFlat(root: Array<Record<string, unknown>>): Book {
  return finalizeBook({ roots: [], chapters: chaptersFromFlat(root) })
}

function parseNested(root: Array<Record<string, unknown>>): Book {
  const nodes = root.map(parseNode)
  return finalizeBook({ roots: nodes, chapters: flatten(nodes) })
}

function parseBookMeta(obj: unknown): BookMeta | null {
  if (obj === null || typeof obj !== 'object') return null
  const b = obj as Record<string, unknown>
  return {
    titleSrc: optString(b, 'title_src'),
    titleTgt: optString(b, 'title_tgt'),
    author: optString(b, 'author'),
    langSrc: optString(b, 'lang_src') ?? optString(b, 'src_lang'),
    langTgt: optString(b, 'lang_tgt') ?? optString(b, 'tgt_lang')
  }
}

function parseCover(obj: unknown): BookCover | null {
  if (obj === null || typeof obj !== 'object') return null
  const c = obj as Record<string, unknown>
  const mime = optString(c, 'mime')
  const dataBase64 = optString(c, 'data_base64')
  if (!mime || !dataBase64) return null
  return { mime, width: numberOrNull(c['width']), height: numberOrNull(c['height']), dataBase64 }
}

// The BLB format: a JSON object (not an array) with `book` metadata, an
// embedded `cover` image, and `chapters` in the same flat shape as the
// legacy pair_num/title_src/title_tgt/pairs format.
function parseBlb(root: Record<string, unknown>): Book {
  const chapters = objArray(root['chapters'])
  if (chapters.length === 0) throw new Error('Файл не содержит глав')
  const book = finalizeBook({ roots: [], chapters: chaptersFromFlat(chapters) })
  const meta = parseBookMeta(root['book'])
  // Languages normally live in `book.lang_src` / `book.lang_tgt`; top-level
  // keys of the same name are accepted too.
  const langSrc = normalizeLang(meta?.langSrc ?? optString(root, 'lang_src'))
  const langTgt = normalizeLang(meta?.langTgt ?? optString(root, 'lang_tgt'))
  return {
    ...book,
    meta,
    cover: parseCover(root['cover']),
    langSrc: langSrc ?? DEFAULT_LANG_SRC,
    langTgt: langTgt ?? DEFAULT_LANG_TGT,
    langsFromFile: langSrc != null && langTgt != null
  }
}

function finalizeBook(partial: { roots: BookNode[]; chapters: Chapter[] }): Book {
  const totalPairs = partial.chapters.reduce((sum, c) => sum + c.pairs.length, 0)
  // A structurally valid file with no sentence pairs used to open as an empty
  // reader showing "1 / 0".
  if (totalPairs === 0) throw new Error('В файле нет ни одной пары предложений')
  return {
    roots: partial.roots,
    chapters: partial.chapters,
    totalPairs,
    pairs: partial.chapters.flatMap((c) => c.pairs),
    meta: null,
    cover: null,
    langSrc: DEFAULT_LANG_SRC,
    langTgt: DEFAULT_LANG_TGT,
    langsFromFile: false
  }
}

// A multilingual BLB (v2) keeps one row per fragment of the book with the text
// in every language. The reader shows two of them side by side; `multi` holds
// the full data and this builds the view for the chosen pair. Rows are never
// dropped (a language may lack a row), so pair indices — and therefore reading
// progress — stay the same whichever languages are selected.
const ROMAN = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/
// Cyrillic look-alikes that book titles sometimes use inside roman numerals (ХII).
const CYR_ROMAN: Record<string, string> = { 'Х': 'X', 'І': 'I', 'С': 'C', 'М': 'M' }

// The chapter number inside a title ("CHAPITRE II" -> "II", "Глава 5" -> "5"),
// or null when the title has none ("Пролог", "PREMIER CHAPITRE").
const CHAPTER_WORD = /^(?:глава|chapter|chapitre|cap[ií]tulo|capitolo|kapitel|част|часть|part|partie|parte|book|книга)\s+/iu

// The number must open the title or follow a word like "Chapter": a number in the
// middle ("Париж 22:46") is not a chapter number.
export function chapterNumberOf(title: string): string | null {
  let rest = title.trim().replace(/^[^\p{L}\d]+/u, '')
  rest = rest.replace(CHAPTER_WORD, '')
  const m = /^(\d{1,4}|[IVXLCDMХІСМ]{1,8})(?![\p{L}\d])/u.exec(rest)
  if (!m) return null
  if (/^\d+$/.test(m[1])) return m[1]
  const t = [...m[1]].map((ch) => CYR_ROMAN[ch] ?? ch).join('')
  return ROMAN.test(t) ? t : null
}

// The heading shown over a column: the chapter title in that column's own
// language; without one, only the chapter number taken from another displayed
// column; with no number anywhere the heading stays empty.
export function columnTitle(titles: Record<string, string>, lang: string, shown: string[]): string {
  const own = (titles[lang] ?? '').trim()
  if (own) return own
  for (const other of shown) {
    if (other === lang) continue
    const n = chapterNumberOf(titles[other] ?? '')
    if (n) return n
  }
  return ''
}

export function withLanguages(book: Book, left: string, right: string): Book {
  const multi = book.multi
  if (!multi) return book
  const title = (titles: Record<string, string>, lang: string): string | null =>
    columnTitle(titles, lang, [left, right]) || null
  const chapters: Chapter[] = multi.chapters.map((c, i) => ({
    pairNum: i + 1,
    titleSrc: title(c.titles, left),
    titleTgt: title(c.titles, right),
    pairs: c.rows.map((r) => ({ src: r[left] ?? '', tgt: r[right] ?? '' })),
    pathSrc: [],
    pathTgt: []
  }))
  return { ...book, chapters, pairs: chapters.flatMap((c) => c.pairs), langSrc: left, langTgt: right }
}

function parseMultilingualBlb(root: Record<string, unknown>): Book {
  const bookObj = isObj(root['book']) ? root['book'] : {}
  const codes = stringArray(bookObj['languages']).map((l) => normalizeLang(l) ?? l)
  const languages = [...new Set(codes)]
  if (languages.length < 2) throw new Error('В многоязычной книге должно быть минимум два языка')

  const chapters = objArray(root['chapters']).map((ch) => {
    const rows = objArray(ch['multilingual_pairs']).map((row) => {
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) if (typeof v === 'string') out[normalizeLang(k) ?? k] = v
      return out
    })
    const titles: Record<string, string> = {}
    const rawTitles = isObj(ch['titles']) ? ch['titles'] : {}
    for (const [k, v] of Object.entries(rawTitles)) if (typeof v === 'string') titles[normalizeLang(k) ?? k] = v
    const fallback = optString(ch, 'title')
    if (fallback && !titles[languages[0]]) titles[languages[0]] = fallback
    return { titles, rows }
  }).filter((c) => c.rows.length > 0)

  const totalPairs = chapters.reduce((sum, c) => sum + c.rows.length, 0)
  if (totalPairs === 0) throw new Error('В файле нет ни одной пары предложений')

  const title = optString(bookObj, 'title')
  const base: Book = {
    roots: [],
    chapters: [],
    totalPairs,
    pairs: [],
    meta: { titleSrc: title, titleTgt: title, author: optString(bookObj, 'author'), langSrc: languages[0], langTgt: languages[1] },
    cover: parseCover(root['cover']),
    langSrc: languages[0],
    langTgt: languages[1],
    langsFromFile: true,
    multi: { languages, chapters }
  }
  return withLanguages(base, languages[0], languages[1])
}

export function parseBook(jsonText: string): Book {
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Не удалось прочитать файл: некорректный JSON')
  }
  if (!Array.isArray(data)) {
    if (data !== null && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      // Check for multilingual BLB v2
      if (obj['blb_version'] === 2 && obj['format'] === 'multilingual') {
        return parseMultilingualBlb(obj)
      }
      // Regular BLB v1
      if ('chapters' in obj) {
        return parseBlb(obj)
      }
    }
    throw new Error('Файл должен быть JSON-массивом глав или книгой в формате BLB')
  }
  const root = objArray(data)
  if (root.length === 0) {
    throw new Error('Файл должен быть JSON-массивом глав')
  }
  return isNestedFormat(root[0]) ? parseNested(root) : parseFlat(root)
}

export function computeChapterStarts(book: Book, swapped: boolean): number[] {
  const starts: number[] = []
  let acc = 0
  for (const ch of book.chapters) {
    const title = swapped ? displayTitleTgt(ch) : displayTitleSrc(ch)
    // A titled chapter with no pairs (e.g. a part heading) starts at the same
    // index as the next one. Duplicates made "next chapter" get stuck there.
    if (title !== '—' && starts[starts.length - 1] !== acc) starts.push(acc)
    acc += ch.pairs.length
  }
  // Must point at an existing pair (a trailing empty chapter would not).
  return starts.filter((s) => s < book.totalPairs)
}

export function buildRenderRows(book: Book, columnsSwapped: boolean, langSrc: string, langTgt: string): RenderRow[] {
  const rows: RenderRow[] = []
  let globalIdx = 0
  let lastHeaderTitle: string | null = null
  for (const chapter of book.chapters) {
    const title = columnsSwapped ? displayTitleTgt(chapter) : displayTitleSrc(chapter)
    const showHeaderOnFirstPair = title !== '—' && title !== lastHeaderTitle
    if (showHeaderOnFirstPair) lastHeaderTitle = title
    const headerSrc = columnsSwapped ? displayTitleTgt(chapter) : displayTitleSrc(chapter)
    const headerTgt = columnsSwapped ? displayTitleSrc(chapter) : displayTitleTgt(chapter)
    for (let i = 0; i < chapter.pairs.length; i++) {
      const p = chapter.pairs[i]
      rows.push({
        idx: globalIdx,
        showHeader: showHeaderOnFirstPair && i === 0,
        headerTitleSrc: headerSrc,
        headerTitleTgt: headerTgt,
        srcText: columnsSwapped ? p.tgt : p.src,
        tgtText: columnsSwapped ? p.src : p.tgt,
        langLeft: columnsSwapped ? langTgt : langSrc,
        langRight: columnsSwapped ? langSrc : langTgt,
        // The first pair of a chapter is already set off by its header.
        parStart: i > 0 && !!(p.srcPar || p.tgtPar)
      })
      globalIdx++
    }
  }
  return rows
}

// Three-column mode (multilingual books only): rows of the book with the text of
// the three shown languages. A tapped word is translated into the language of the
// column on its left (the first column translates into the second).
export function buildRenderRows3(book: Book, colLangs: string[]): RenderRow[] {
  const multi = book.multi
  if (!multi) return []
  const rows: RenderRow[] = []
  let globalIdx = 0
  let lastKey = ''
  for (const chapter of multi.chapters) {
    const headerCells = colLangs.map((l) => columnTitle(chapter.titles, l, colLangs))
    const key = headerCells.join('|')
    const showHeader = headerCells.some((t) => t !== '') && key !== lastKey
    if (showHeader) lastKey = key
    for (let i = 0; i < chapter.rows.length; i++) {
      const r = chapter.rows[i]
      const cells = colLangs.map((l, c) => ({
        text: r[l] ?? '',
        lang: l,
        other: colLangs[c === 0 ? 1 : c - 1]
      }))
      rows.push({
        idx: globalIdx,
        showHeader: showHeader && i === 0,
        headerTitleSrc: headerCells[0],
        headerTitleTgt: headerCells[colLangs.length - 1],
        srcText: cells[0].text,
        tgtText: cells[colLangs.length - 1].text,
        langLeft: colLangs[0],
        langRight: colLangs[colLangs.length - 1],
        parStart: false,
        cells,
        headerCells
      })
      globalIdx++
    }
  }
  return rows
}

export function computeChapterStarts3(book: Book, colLangs: string[]): number[] {
  const starts: number[] = []
  let acc = 0
  for (const chapter of book.multi?.chapters ?? []) {
    const hasTitle = colLangs.some((l) => columnTitle(chapter.titles, l, colLangs) !== '')
    if (hasTitle && starts[starts.length - 1] !== acc) starts.push(acc)
    acc += chapter.rows.length
  }
  return starts.filter((s) => s < book.totalPairs)
}
