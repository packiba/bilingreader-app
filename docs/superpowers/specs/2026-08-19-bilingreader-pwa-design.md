# Biling Reader PWA — Design

**Дата**: 2026-08-19
**Платформа**: iOS (iPad, Safari) PWA; устанавливается на главный экран
**Стек**: React 18 + TypeScript + Vite 7
**Хостинг**: GitHub Pages (project site, HTTPS из коробки)
**Оригинал**: Android-приложение в этом репозитории (`com.example.bilingreader`)

---

## 1. Контекст

Готовое нативное Android-приложение для чтения параллельных текстов (BG/RU) на
Jetpack Compose. Задача — создать PWA с тем же функционалом, чтобы читать на iPad.
Android-версия описывает: чтение книг из JSON (плоский и вложенный форматы),
непрерывный скролл пар в две колонки, свайпы пометки прочитано, тёмную/светлую тему,
настройки шрифта/колонок, иерархическое оглавление, озвучку болгарского текста
(Web Speech API) и перевод слова по тапу (обязателен, мгновенно).

PWA строится заново на React+Vite (старый HTML/CSS/JS-PWA не сохранился).
Функциональный состав согласован: ядро чтения, настройки отображения, сохранение
прогресса, озвучка (TTS), перевод слова, открытие своих JSON-книг. Демо-книги
не включаем — только свои файлы. Деплой на GitHub Pages, репозиторий текущий.

---

## 2. Архитектура и структура

Одноэкранное SPA без роутинга. Два состояния верхнего уровня:

- **Библиотека** — список импортированных книг, кнопка импорта `.json`.
- **Читалка** — тулбары + виртуализованный список пар + сайдбар глав.

Состояние — React Context + `useReducer` (аналог `ReaderViewModel` в Android).
Хранилище — IndexedDB (книги + прогресс), настройки темы/шрифта — в `localStorage`.

Код размещается в папке `pwa/` этого же репозитория — отдельный package.json,
не зависит от Android-части. Сборка и публикация на ветку `gh-pages` через
GitHub Actions.

```
pwa/
├── index.html
├── manifest.webmanifest
├── public/                  # иконки: 180 (apple-touch), 192, 512 + SVG maskable
├── src/
│   ├── main.tsx
│   ├── worker.ts            # service worker (vite-plugin-pwa)
│   ├── types.ts             # Book, BookNode, Chapter, AlignedPair, RenderRow
│   ├── parser/
│   │   └── bookParser.ts    # JSON → Book (плоский + вложенный)
│   ├── store/
│   │   ├── db.ts            # IndexedDB: книги, прогресс, метаданные
│   │   └── ReaderProvider.tsx  # контекст-стор (контекст = ReaderViewModel)
│   ├── translate/
│   │   └── translate.ts     # MyMemory API (основной), LibreTranslate (fallback)
│   ├── tts/
│   │   └── tts.ts           # Web Speech API (bg-BG), непрерывное чтение
│   └── components/
│       ├── LibraryScreen.tsx
│       ├── ReaderScreen.tsx
│       ├── PairRow.tsx      # свайпы, TTS, перевод по тапу
│       ├── ChapterHeader.tsx
│       ├── PageSlider.tsx   # слайдер + метки глав + счётчик
│       ├── ChapterSidebar.tsx
│       └── icons.tsx        # SVG-иконки
```

## 3. Данные

### 3.1 Форматы JSON

Поддержать оба формата, как в `BookParser.kt`:

**Плоский (legacy):**
```json
[{
  "pair_num": 1,
  "title_src": "...",
  "title_tgt": "...",
  "pairs": [{ "src": "...", "tgt": "..." }]
}]
```

**Вложенный (nested):**
```json
[{
  "type": "book", "title_src": "...", "title_tgt": "...",
  "children": [{
    "type": "chapter", "chapter_num": 1,
    "children": [{
      "type": "subchapter", "subchapter_num": 1,
      "pairs": [{ "src": "...", "tgt": "..." }]
    }]
  }]
}]
```

Детекция формата: на корневом элементе есть `type`/`children`/`pairs` без `pair_num`
→ вложенный, иначе плоский. Листья — узлы с непустым `pairs`. Для вложенного формата
заголовки предков собираются в пути (`pathSrc`/`pathTgt`) для breadcrumb.

