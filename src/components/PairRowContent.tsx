import type { RenderRow } from '../types'
import type { ExpandMode } from '../store/settings'
import ChapterHeader from './ChapterHeader'

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
  const srcIsBg = row.isSrcBulgarian
  const activeColor = dark ? '#D1D5DB' : '#1F2937'
  const dimmedColor = dark ? '#888888' : '#999999'
  const textColor = read ? dimmedColor : activeColor
  const srcCol = (
    <div className={`col left ${srcIsBg ? 'bglang' : 'russian'}`}>
      <div className="textbook rowtext" style={{ fontSize, color: textColor }}>{row.srcText}</div>
    </div>
  )
  const tgtCol = (
    <div className={`col right ${srcIsBg ? 'russian' : 'bglang'}`}>
      <div className="textbook rowtext" style={{ fontSize, color: textColor }}>{row.tgtText}</div>
    </div>
  )
  const expand = expandMode as 'SRC' | 'TGT' | 'NONE' | 'AWAITING'
  const cellContent =
    expand === 'SRC' ? srcCol :
    expand === 'TGT' ? tgtCol : (
      <div className="cell">
        {srcCol}
        <div className="dividerC" />
        {tgtCol}
      </div>
    )
  return (
    <>
      {row.showHeader && (
        <ChapterHeader titleSrc={row.headerTitleSrc} titleTgt={row.headerTitleTgt} fontSize={fontSize} dark={dark} />
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ transform: `translateX(${dx}px)` }}>{cellContent}</div>
        {speaker}
      </div>
    </>
  )
}