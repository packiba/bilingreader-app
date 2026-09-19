export interface AlignedPair {
  src: string
  tgt: string
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
  bulgarianPairs: string[]
  meta: BookMeta | null
  cover: BookCover | null
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
  srcText: string
  tgtText: string
  bulgarianText: string
  isSrcBulgarian: boolean
}