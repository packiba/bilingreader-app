import { Fragment } from 'react'

export default function ChapterHeader({
  titleSrc,
  titleTgt,
  langLeft,
  langRight,
  fontSize,
  dark,
  expand = 'NONE',
  cols
}: {
  titleSrc: string
  titleTgt: string
  langLeft: string
  langRight: string
  fontSize: number
  dark: boolean
  expand?: 'SRC' | 'MID' | 'TGT' | 'NONE' | 'AWAITING'
  // Three-column mode: one title per column (replaces titleSrc / titleTgt).
  cols?: Array<{ title: string; lang: string; other: string }>
}) {
  const style = { fontSize, color: dark ? '#D1D5DB' : '#1F2937' }
  if (cols) {
    const only = expand === 'SRC' ? 0 : expand === 'MID' ? 1 : expand === 'TGT' ? cols.length - 1 : -1
    const part = (i: number) => (
      <div
        className={`col ${i === 0 ? 'left' : i === cols.length - 1 ? 'right' : 'mid'}`}
        lang={cols[i].lang} data-lang={cols[i].lang} data-other={cols[i].other}
      >{cols[i].title}</div>
    )
    if (only >= 0) return <div className="chapterhead expanded" style={style}>{part(only)}</div>
    return (
      <div className="chapterhead" style={style}>
        {cols.map((_, i) => (
          <Fragment key={i}>{i > 0 && <div className="dividerC" />}{part(i)}</Fragment>
        ))}
      </div>
    )
  }
  // One expanded column: its title takes the whole width, like the text under it.
  if (expand === 'SRC') {
    return (
      <div className="chapterhead expanded" style={style}>
        <div className="col left" lang={langLeft} data-lang={langLeft} data-other={langRight}>{titleSrc}</div>
      </div>
    )
  }
  if (expand === 'TGT') {
    return (
      <div className="chapterhead expanded" style={style}>
        <div className="col right" lang={langRight} data-lang={langRight} data-other={langLeft}>{titleTgt}</div>
      </div>
    )
  }
  return (
    <div className="chapterhead" style={style}>
      <div className="col left" lang={langLeft} data-lang={langLeft} data-other={langRight}>{titleSrc}</div>
      <div className="dividerC" />
      <div className="col right" lang={langRight} data-lang={langRight} data-other={langLeft}>{titleTgt}</div>
    </div>
  )
}
