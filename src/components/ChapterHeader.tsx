export default function ChapterHeader({
  titleSrc,
  titleTgt,
  langLeft,
  langRight,
  fontSize,
  dark,
  expand = 'NONE'
}: {
  titleSrc: string
  titleTgt: string
  langLeft: string
  langRight: string
  fontSize: number
  dark: boolean
  expand?: 'SRC' | 'TGT' | 'NONE' | 'AWAITING'
}) {
  const style = { fontSize, color: dark ? '#D1D5DB' : '#1F2937' }
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
