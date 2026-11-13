import { useReader } from '../store/ReaderProvider'
import { langName } from '../languages'

// Picks the language of one column of a multilingual book. `col` is the column
// as it is on screen (0 = left; 1 = right with two columns, middle with three).
export default function LanguageSelector({ col, onClose }: { col: number; onClose: () => void }) {
  const { state, setLanguages, setColumnLanguage } = useReader()
  const languages = state.book?.multi?.languages ?? []
  const three = state.cols === 3
  const swapped = state.columnsSwapped
  const shownLeft = swapped ? state.langTgt : state.langSrc
  const shownRight = swapped ? state.langSrc : state.langTgt
  const current = three ? state.colLangs[col] : col === 0 ? shownLeft : shownRight

  // Picking the language that is already in another column swaps the two, so
  // no language is ever shown twice.
  const pick = (lang: string) => {
    if (three) {
      void setColumnLanguage(col, lang)
    } else {
      let left = shownLeft
      let right = shownRight
      if (col === 0) {
        if (lang === right) right = left
        left = lang
      } else {
        if (lang === left) left = right
        right = lang
      }
      void (swapped ? setLanguages(right, left) : setLanguages(left, right))
    }
    onClose()
  }

  const title = three ? `Язык колонки ${col + 1}` : col === 0 ? 'Язык слева' : 'Язык справа'

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="langpanel" role="dialog" aria-label="Язык колонки">
        <div className="langhead">{title}</div>
        <div className="langcol">
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
      </div>
    </>
  )
}
