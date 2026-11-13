import { Fragment } from 'react'
import type { RenderRow } from '../types'
import type { ExpandMode } from '../store/settings'
import ChapterHeader from './ChapterHeader'

// Dialogue lines start with a dash; they get a hanging indent (see .dlg).
const DIALOGUE_RE = /^(?:[–—―]|-\s)/

// Pure row markup shared by the reader rows and the hidden measurement pass,
// so measured heights always match what the reader actually lays out.
export default function PairRowContent({
  rows,
  index,
  dark,
  fontSize,
  expandMode,
  read,
  dx = 0,
  speaker
}: {
  rows: RenderRow[]
  index: number
  dark: boolean
  fontSize: number
  expandMode: ExpandMode | 'AWAITING'
  read: boolean
  dx?: number
  speaker?: React.ReactNode
}) {
  const row = rows[index]
  const activeColor = dark ? '#D1D5DB' : '#1F2937'
  const dimmedColor = dark ? '#888888' : '#999999'
  const textColor = read ? dimmedColor : activeColor
  const gap = row.parStart ? Math.round(fontSize * 0.7) : 0
  const srcCol = (
    <div className="col left" lang={row.langLeft} data-lang={row.langLeft} data-other={row.langRight}>
      <div className={`textbook rowtext${DIALOGUE_RE.test(row.srcText) ? ' dlg' : ''}`} style={{ fontSize, color: textColor }}>{row.srcText}</div>
    </div>
  )
  const tgtCol = (
    <div className="col right" lang={row.langRight} data-lang={row.langRight} data-other={row.langLeft}>
      <div className={`textbook rowtext${DIALOGUE_RE.test(row.tgtText) ? ' dlg' : ''}`} style={{ fontSize, color: textColor }}>{row.tgtText}</div>
    </div>
  )
  const expand = expandMode as ExpandMode | 'AWAITING'
  if (row.cells) {
    // Three-column mode: smaller text, unless one column takes the whole width.
    const cells = row.cells
    const only = expand === 'SRC' ? 0 : expand === 'MID' ? 1 : expand === 'TGT' ? cells.length - 1 : -1
    const fs = only >= 0 ? fontSize : Math.round(fontSize * 0.85)
    const column = (i: number) => (
      <div
        className={`col ${i === 0 ? 'left' : i === cells.length - 1 ? 'right' : 'mid'}`}
        lang={cells[i].lang} data-lang={cells[i].lang} data-other={cells[i].other}
      >
        <div className={`textbook rowtext${DIALOGUE_RE.test(cells[i].text) ? ' dlg' : ''}`} style={{ fontSize: fs, color: textColor }}>{cells[i].text}</div>
      </div>
    )
    const content = only >= 0
      ? <div className="cell expanded">{column(only)}</div>
      : (
        <div className="cell">
          {cells.map((_, i) => (
            <Fragment key={i}>{i > 0 && <div className="dividerC" />}{column(i)}</Fragment>
          ))}
        </div>
      )
    return (
      <>
        {row.showHeader && row.headerCells && (
          <ChapterHeader
            titleSrc="" titleTgt="" langLeft={row.langLeft} langRight={row.langRight}
            fontSize={fs} dark={dark} expand={expand}
            cols={cells.map((c, i) => ({ title: row.headerCells![i] ?? '', lang: c.lang, other: c.other }))}
          />
        )}
        <div style={{ position: 'relative', paddingTop: 0 }}>
          <div style={{ transform: `translateX(${dx}px)` }}>{content}</div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0 }}>{speaker}</div>
        </div>
      </>
    )
  }
  const cellContent =
    expand === 'SRC' ? <div className="cell expanded">{srcCol}</div> :
    expand === 'TGT' ? <div className="cell expanded">{tgtCol}</div> : (
      <div className="cell">
        {srcCol}
        <div className="dividerC" />
        {tgtCol}
      </div>
    )
  return (
    <>
      {row.showHeader && (
        <ChapterHeader titleSrc={row.headerTitleSrc} titleTgt={row.headerTitleTgt} langLeft={row.langLeft} langRight={row.langRight} fontSize={fontSize} dark={dark} expand={expand} />
      )}
      <div style={{ position: 'relative', paddingTop: gap }}>
        <div style={{ transform: `translateX(${dx}px)` }}>{cellContent}</div>
        {/* zero-height anchor so the speaker button stays level with the text */}
        <div style={{ position: 'absolute', top: gap, left: 0, right: 0, height: 0 }}>{speaker}</div>
      </div>
    </>
  )
}