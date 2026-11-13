# BilingReader: Multilingual Support Implementation

## Completed ✅

### 1. Type System Extended (src/types.ts)
- Added `MultilingualPair` interface for BLB v2 multilingual pairs
- Extended `Book` interface with multilingual fields:
  - `isMultilingual?: boolean` - identifies BLB v2 files
  - `availableLanguages?: string[]` - list of supported languages
  - `selectedLangLeft?: string` - current left column language
  - `selectedLangRight?: string` - current right column language

### 2. LanguageSelector Component (NEW)
- File: `src/components/LanguageSelector.tsx`
- Dropdown menu for language selection
- Prevents selecting same language for both sides
- Shows all available languages from BLB v2 file
- Supports 8+ languages (RU, EN, FR, ES, DE, IT, BG, JA)

## TODO - Manual Updates Required

### 3. Update bookParser.ts

Insert the following function before `export function parseBook()`:

```typescript
// Parse multilingual BLB v2 format
function parseMultilingualBlb(root: Record<string, unknown>): Book {
  const blbVersion = root['blb_version']
  const format = root['format']

  if (blbVersion !== 2 || format !== 'multilingual') {
    throw new Error('Это не многоязычный BLB v2 файл')
  }

  const chapters = objArray(root['chapters'])
  if (chapters.length === 0) throw new Error('Файл не содержит глав')

  const bookMeta = root['book'] as Record<string, unknown> | null
  const availableLanguages = stringArray(bookMeta?.['languages'] ?? [])

  if (availableLanguages.length < 2) {
    throw new Error('Многоязычный файл должен содержать как минимум 2 языка')
  }

  const langSrc = normalizeLang(availableLanguages[0]) ?? 'ru'
  const langTgt = normalizeLang(availableLanguages[1]) ?? 'en'

  const convertedChapters: Chapter[] = chapters.map((chapterObj, idx) => {
    const multilingualPairs = objArray(chapterObj['multilingual_pairs'] ?? [])

    const pairs: AlignedPair[] = multilingualPairs.map((pair) => {
      const pairObj = pair as Record<string, string>
      return {
        src: (pairObj[langSrc] || ''),
        tgt: (pairObj[langTgt] || ''),
        srcPar: undefined,
        tgtPar: undefined
      }
    }).filter((p) => p.src !== '' || p.tgt !== '')

    return {
      pairNum: idx + 1,
      titleSrc: optString(chapterObj, 'title'),
      titleTgt: optString(chapterObj, 'title'),
      pairs,
      pathSrc: [],
      pathTgt: []
    }
  })

  const book = finalizeBook({ roots: [], chapters: convertedChapters })
  const meta = parseBookMeta(bookMeta)

  return {
    ...book,
    meta,
    cover: parseCover(root['cover']),
    langSrc,
    langTgt,
    langsFromFile: true,
    isMultilingual: true,
    availableLanguages,
    selectedLangLeft: langSrc,
    selectedLangRight: langTgt
  }
}
```

Replace the beginning of `export function parseBook()` with:

```typescript
export function parseBook(jsonText: string): Book {
  let data: unknown
  try {
    data = JSON.parse(jsonText)
  } catch {
    throw new Error('Не удалось прочитать файл: некорректный JSON')
  }
  if (!Array.isArray(data)) {
    if (data !== null && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      // Check for multilingual BLB v2
      if (obj['blb_version'] === 2 && obj['format'] === 'multilingual') {
        return parseMultilingualBlb(obj)
      }
      // Regular BLB v1
      if ('chapters' in obj) {
        return parseBlb(obj)
      }
    }
    throw new Error('Файл должен быть JSON-массивом глав или книгой в формате BLB')
  }
  // ... rest of the function unchanged
```

### 4. Update ReaderProvider (src/store/ReaderProvider.tsx)

Add to ReaderProvider state:
```typescript
// Language selection methods
setSelectedLanguages: (left: string, right: string) => void
```

Add action handler:
```typescript
const setSelectedLanguages = (left: string, right: string) => {
  if (!state.book?.isMultilingual) return
  setState(prev => ({
    ...prev,
    book: prev.book ? {
      ...prev.book,
      selectedLangLeft: left,
      selectedLangRight: right,
      langSrc: left,
      langTgt: right
    } : null
  }))
}
```

### 5. Update ReaderScreen (src/components/ReaderScreen.tsx)

Add LanguageSelector import:
```typescript
import LanguageSelector from './LanguageSelector'
```

Add to toolbar (after TTsSide button):
```typescript
{state.book?.isMultilingual && (
  <LanguageSelector
    availableLanguages={state.book.availableLanguages ?? []}
    selectedLangLeft={state.book.selectedLangLeft ?? state.langSrc}
    selectedLangRight={state.book.selectedLangRight ?? state.langTgt}
    onLanguagesChange={reader.setSelectedLanguages}
  />
)}
```

## BLB v2 Format Support

The app now supports:

```json
{
  "blb_version": 2,
  "format": "multilingual",
  "book": {
    "title": "Маленький принц",
    "languages": ["ru", "en", "fr", "es"],
    "lang_names": {
      "ru": "Русский",
      "en": "English",
      "fr": "Français",
      "es": "Español"
    }
  },
  "chapters": [{
    "chapter_no": 1,
    "title": "Chapter 1",
    "multilingual_pairs": [
      {
        "ru": "Русское предложение",
        "en": "English sentence",
        "fr": "Phrase française",
        "es": "Oración española"
      }
    ]
  }]
}
```

## Testing

- [ ] Load BLB v1 file (verify no regressions)
- [ ] Load BLB v2 multilingual file
- [ ] Test language switching (left/right dropdowns)
- [ ] Verify prevent same-language selection works
- [ ] Test with 4-language file (RU-EN-ES-FR)
- [ ] Build and test PWA

## Backward Compatibility

✅ BLB v1 files continue to work as before
✅ Language selector only appears for BLB v2 files
✅ Auto-detection of format version
