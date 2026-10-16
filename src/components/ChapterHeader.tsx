export default function ChapterHeader({
  titleSrc,
  titleTgt,
  langLeft,
  langRight,
  fontSize,
  dark
}: {
  titleSrc: string
  titleTgt: string
  langLeft: string
  langRight: string
  fontSize: number
  dark: boolean
}) {
  return (
    <div className="chapterhead" style={{ fontSize, color: dark ? '#D1D5DB' : '#1F2937' }}>
      <div className="col left" lang={langLeft} data-lang={langLeft} data-other={langRight}>{titleSrc}</div>
      <div className="dividerC" />
      <div className="col right" lang={langRight} data-lang={langRight} data-other={langLeft}>{titleTgt}</div>
    </div>
  )
}
