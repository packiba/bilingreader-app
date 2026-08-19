import { useRef, useState } from 'react'
import { useReader } from '../store/ReaderProvider'
import {
  IconClose, IconCollapse, IconDropdown, IconDropup, IconExpand, IconMenu,
  IconMinus, IconMoon, IconNext, IconOpenFolder, IconPlus, IconPrev, IconSun, IconSwap
} from './icons'
import ReaderList from './ReaderList'
import PageSlider from './PageSlider'
import ChapterSidebar from './ChapterSidebar'

export default function ReaderScreen() {
  const reader = useReader()
  const { state, dismissError } = reader
  const [showToolbar, setShowToolbar] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const openFileBtn = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void reader.importFile(f)
        }}
      />
      <button className="iconbtn" title="Открыть файл" onClick={() => fileInputRef.current?.click()}>
        <IconOpenFolder size={18} />
      </button>
    </>
  )

  return (
    <div className={`app ${state.dark ? 'theme-dark' : 'theme-light'}`}>
      {showToolbar && (
        <div className="toolbar">
          {openFileBtn}
          <div className="name">{state.fileName}</div>
          <button className="iconbtn" title="Тема" onClick={reader.toggleTheme}>
            {state.dark ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>
          <button className="iconbtn" title="Поменять колонки" onClick={reader.toggleColumns}>
            <IconSwap size={18} />
          </button>
          <button
            className="iconbtn"
            title="Разворот в одну колонку"
            onClick={reader.toggleExpandMode}
            style={{ color: state.expandMode === 'NONE' ? undefined : 'var(--accent)' }}
          >
            {state.expandMode === 'NONE' || state.expandMode === 'AWAITING' ? <IconExpand size={18} /> : <IconCollapse size={18} />}
          </button>
          <button className="iconbtn" title="Меньше шрифт" onClick={() => reader.setFontSize(state.fontSize - 1)}>
            <IconMinus size={18} />
          </button>
          <button className="iconbtn" title="Больше шрифт" onClick={() => reader.setFontSize(state.fontSize + 1)}>
            <IconPlus size={18} />
          </button>
          <button className="iconbtn" title="Закрыть книгу" onClick={reader.closeBook}>
            <IconClose size={18} />
          </button>
        </div>
      )}

      <div className="content">
        <ReaderList />
        {state.expandMode === 'AWAITING' && (
          <div className="overlay" style={{ display: 'flex', zIndex: 40 }}>
            <button className="btn primary" style={{ flex: 1, margin: 8, fontSize: 16 }} onClick={() => reader.expandColumn('SRC')}>
              ← Левая колонка
            </button>
            <button className="btn primary" style={{ flex: 1, margin: 8, fontSize: 16 }} onClick={() => reader.expandColumn('TGT')}>
              Правая колонка →
            </button>
          </div>
        )}
      </div>

      {state.book && (
        <div className="bottombar">
          <button className="iconbtn" title="Свернуть/развернуть тулбар" onClick={() => setShowToolbar((v) => !v)}>
            {showToolbar ? <IconDropdown size={18} /> : <IconDropup size={18} />}
          </button>
          {showToolbar && (
            <button className="iconbtn" title="Предыдущая глава" onClick={reader.goToPrevChapter}>
              <IconPrev size={18} />
            </button>
          )}
          <PageSlider />
          {showToolbar && (
            <button className="iconbtn" title="Следующая глава" onClick={reader.goToNextChapter}>
              <IconNext size={18} />
            </button>
          )}
          <button className="iconbtn" title="Главы" onClick={() => setShowSidebar(true)}>
            <IconMenu size={18} />
          </button>
        </div>
      )}

      {showSidebar && <ChapterSidebar onClose={() => setShowSidebar(false)} />}
      {state.error && <div className="snackbar" onClick={dismissError}>{state.error}</div>}
    </div>
  )
}