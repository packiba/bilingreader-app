import type { AlignedPair, Book, BookNode, Chapter, RenderRow } from '../types'
import { displayTitleSrc, displayTitleTgt } from '../types'

function optString(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  if (typeof v !== 'string' || v.trim() === '') return null
  return v
}

function objArray(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : []
}

function pairArray(v: unknown): AlignedPair[] {
  return objArray(v).flatMap((p) => {
    const src = p['src']
    const tgt = p['tgt']
    if (typeof src !== 'string' || typeof tgt !== 'string') return []
    return [{ src, tgt }]
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

function parseFlat(root: Array<Record<string, unknown>>): Book {
  const chapters: Chapter[] = root.map((obj, i) => ({
    pairNum: numberOrNull(obj['pair_num']) ?? i + 1,
    titleSrc: optString(obj, 'title_src'),
    titleTgt: optString(obj, 'title_tgt'),
    pairs: parsePairs(obj),
    pathSrc: [],
    pathTgt: []
  }))
  return finalizeBook({ roots: [], chapters })
}

function parseNested(root: Array<Record<string, unknown>>): Book {
  const nodes = root.map(parseNode)
  return finalizeBook({ roots: nodes, chapters: flatten(nodes) })
}

function finalizeBook(partial: { roots: BookNode[]; chapters: Chapter[] }): Book {
  const totalPairs = partial.chapters.reduce((sum, c) => sum + c.pairs.length, 0)
  return {
    roots: partial.roots,
    chapters: partial.chapters,
    totalPairs,
    bulgarianPairs: partial.chapters.flatMap((c) => c.pairs.map((p) => p.tgt))
  }
}

export function parseBook(jsonText: string): Book {
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Не удалось прочитать файл: некорректный JSON')
  }
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Файл должен быть JSON-массивом глав')
  }
  const root = data as Array<Record<string, unknown>>
  return isNestedFormat(root[0]) ? parseNested(root) : parseFlat(root)
}

export function computeChapterStarts(book: Book, swapped: boolean): number[] {
  const starts: number[] = []
  let acc = 0
  for (const ch of book.chapters) {
    const title = swapped ? displayTitleTgt(ch) : displayTitleSrc(ch)
    if (title !== '—') starts.push(acc)
    acc += ch.pairs.length
  }
  return starts
}

export function buildRenderRows(book: Book, columnsSwapped: boolean): RenderRow[] {
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
        bulgarianText: p.tgt,
        isSrcBulgarian: columnsSwapped
      })
      globalIdx++
    }
  }
  return rows
}