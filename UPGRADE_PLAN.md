# Upgrade Plan: Многоязычная поддержка для BilingReader

## 🎯 Цель
Добавить поддержку BLB v2 (многоязычные файлы) с возможностью выбирать языки для левой и правой стороны.

## 📋 Этапы работы

### Этап 1: Расширение типов данных
**Файлы**: `src/types.ts`

- [ ] Добавить `MultilingualPair` тип для BLB v2:
```typescript
interface MultilingualPair {
  [lang: string]: string  // lang -> text
}
```

- [ ] Расширить `Book` тип:
  - Добавить `isMultilingual: boolean`
  - Добавить `availableLanguages: string[]`
  - Добавить `selectedLangLeft: string` / `selectedLangRight: string`

- [ ] Расширить `AlignedPair` для универсальной работы

### Этап 2: Обновление парсера
**Файлы**: `src/parser/bookParser.ts`

- [ ] Добавить функцию `parseMultilingualBook()` для BLB v2
- [ ] Обновить `parseBook()` для автоопределения формата (v1 или v2)
- [ ] Преобразовать многоязычные пары в универсальный формат

### Этап 3: Расширение хранилища
**Файлы**: `src/store/ReaderProvider.tsx`

- [ ] Добавить действия:
  - `setSelectedLanguages(left: string, right: string)`
  - `getAvailableLanguages()`
  
- [ ] Обновить состояние для отслеживания выбранных языков

### Этап 4: UI компоненты
**Новые файлы**: `src/components/LanguageSelector.tsx`

- [ ] Создать dropdown для выбора языков
- [ ] Показывать доступные языки из BLB v2
- [ ] Обновлять отображение при выборе новой пары

### Этап 5: Обновление ReaderScreen
**Файлы**: `src/components/ReaderScreen.tsx`

- [ ] Добавить кнопку "Выбрать языки" в toolbar
- [ ] Интегрировать LanguageSelector
- [ ] Обновить отображение выбранных языков

### Этап 6: Обновление ReaderList
**Файлы**: `src/components/ReaderList.tsx`

- [ ] Поддержка многоязычных пар
- [ ] Корректное отображение текста выбранных языков

## 📦 Структура многоязычного BLB файла (v2)

```json
{
  "blb_version": 2,
  "format": "multilingual",
  "book": {
    "title": "...",
    "languages": ["ru", "en", "fr", "es"],
    "lang_names": {"ru": "Русский", "en": "English", ...}
  },
  "chapters": [
    {
      "multilingual_pairs": [
        {
          "ru": "Русский текст",
          "en": "English text",
          "fr": "Texte français",
          "es": "Texto español"
        }
      ]
    }
  ]
}
```

## 🔄 Обратная совместимость

- BLB v1 файлы продолжат работать как раньше
- Автоматическое определение версии формата при загрузке

## ✅ Готовность к продакшну

После завершения:
- [ ] Тестирование на BLB v1 (убедиться что не сломалось)
- [ ] Тестирование на BLB v2 из проекта Interlinear-translation-engine
- [ ] Build и деплой на GitHub Pages
- [ ] GitHub Actions для автосборки
