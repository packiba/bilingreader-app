import { useState } from 'react'
import { LANGUAGES, langName } from '../languages'

type Side = 'src' | 'tgt'

function LangSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // A code that isn't in the table (taken from a book file) must still be selectable.
  const known = LANGUAGES.some((l) => l.code === value)
  return (
    <select className="btn langselect" value={value} onChange={(e) => onChange(e.target.value)}>
      {!known && <option value={value}>{value.toUpperCase()}</option>}
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>{l.name} ({l.code})</option>
      ))}
    </select>
  )
}

export default function LanguageDialog({
  langSrc,
  langTgt,
  ttsSide,
  needsSetup,
  onSave,
  onClose
}: {
  langSrc: string
  langTgt: string
  ttsSide: Side
  needsSetup: boolean
  onSave: (langSrc: string, langTgt: string, ttsSide: Side) => void
  onClose: () => void
}) {
  const [src, setSrc] = useState(langSrc)
  const [tgt, setTgt] = useState(langTgt)
  const [side, setSide] = useState<Side>(ttsSide)
  const same = src === tgt

  return (
    <>
      <div className="overlay" style={{ zIndex: 80 }} onClick={onClose} />
      <div className="modal" role="dialog" aria-label="Языки книги">
        <h3 style={{ margin: '0 0 8px' }}>Языки книги</h3>
        {needsSetup && (
          <div className="meta" style={{ marginBottom: 10 }}>
            В файле книги не указаны языки. Выберите их — от этого зависят перевод по тапу и чтение вслух.
            Чтобы не спрашивать, добавьте в файл <code>book.lang_src</code> и <code>book.lang_tgt</code>.
          </div>
        )}
        <label className="field">
          <span>Левая колонка по умолчанию (src)</span>
          <LangSelect value={src} onChange={setSrc} />
        </label>
        <label className="field">
          <span>Правая колонка по умолчанию (tgt)</span>
          <LangSelect value={tgt} onChange={setTgt} />
        </label>
        <div className="field">
          <span>Читать вслух</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${side === 'src' ? 'primary' : ''}`} style={{ flex: 1 }} onClick={() => setSide('src')}>{langName(src)}</button>
            <button className={`btn ${side === 'tgt' ? 'primary' : ''}`} style={{ flex: 1 }} onClick={() => setSide('tgt')}>{langName(tgt)}</button>
          </div>
        </div>
        {same && <div className="err" style={{ fontSize: 13 }}>Выберите два разных языка — иначе переводить нечего.</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>Отмена</button>
          <button className="btn primary" disabled={same} onClick={() => onSave(src, tgt, side)}>Готово</button>
        </div>
      </div>
    </>
  )
}
