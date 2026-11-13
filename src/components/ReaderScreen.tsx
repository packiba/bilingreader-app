import { useRef, useState } from 'react'
import { useReader } from '../store/ReaderProvider'
import { bookDisplayTitle } from '../types'
import {
  IconCollapse, IconDropdown, IconDropup, IconExpand, IconLibrary, IconMenu,
  IconMinus, IconMoon, IconSpeaker, IconNext, IconPlus, IconPrev, IconSun, IconSwap
} from './icons'
import ReaderList from './ReaderList'
import PageSlider from './PageSlider'
import ChapterSidebar from './ChapterSidebar'
import LanguageSelector from './LanguageSelector'

export default function ReaderScreen() {
  const reader = useReader()
  const { state, dismissError } = reader
  const [showToolbar, setShowToolbar] = useState(true)
  const [showSidebar, setShowSidebar] = useState(false)
  // Column whose language is being chosen (0 = left, 1 = middle or right, 2 = right).
  const [langCol, setLangCol] = useState<number | null>(null)
  const [preview, setPreview] = useState<number | null>(null)
  const touchStart = useRef<{ y: number } | null>(null)
  const currentShown = preview ?? state.currentPair
  const totalShown = state.book ? Math.max(state.book.totalPairs, 0) : 0
  // Languages as they are on screen (the columns can be swapped).
  const shownLeft = state.columnsSwapped ? state.langTgt : state.langSrc
  const shownRight = state.columnsSwapped ? state.langSrc : state.langTgt
  const isMulti = !!state.book?.multi
  const canThree = (state.book?.multi?.languages.length ?? 0) >= 3
  const three = state.cols === 3
  // One column taken to the whole screen: the bar shows only its language.
  const expandedCol = state.expandMode === 'SRC' ? 0
    : state.expandMode === 'MID' ? (three ? 1 : -1)
    : state.expandMode === 'TGT' ? (three ? 2 : 1)
    : -1
  const expanded = expandedCol >= 0
  const expandedLang = three ? state.colLangs[expandedCol] : expandedCol === 0 ? shownLeft : shownRight

  return (
    <div className={`app ${state.dark ? 'theme-dark' : 'theme-light'}`}>
      {showToolbar && (
        <div className="toolbar">
          <div className="tb-side">
            <button className="iconbtn" title="Библиотека" onClick={reader.openLibrary}>
              <IconLibrary size={18} />
            </button>
            <div className="name">{state.book ? bookDisplayTitle(state.book, state.fileName) : state.fileName}</div>
          </div>
          <div className="tb-center">
            {expanded ? (
              <button
                className="langlabel"
                disabled={!isMulti}
                title={isMulti ? 'Язык развёрнутой колонки' : undefined}
                onClick={() => setLangCol(expandedCol)}
              >
                {expandedLang}
              </button>
            ) : three ? state.colLangs.map((lang, i) => (
              <button
                key={i}
                className="langlabel"
                title={`Язык колонки ${i + 1}`}
                onClick={() => setLangCol(i)}
              >
                {lang}
              </button>
            )) : (
              <>
                <button
                  className="langlabel"
                  disabled={!isMulti}
                  title={isMulti ? 'Язык левой колонки' : undefined}
                  onClick={() => setLangCol(0)}
                >
                  {shownLeft}
                </button>
                <button className="iconbtn" title="Поменять колонки" onClick={reader.toggleColumns}>
                  <IconSwap size={18} />
                </button>
                <button
                  className="langlabel"
                  disabled={!isMulti}
                  title={isMulti ? 'Язык правой колонки' : undefined}
                  onClick={() => setLangCol(1)}
                >
                  {shownRight}
                </button>
              </>
            )}
          </div>
          <div className="tb-side tb-right">
            {canThree && !expanded && (
              <button
                className="iconbtn"
                style={{ width: 'auto', minWidth: 34, padding: '0 6px', fontSize: 12, fontWeight: 700 }}
                title="Число колонок: две или три"
                onClick={() => void reader.toggleCols()}
              >
                <span style={{ color: three ? undefined : 'var(--accent)' }}>2</span>/
                <span style={{ color: three ? 'var(--accent)' : undefined }}>3</span>
              </button>
            )}
            <button
              className="iconbtn"
              style={{ width: 'auto', minWidth: 34, padding: '0 6px', fontSize: 12, fontWeight: 700, gap: 3 }}
              title="Язык озвучки (нажмите, чтобы переключить)"
              onClick={() => three ? reader.cycleTtsCol() : void reader.setTtsSide(state.ttsSide === 'tgt' ? 'src' : 'tgt')}
            >
              <IconSpeaker size={14} />
              {(three ? (state.colLangs[state.ttsCol] ?? '') : (state.ttsSide === 'tgt' ? state.langTgt : state.langSrc)).toUpperCase()}
            </button>
            <button className="iconbtn" title="Тема" onClick={reader.toggleTheme}>
              {state.dark ? <IconMoon size={18} /> : <IconSun size={18} />}
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
          </div>
        </div>
      )}

      <div className="content">
        <ReaderList />
        {state.expandMode === 'AWAITING' && (
          <div className="overlay" style={{ display: 'flex', zIndex: 40 }}>
            <button className="btn primary" style={{ flex: 1, margin: 8, fontSize: 16 }} onClick={() => reader.expandColumn('SRC')}>
              ← Левая колонка
            </button>
            {three && (
              <button className="btn primary" style={{ flex: 1, margin: 8, fontSize: 16 }} onClick={() => reader.expandColumn('MID')}>
                Средняя колонка
              </button>
            )}
            <button className="btn primary" style={{ flex: 1, margin: 8, fontSize: 16 }} onClick={() => reader.expandColumn('TGT')}>
              Правая колонка →
            </button>
          </div>
        )}
      </div>

      {state.book && (
        <div
          className="bottombar"
          onTouchStart={(e) => { touchStart.current = { y: e.touches[0]?.clientY ?? 0 } }}
          onTouchEnd={(e) => {
            const dy = (touchStart.current?.y ?? 0) - (e.changedTouches[0]?.clientY ?? 0)
            touchStart.current = null
            if (dy > 30) setShowSidebar(true)
          }}
        >
          <button className="iconbtn" title="Свернуть/развернуть тулбар" onClick={() => setShowToolbar((v) => !v)}>
            {showToolbar ? <IconDropdown size={18} /> : <IconDropup size={18} />}
          </button>
          {showToolbar && <span className="count">{currentShown + 1} / {totalShown}</span>}
          <button className="iconbtn" title="Предыдущая глава" onClick={reader.goToPrevChapter}>
            <IconPrev size={18} />
          </button>
          <PageSlider onDragPreview={setPreview} disabled={!showToolbar} />
          <button className="iconbtn" title="Следующая глава" onClick={reader.goToNextChapter}>
            <IconNext size={18} />
          </button>
          <button className="iconbtn" title="Главы" onClick={() => setShowSidebar(true)}>
            <IconMenu size={18} />
          </button>
        </div>
      )}

      {showSidebar && <ChapterSidebar onClose={() => setShowSidebar(false)} />}
      {langCol !== null && isMulti && <LanguageSelector col={langCol} onClose={() => setLangCol(null)} />}
      {state.error && <div className="snackbar" onClick={dismissError}>{state.error}</div>}
    </div>
  )
}