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

export interface Book {
  roots: BookNode[]
  chapters: Chapter[]
  totalPairs: number
  bulgarianPairs: string[]
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