### 3.2 Модель

Функционально повторяет `Book.kt`:

- `AlignedPair { src, tgt }`
- `BookNode` (sealed): `ContainerNode { type, number, titleSrc, titleTgt, children }`,
  `ChapterNode { number, titleSrc, titleTgt, pairs }`
- `Book { roots, chapters, totalPairs, bulgarianPairs }`
- Render-строки собираются один раз на (книга, столбцы переставлены) —
  аналог `buildRenderRows` из `BookPager.kt`; поле `bulgarianText` всегда берётся из
  `pair.tgt` независимо от визуального порядка колонок.

### 3.3 Хранилище (IndexedDB)

- **Книги** (`books`): `{ id, name, rawJson, importedAt, totalPairs }` — файл
  копируется целиком внутрь хранилища, повторная навигация по Файлам не нужна.
- **Прогресс** (`progress`, ключ = book id): `{ lastPair, readThrough, readExceptions }`.
- **Метаданные открытых книг** (`meta`): id последней книги, список книг.
- **Настройки** (`localStorage`): тема, размер шрифта, перестановка колонок,
  разворот в одну колонку — хранятся глобально (применяются ко всем книгам).
  В Android они были per-file; в PWA глобальный вариант проще и предсказуемее.
- Записи прогресса — с дебаунсом 500мс, форс-флаш на `pagehide`/`visibilitychange`.

### 3.4 Состояние читалки (контекст-стор)

`ReaderState`:
`{ book, currentPair, fontSizeSp, isDarkTheme, columnsSwapped, expandMode,
readThrough, readExceptions, fileName, isLoading, error, scrollRequest, speakingPair,
isContinuousReading }`.

Поведение идентично `ReaderViewModel.kt`:
- `isRead(i) = i <= readThrough && i not in readExceptions`.
- `markAsReadAndNext` — свайп влево; `markAsUnread` — свайп вправо.
- `toggleTheme | toggleColumns | toggleExpandMode | expandColumn | setFontSize |
goToPrev/NextChapter | setCurrentPair | onUserScrolled` — те же семантики.
- Перевод: `translateWord(word, isBulgarian)` — мгновенный тап по слову (см. 5.4).

## 4. Пагинация и чтение

Непрерывный скролл списка пар (как в Android — LazyColumn). Номер «страницы» —
глобальный индекс пары; слайдер показывает «текущая пара / всего пар».

- **Виртуализация**: `react-window` (переменная высота строк разрешена при
  необходимости; приоритет — производительность на `the_man_who_laughs.json`).
- Слайдер синхронизирован: `onItemsRendered` → первый видимый индекс → `currentPair`.
  Перетаскивание → скролл списка к оффсету выбранной пары.
- Прыжок: если цель уже в вьюпорте — плавный докрут; иначе мгновенный прыжок
  (повторение логики `BookPager.kt`, `SCROLL_ANIM_MILLIS = 200`).

## 5. Интерфейс и взаимодействия

### 5.1 Библиотека

- Кнопка «Открыть JSON-файл» — `<input type="file" accept=".json,application/json">`.
- Карточки импортированных книг: имя, позиция («глава X из Y» или «N из M»),
  кнопки «Читать» и «Удалить».
- Экран «Как установить на iPad» первой загрузки (Поделиться → На главный экран).

### 5.2 Верхний тулбар (сворачивается стрелкой вниз)

📁 файл · имя книги · 🌙/☀︎ · ⇄ колонки · ⛶ разворот в одну колонку · A− · A+ · ✕.

### 5.3 Строка (PairRow)

- Две колонки 50/50, тонкий разделитель до высоты более высокой колонки.
- Зебра (чередование фона), паддинги 14px горизонтально.
- Шапка главы жирным на всю ширину, breadcrumb предков.
- Прочитанное — приглушённый цвет (полупрозрачный).
- Свайп влево = прочитано + переход к следующей паре; вправо = снять отметку.
  `touch-action: pan-y`, детект по pointer events, порог 48px, один палец.
- Динамик (BG): тап — озвучить строку; удержание — непрерывное чтение.
  Цвет: синий `#4C9AFF` (говорит), зелёный `#34D399` (непрерывное чтение).

