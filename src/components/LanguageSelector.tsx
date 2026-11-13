import { useReader } from '../store/ReaderProvider'
import { langName } from '../languages'

// Picks the language of one column of a multilingual book. `side` is the column
// as it is on screen; the book's own src/tgt order may be swapped.
export default function LanguageSelector({ side, onClose }: { side: 'left' | 'right'; onClose: () => void }) {
  const { state, setLanguages } = useReader()
  const languages = state.book?.multi?.languages ?? []
  const swapped = state.columnsSwapped
  const shownLeft = swapped ? state.langTgt : state.langSrc
  const shownRight = swapped ? state.langSrc : state.langTgt
  const current = side === 'left' ? shownLeft : shownRight

  // Picking the language that is already on the other side swaps the two, so
  // both columns never show the same language.
  const pick = (lang: string) => {
    let left = shownLeft
    let right = shownRight
    if (side === 'left') {
      if (lang === right) right = left
      left = lang
    } else {
      if (lang === left) left = right
      right = lang
    }
    void (swapped ? setLanguages(right, left) : setLanguages(left, right))
    onClose()
  }

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div className="langpanel" role="dialog" aria-label="Язык колонки">
        <div className="langhead">{side === 'left' ? 'Язык слева' : 'Язык справа'}</div>
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
