# Двуезичен четец — Android native приложение

**Дата**: 2026-07-27
**Платформа**: Android (minSdk 26, compileSdk/targetSdk 35)
**UI Framework**: Jetpack Compose (Material 3)
**Стиль**: Edge-to-Edge (полноэкранный)
**Хранение**: Preferences DataStore
**Язык**: Kotlin
**Сборка**: Gradle KTS + AGP + Compose BOM

---

## 1. Контекст

Готовый HTML/CSS/JS-ридер параллельных текстов (BG/RU) с пагинацией, свайпами,
двухколоночной вёрсткой. Нужно переписать как нативное Android-приложение
на Jetpack Compose, полностью отказавшись от WebView-подхода.

---

## 2. Структура проекта

`
com.example.olivertwist/
├── MainActivity.kt              — точка входа, edge-to-edge, setContent
├── ReaderApplication.kt         — Application (ручной DI через синглтон)
├── ui/
│   ├── theme/
│   │   ├── Theme.kt             — DarkScheme / LightScheme
│   │   ├── Color.kt             — цвета из таблицы
│   │   └── Type.kt              — типографика
│   ├── screen/
│   │   ├── ReaderScreen.kt      — 3 зоны: TopAppBar + Pager + BottomBar
│   │   └── ReaderViewModel.kt   — состояние (pages, fontSize, theme, readPairs)
│   ├── components/
│   │   ├── PairRow.kt           — строка с SwipeToDismissBox
│   │   ├── ChapterHeader.kt     — заголовок главы
│   │   ├── PageSlider.kt        — Slider + индикатор "128 / 512"
│   │   └── ChapterSidebar.kt    — ModalBottomSheet со списком глав
│   └── pager/
│       └── BookPager.kt         — HorizontalPager + разбивка на страницы
├── data/
│   ├── model/
│   │   └── Book.kt              — data class: Book, Chapter, TextPair
│   ├── parser/
│   │   └── BookParser.kt        — парсинг JSON
│   ├── repository/
│   │   └── BookRepository.kt    — чтение JSON через ContentResolver
│   └── datastore/
│       └── ReaderPreferences.kt — DataStore per-file
`

### Директории проекта

`
oliver-twist-android/
├── settings.gradle.kts
├── build.gradle.kts
├── gradle.properties
├── local.properties
├── gradlew.bat
├── gradle/wrapper/
└── app/
    ├── build.gradle.kts
    └── src/main/
        ├── AndroidManifest.xml
        ├── java/com/example/olivertwist/
        └── res/
            ├── values/themes.xml
            ├── values/strings.xml
            └── mipmap-*/
`

---

## 3. Архитектура экрана

### 3.1 Верхний бар (TopAppBar)

| Группа | Кнопка | Действие |
|--------|--------|----------|
| Левая | 📁 Открыть файл | SAF file picker (application/json) |
| Левая | 🌙/☀️ Тема | Переключение Dark/Light |
| Центр | ⇄ Столбцы | Поменять местами BG/RU |
| Правая | A− | Уменьшить шрифт (min 12sp) |
| Правая | A+ | Увеличить шрифт (max 24sp) |

### 3.2 Центральная область (HorizontalPager)

- Текст разбивается на страницы по высоте экрана
- Перелистывание — горизонтальный свайп
- PairRow: две ячейки 50/50, VerticalDivider
- ChapterHeader: жирный на всю ширину, отдельный фон
- Зебра (чередование фона строк)
- SwipeToDismissBox на строку — отметка прочитано / снять отметку
- Прочитанный текст — приглушённый стиль

### 3.3 Нижняя панель (BottomBar)

- Slider синхронизирован с PagerState
- Индикатор "128 / 512"
- Кнопка ☰ — сайдбар с главами

---

## 4. Цветовые состояния

| Элемент | Dark | Light |
|---------|------|-------|
| Фон | #1A1E24 | #F4F6F8 |
| Зебра | #21262D / #1A1E24 | #FFFFFF / #F4F6F8 |
| Текст (непрочит.) | #D1D5DB | #1F2937 |
| Текст (прочитан.) | #6B7280 (50%) | #9CA3AF (50%) |
| Разделители | rgba(255,255,255,0.08) | rgba(0,0,0,0.08) |

---

## 5. Логика сохранения

- Свайп строки влево → отметка read → save:
  - readPairs (Set\<Int\>, JSON-массив)
  - lastReadPair (Int)
- Только явный свайп строки обновляет lastReadPair
- При открытии: lastReadPair → поиск страницы → scrollToPage
- DataStore ключи (per-file по hash URI):
  - last_read_page_\<hash\>
  - last_read_pair_\<hash\>
  - read_pairs_\<hash\>
  - font_size_\<hash\> (default 15sp)
  - theme_\<hash\> ("dark"/"light")
  - columns_swapped_\<hash\>

---

## 6. Пересчёт при изменении шрифта

1. Запомнить верхний видимый чанк на текущей странице
2. Пересчитать totalPages с новым fontSize
3. Найти страницу с этим чанком
4. scrollToPage без визуального скачка
5. Сохранить в DataStore

---

## 7. Формат JSON (без изменений)

`json
[{
  "pair_num": 1,
  "title_src": "...",
  "title_tgt": "...",
  "src_sents": ["..."],
  "tgt_sents": ["..."],
  "alignment": [[[0],[0]],[[1],[1]]]
}]
`

---

## 8. Утверждённые решения

- **minSdk**: 26 (Android 8.0)
- **compileSdk/targetSdk**: 35
- **Package**: com.example.olivertwist
- **Launcher icons**: из существующих PWA-иконок
- **Демо-книга**: не включать, только file picker
- **DI**: ручной (Application-синглтон), без Hilt
- **Ориентация**: userLandscape
- **Сборка**: SDK через sdkmanager (platform 35, build-tools 35.0.0)
- **Gradle**: wrapper 8.7+, AGP 8.5+, Kotlin 2.0+, Compose BOM

---

## 9. Чек-лист приёмки

1. Landscape при любом системном автоповороте
2. Первый запуск → file picker
3. Отметка чанка + закрытие → reopen на том же чанке
4. Свайп строки → приглушённый текст
5. A−/A+ → шрифт меняется, фокус не теряется
6. Смена темы → вся цветовая схема
7. ⇄ столбцы → BG/RU меняются
8. Список глав → переход на страницу
9. Работа без интернета
10. Нет регрессий относительно PWA-версии
