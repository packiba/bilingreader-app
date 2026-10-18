export interface AlignedPair {
  src: string
  tgt: string
  // The pair starts a new paragraph in the source / target edition (from the
  // aligner's `src_par` / `tgt_par`; absent in older books).
  srcPar?: boolean
  tgtPar?: boolean
}

export interface Chapter {
  pairNum: number
  titleSrc: string | null
  titleTgt: string | null
  pairs: AlignedPair[]
  pathSrc: string[]
  pathTgt: string[]
}

export function displayTitleSrc(ch: Chapter, separator = ' › '): string {
  const parts = [...ch.pathSrc.filter((p) => p && p.trim() !== ''), ...(ch.titleSrc && ch.titleSrc.trim() !== '' ? [ch.titleSrc] : [])]
  return parts.join(separator) || '—'
}

export function displayTitleTgt(ch: Chapter, separator = ' › '): string {
  const parts = [...ch.pathTgt.filter((p) => p && p.trim() !== ''), ...(ch.titleTgt && ch.titleTgt.trim() !== '' ? [ch.titleTgt] : [])]
  return parts.join(separator) || '—'
}

export interface ChapterNode {
  kind: 'chapter'
  number: number | null
  titleSrc: string | null
  titleTgt: string | null
  pairs: AlignedPair[]
}

export interface ContainerNode {
  kind: 'container'
  type: string
  number: number | null
  titleSrc: string | null
  titleTgt: string | null
  children: BookNode[]
}

export type BookNode = ContainerNode | ChapterNode

export interface BookMeta {
  titleSrc: string | null
  titleTgt: string | null
  author: string | null
  langSrc: string | null
  langTgt: string | null
}

export interface BookCover {
  mime: string
  width: number | null
  height: number | null
  dataBase64: string
}

export function coverDataUrl(cover: BookCover): string {
  return `data:${cover.mime};base64,${cover.dataBase64}`
}

export interface Book {
  roots: BookNode[]
  chapters: Chapter[]
  totalPairs: number
  // All pairs of the book in reading order (same indexing as RenderRow.idx).
  pairs: AlignedPair[]
  meta: BookMeta | null
  cover: BookCover | null
  // Languages of the `src` and `tgt` sides (canonical codes, see languages.ts).
  langSrc: string
  langTgt: string
  // true when the book file itself declared both languages.
  langsFromFile: boolean
}

export function bookDisplayTitle(book: Book, fallback = ''): string {
  const title = book.meta?.titleTgt ?? book.meta?.titleSrc
  const author = book.meta?.author
  const parts = [author, title].filter((p): p is string => p != null && p.trim() !== '')
  return parts.join(' — ') || fallback
}

export interface RenderRow {
  idx: number
  showHeader: boolean
  headerTitleSrc: string
  headerTitleTgt: string
  // Left / right column text and the language of each column.
  srcText: string
  tgtText: string
  langLeft: string
  langRight: string
  // A paragraph starts here in at least one edition: the row gets extra space
  // above it so paragraphs / dialogue turns are told apart from continuations.
  parStart: boolean
}