import { useRef, useState } from 'react'
import { useReader } from '../store/ReaderProvider'
import { IconOpenFolder } from './icons'
import InstallHint from './InstallHint'

export default function LibraryScreen() {
  const { state, importFile, openBook, deleteBook, backToBook, dismissError } = useReader()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const dragDepth = useRef(0)

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f && !state.isImporting) void importFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && /\.(json|blb)$/i.test(f.name) && !state.isImporting) void importFile(f)
  }

  return (
    <div className={`app ${state.dark ? 'theme-dark' : 'theme-light'}`}>
      <div
        className="lib"
        data-drag={dragOver ? '' : undefined}
        onDragEnter={(e) => {
          e.preventDefault()
          dragDepth.current++
          setDragOver(true)
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          dragDepth.current--
          if (dragDepth.current <= 0) {
            dragDepth.current = 0
            setDragOver(false)
          }
        }}
        onDrop={onDrop}
      >
        <h1
          style={{ cursor: state.book ? 'pointer' : 'default' }}
          onClick={() => { if (state.book) backToBook() }}
        >
          Библиотека
        </h1>
        <div className="grid">
          <div
            className="card"
            style={{ cursor: 'pointer', alignItems: 'flex-start', justifyContent: 'center', borderStyle: 'dashed' }}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".json,.blb,application/json" style={{ display: 'none' }} onChange={onPick} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconOpenFolder size={22} color="var(--accent)" />
              <span>Открыть файл (.json / .blb)</span>
            </div>
            {state.isImporting && <div className="meta">Открываю…</div>}
          </div>
          {state.books.map((b) => (
            <div className="card book" key={b.id} style={{ cursor: 'pointer' }} onClick={() => void openBook(b.id)}>
              {b.coverDataUrl && (
                <div className="cover-wrap">
                  <img className="cover" src={b.coverDataUrl} alt="" />
                </div>
              )}
              <div className="bookinfo">
                <div className="title">{b.title || b.name}</div>
                {b.author && <div className="meta">{b.author}</div>}
                <div className="bookfoot">
                  <div className="meta">
                    {(b.langs ?? [b.langSrc, b.langTgt]).filter(Boolean).map((l) => l!.toUpperCase()).join(', ')}
                  </div>
                  <button className="btn delete" onClick={(e) => {
                    e.stopPropagation()
                    // One stray tap used to wipe the book and its reading progress.
                    if (window.confirm(`Удалить «${b.title || b.name}» вместе с прогрессом чтения?`)) void deleteBook(b.id)
                  }}>Удалить</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {state.books.length === 0 && (
          <div className="empty">
            Книг пока нет.<br />Нажмите «Открыть файл» и выберите книгу (.json или .blb) в Файлах.
          </div>
        )}
        <InstallHint />
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, opacity: 0.4 }}>build {__BUILD_TAG__}</div>
      </div>
      {state.error && <div className="snackbar" onClick={dismissError}>{state.error}</div>}
      {state.isLoading && <div className="snackbar">Загрузка…</div>}
    </div>
  )
}