### 5.4 Перевод по тапу на слово (мгновенно)

- Тап по слову — пауза ~450мс → попап с переводом сразу (без повторного тапа).
- Длинное удержание — штатное выделение Safari (для копирования).
- Определение слова по координате касания: `document.caretRangeFromPoint` /
  `range.getBoundingClientRect` → слово по границам пробелов.
- Язык: если текущая колонка болгарская — `bg→ru`, иначе `ru→bg`.

### 5.5 Нижняя панель

▸ (свернуть тулбар) · ⏮ глава · слайдер + метки глав + «128 / 512» · ⏭ глава · ☰.

### 5.6 Сайдбар глав

Открытие: кнопка ☰ или свайп вверх по нижней панели. Иерархический список с
breadcrumb; клик → прыжок к паре.

## 6. TTS (озвучка)

- `speechSynthesis`, язык `bg-BG`.
- Обычное чтение строки и непрерывное чтение с автопрокруткой — логика из
  `ReaderViewModel` (`toggleSpeak` / `startContinuousReading` / `advanceContinuousReading`).
- Если болгарского голоса на iOS нет — снэкбар с подсказкой (как в Android:
  «Болгарский голос не установлен»), без падения.

## 7. Перевод слова

- Основной: MyMemory API `https://api.mymemory.translated.net/get?q=...&langpair=bg|ru`
  (CORS ок, без ключа). Каскадный fallback: LibreTranslate public
  (`https://libretranslate.com/translate`) при 4xx/5xx; при любом сбое —
  «Не удалось перевести» (не блокирует чтение).
- Асинхронный запрос с кешем по слову на сессию.

## 8. PWA и деплой

- `manifest.webmanifest`: standalone, theme/background `#1A1E24`, иконки 192/512 + SVG,
  `apple-touch-icon` 180×180, `apple-mobile-web-app-capable`, цвет статусбара.
- `viewport-fit=cover` + safe-area-insets.
- `vite-plugin-pwa`: precache всех ассетов, `Stale-While-Revalidate`, автообновление
  версий; книги/прогресс НЕ в кэше SW, а в IndexedDB.
- GitHub Actions: `push` по путям `pwa/**` → `pnpm install` → `pnpm build` →
  публикация `dist/` на ветку `gh-pages` (peaceiris/actions-gh-pages).
- `base: '/<repo>/'` в Vite config (имя репо — `bilingreader-app`).

## 9. Риски

| Риск | Решение |
|------|---------|
| Болгарского голоса нет на iOS | Снэкбар с инструкцией, не фейл |
| Лимиты MyMemory | Fallback на LibreTranslate, кеш, «Не удалось перевести» |
| Свайп vs вертикальный скролл | `touch-action: pan-y`, порог 48px, один палец |
| Производительность на длинных книгах | react-window, мемоизация строк |
| Потеря данных при очистке Safari | Хранение в IndexedDB; иконка установки в PWA |
| Отвязать color-scheme при standalone | Задать theme-color, `viewport-fit=cover` |

## 10. Критерии приёмки

1. `pnpm build` + `pnpm preview` — приложение работает, SW зарегистрирован.
2. Импорт `.json` (оба формата) из Файлов на iPad — книга появляется в библиотеке.
3. Чтение: скролл, свайпы прочитано/непрочитано, затем перезагрузка — позиция и
   отметки восстановлены.
4. Тема/шрифт/колонки/разворот работают и запоминаются.
5. Слайдер синхронизирован, метки глав на треке, прыжки по главам.
6. Сайдбар: иерархия, breadcrumb, переход к главе.
7. Тап по слову — мгновенный перевод; длинное удержание — штатное выделение.
8. Динамик читает болгарский; непрерывное чтение автопрокручивается.
9. Оффлайн: после первого запуска всё работает без сети.
10. На iPad добавляется на главный экран, запускается в standalone, контент не
    уходит под чёлку.

## 11. Решения

- Стек: React 18 + TS + Vite; UI — самописный (без UI-фреймворков).
- Деплой: GitHub Pages project site, ветка `gh-pages`.
- Виртуализация: `react-window` (может быть заменена без изменения интерфейсов).
- Книги/прогресс: IndexedDB; настройки отображения: localStorage.
- Демо-книги не включаем — только импорт своих JSON.