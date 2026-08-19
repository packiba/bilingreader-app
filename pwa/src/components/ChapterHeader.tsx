export default function ChapterHeader({ titleSrc, titleTgt, fontSize, dark }: { titleSrc: string; titleTgt: string; fontSize: number; dark: boolean }) {
  return (
    <div className="chapterhead" style={{ fontSize, color: dark ? '#D1D5DB' : '#1F2937' }}>
      <div>{titleSrc}</div>
      <div style={{ fontWeight: 400, fontSize: fontSize * 0.82, opacity: 0.7 }}>{titleTgt}</div>
    </div>
  )
}