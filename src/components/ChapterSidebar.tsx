import { useMemo, useState } from 'react'
import type { Chapter } from '../types'
import { displayTitleSrc, displayTitleTgt } from '../types'
import { useReader } from '../store/ReaderProvider'
import { columnTitle } from '../parser/bookParser'
import { IconMenu } from './icons'

export default function ChapterSidebar({ onClose }: { onClose: () => void }) {
  const { state, chapterStarts, setCurrentPair } = useReader()
  const [search, setSearch] = useState('')
  const book = state.book
  const items = useMemo(() => {
    if (!book) return []
    let acc = 0
    if (state.cols === 3 && book.multi) {
      // Three columns: the first non-empty heading among the shown languages.
      return book.multi.chapters.map((c) => {
        const start = acc
        acc += c.rows.length
        const title = state.colLangs.map((l) => columnTitle(c.titles, l, state.colLangs)).find((t) => t !== '') ?? ''
        return { title: title || '—', start }
      }).filter((it) => it.title !== '—')
    }
    return book.chapters.map((ch: Chapter) => {
      const title = state.columnsSwapped ? displayTitleTgt(ch) : displayTitleSrc(ch)
      const start = acc
      acc += ch.pairs.length
      return { title, start }
    }).filter((it) => it.title !== '—')
  }, [book, state.columnsSwapped, state.cols, state.colLangs])

  const query = search.trim().toLowerCase()
  const list = query ? items.filter((it) => it.title.toLowerCase().includes(query)) : items

  const currentChapterStart = [...chapterStarts].reverse().find((s) => s <= state.currentPair) ?? 0

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <IconMenu size={18} />
          <h3 style={{ flex: 1, margin: 0 }}>Оглавление</h3>
        </div>
        <input
          className="btn"
          style={{ width: '100%', marginBottom: 8, color: 'var(--text-active)' }}
          placeholder="Поиск главы…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {list.map((it, i) => (
          <div
            key={`${it.start}-${i}`}
            className={`chapter ${it.start === currentChapterStart ? 'cur' : ''}`}
            onClick={() => { setCurrentPair(it.start); onClose() }}
          >
            {it.title}
          </div>
        ))}
      </div>
    </>
  )
}