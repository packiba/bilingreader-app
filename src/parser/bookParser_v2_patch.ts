// Parse multilingual BLB v2 format
function parseMultilingualBlb(root: Record<string, unknown>): Book {
  const blbVersion = root['blb_version']
  const format = root['format']

  if (blbVersion !== 2 || format !== 'multilingual') {
    throw new Error('Это не многоязычный BLB v2 файл')
  }

  const chapters = objArray(root['chapters'])
  if (chapters.length === 0) throw new Error('Файл не содержит глав')

  // Extract available languages from book metadata
  const bookMeta = root['book'] as Record<string, unknown> | null
  const availableLanguages = stringArray(bookMeta?.['languages'] ?? [])

  if (availableLanguages.length < 2) {
    throw new Error('Многоязычный файл должен содержать как минимум 2 языка')
  }

  // Default to first two languages for initial display
  const langSrc = normalizeLang(availableLanguages[0]) ?? 'ru'
  const langTgt = normalizeLang(availableLanguages[1]) ?? 'en'

  // Convert multilingual pairs to standard AlignedPair format
  const convertedChapters: Chapter[] = chapters.map((chapterObj, idx) => {
    const multilingualPairs = objArray(chapterObj['multilingual_pairs'] ?? [])

    // Convert each multilingual pair to AlignedPair format
    const pairs: AlignedPair[] = multilingualPairs.map((pair) => {
      const pairObj = pair as Record<string, string>
      const src = pairObj[langSrc] ?? ''
      const tgt = pairObj[langTgt] ?? ''

      return {
        src: src || '',
        tgt: tgt || '',
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
