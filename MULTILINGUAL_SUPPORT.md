# Multilingual Support (BLB v2) Implementation

## Changes Made

### 1. Updated `src/types.ts`
- Added `MultilingualPair` interface for BLB v2 format
- Extended `Book` interface with:
  - `isMultilingual?: boolean`
  - `availableLanguages?: string[]`
  - `selectedLangLeft?: string`
  - `selectedLangRight?: string`

### 2. Need to Update `src/parser/bookParser.ts`

Add this function before `export function parseBook()`:

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

Update `parseBook()` function - add this check before the existing BLB check:

```typescript
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
```

### 3. Next: Create Language Selector Component

Create `src/components/LanguageSelector.tsx` with dropdown for language selection.

### 4. Update ReaderProvider

Add methods to ReaderProvider for language management:
- `setSelectedLanguages(left: string, right: string)`
- `getAvailableLanguages()`

### 5. Update ReaderScreen

Add language selector button to toolbar for multilingual books.
