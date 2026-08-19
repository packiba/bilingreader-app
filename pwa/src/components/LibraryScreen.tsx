import { useRef } from 'react'
import { useReader } from '../store/ReaderProvider'
import { IconOpenFolder } from './icons'
import InstallHint from './InstallHint'

export default function LibraryScreen() {
  const { state, importFile, openBook, deleteBook, dismissError } = useReader()
  const inputRef = useRef<HTMLInputElement>(null)

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) void importFile(f)
  }

  return (
    <div className={`app ${state.dark ? 'theme-dark' : 'theme-light'}`}>
      <div className="lib">
        <h1>Библиотека</h1>
        <div className="grid">
          <div
            className="card"
            style={{ cursor: 'pointer', alignItems: 'flex-start', justifyContent: 'center', borderStyle: 'dashed' }}
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onPick} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconOpenFolder size={22} color="var(--accent)" />
              <span>Открыть JSON-файл</span>
            </div>
            {state.isImporting && <div className="meta">Открываю…</div>}
          </div>
          {state.books.map((b) => (
            <div className="card" key={b.id}>
              <div className="title">{b.name}</div>
              <div className="meta">{b.totalPairs} пар</div>
              <div className="actions">
                <button className="btn primary" onClick={() => void openBook(b.id)}>Читать</button>
                <button className="btn" onClick={() => void deleteBook(b.id)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
        {state.books.length === 0 && (
          <div className="empty">
            Книг пока нет.<br />Нажмите «Открыть JSON-файл» и выберите книгу в Файлах.
          </div>
        )}
        <InstallHint />
      </div>
      {state.error && <div className="snackbar" onClick={dismissError}>{state.error}</div>}
      {state.isLoading && <div className="snackbar">Загрузка…</div>}
    </div>
  )
}