import React from 'react'
import { IconDropdown } from './icons'

interface LanguageSelectorProps {
  availableLanguages: string[]
  selectedLangLeft: string
  selectedLangRight: string
  onLanguagesChange: (left: string, right: string) => void
}

const LANG_NAMES: Record<string, string> = {
  ru: 'Русский',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
  bg: 'Български',
  ja: '日本語',
}

export default function LanguageSelector({
  availableLanguages,
  selectedLangLeft,
  selectedLangRight,
  onLanguagesChange
}: LanguageSelectorProps) {
  const [showMenu, setShowMenu] = React.useState(false)

  const getLangName = (lang: string) => LANG_NAMES[lang] || lang.toUpperCase()

  const handleLeftChange = (lang: string) => {
    // Prevent selecting same language for both sides
    const right = lang === selectedLangRight
      ? availableLanguages.find(l => l !== lang) || selectedLangRight
      : selectedLangRight
    onLanguagesChange(lang, right)
  }

  const handleRightChange = (lang: string) => {
    // Prevent selecting same language for both sides
    const left = lang === selectedLangLeft
      ? availableLanguages.find(l => l !== lang) || selectedLangLeft
      : selectedLangLeft
    onLanguagesChange(left, lang)
  }

  return (
    <div className="language-selector">
      <button
        className="iconbtn"
        title="Выбрать языки"
        onClick={() => setShowMenu(!showMenu)}
        style={{ position: 'relative' }}
      >
        <span style={{ fontSize: 11, fontWeight: 700 }}>
          {getLangName(selectedLangLeft)} / {getLangName(selectedLangRight)}
        </span>
        <span style={{ marginLeft: 4, display: 'inline-flex' }}><IconDropdown size={14} /></span>
      </button>

      {showMenu && (
        <div className="language-menu" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          padding: 8,
          zIndex: 1000,
          minWidth: 200,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 700 }}>
              Левая колонка:
            </label>
            {availableLanguages.map(lang => (
              <button
                key={lang}
                onClick={() => handleLeftChange(lang)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 8px',
                  textAlign: 'left',
                  border: 'none',
                  background: lang === selectedLangLeft ? 'var(--accent)' : 'transparent',
                  color: lang === selectedLangLeft ? 'white' : 'inherit',
                  cursor: 'pointer',
                  borderRadius: 2,
                  fontSize: 12,
                  marginBottom: 2
                }}
              >
                {getLangName(lang)}
              </button>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            <label style={{ display: 'block', fontSize: 12, marginBottom: 4, fontWeight: 700 }}>
              Правая колонка:
            </label>
            {availableLanguages.map(lang => (
              <button
                key={lang}
                onClick={() => handleRightChange(lang)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '6px 8px',
                  textAlign: 'left',
                  border: 'none',
                  background: lang === selectedLangRight ? 'var(--accent)' : 'transparent',
                  color: lang === selectedLangRight ? 'white' : 'inherit',
                  cursor: 'pointer',
                  borderRadius: 2,
                  fontSize: 12,
                  marginBottom: 2
                }}
              >
                {getLangName(lang)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
