export default function ChapterHeader({
  titleSrc,
  titleTgt,
  srcIsBg,
  fontSize,
  dark
}: {
  titleSrc: string
  titleTgt: string
  srcIsBg: boolean
  fontSize: number
  dark: boolean
}) {
  return (
    <div className="chapterhead" style={{ fontSize, color: dark ? '#D1D5DB' : '#1F2937' }}>
      <div className={`col left ${srcIsBg ? 'bglang' : 'russian'}`}>{titleSrc}</div>
      <div className="dividerC" />
      <div className={`col right ${srcIsBg ? 'russian' : 'bglang'}`}>{titleTgt}</div>
    </div>
  )
}