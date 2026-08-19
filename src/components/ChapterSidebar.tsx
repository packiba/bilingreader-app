import { useMemo, useState } from 'react'
import type { Chapter } from '../types'
import { displayTitleSrc, displayTitleTgt } from '../types'
import { useReader } from '../store/ReaderProvider'
import { IconMenu } from './icons'

export default function ChapterSidebar({ onClose }: { onClose: () => void }) {
  const { state, chapterStarts, setCurrentPair } = useReader()
  const [search, setSearch] = useState('')
  const book = state.book
  const items = useMemo(() => {
    if (!book) return []
    let acc = 0
    return book.chapters.map((ch: Chapter) => {
      const title = state.columnsSwapped ? displayTitleTgt(ch) : displayTitleSrc(ch)
      const start = acc
      acc += ch.pairs.length
      return { title, start }
    }).filter((it) => it.title !== '—')
  }, [book, state.columnsSwapped])

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
        {list.map((it) => (
          <div
            key={it.start}
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