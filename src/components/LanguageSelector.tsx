import { useReader } from '../store/ReaderProvider'
import { langName } from '../languages'

// Choose the language of the left and right column of a multilingual book.
export default function LanguageSelector({ onClose }: { onClose: () => void }) {
  const { state, setLanguages } = useReader()
  const languages = state.book?.multi?.languages ?? []
  const left = state.langSrc
  const right = state.langTgt

  // Picking the language already used on the other side swaps the two, so the
  // columns never end up showing the same language.
  const pickLeft = (lang: string) => void setLanguages(lang, lang === right ? left : right)
  const pickRight = (lang: string) => void setLanguages(lang === left ? right : left, lang)

  const column = (title: string, current: string, pick: (lang: string) => void) => (
    <div className="langcol">
      <div className="langhead">{title}</div>
      {languages.map((lang) => (
        <button
          key={lang}
          className={`btn langopt ${lang === current ? 'primary' : ''}`}
          onClick={() => pick(lang)}
        >
          {langName(lang)}
        </button>
      ))}
    </div>
  )

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="langpanel" role="dialog" aria-label="Языки колонок">
        <div className="langcols">
          {column('Слева', left, pickLeft)}
          {column('Справа', right, pickRight)}
        </div>
        <button className="btn" style={{ width: '100%', marginTop: 12 }} onClick={onClose}>Готово</button>
      </div>
    </>
  )
}
