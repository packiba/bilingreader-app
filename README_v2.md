# BilingReader v2 - Progressive Web App

🌍 **Live PWA**: https://packiba.github.io/bilingreader-v2/

Профессиональное PWA приложение для чтения двуязычных и многоязычных книг в формате BLB.

## ✨ Возможности

- 📖 Чтение двуязычных книг (BLB v1)
- 🌐 Чтение многоязычных книг (BLB v2) - все 4+ языка в одном файле
- 🎛️ Выбор языков для левой и правой стороны
- 📱 Установка как нативное приложение (iOS, Android, Windows, Mac)
- 🔄 Синхронизация между устройствами
- 🌙 Тёмная тема
- 📝 Регулировка размера шрифта
- 🔊 Озвучка (выбор языка)
- 💾 Оффлайн работа (Service Worker)
- ⚡ Быстрая загрузка (<200 KB)

## 🚀 Быстрый старт

### Открыть в браузере
```
https://packiba.github.io/bilingreader-v2/
```

### Установить как приложение

**iOS (Safari):**
- Откройте ссылку
- Нажмите Поделиться → На главный экран

**Android (Chrome):**
- Откройте ссылку
- Нажмите меню → Установить приложение

**Windows/Mac/Linux:**
- Откройте ссылку в Chrome
- Нажмите кнопку установки рядом с адресной строкой

## 📚 Поддерживаемые форматы

### BLB v1 (двуязычный)
```json
{
  "blb_version": 1,
  "book": {"lang_src": "ru", "lang_tgt": "en"},
  "chapters": [{
    "pairs": [
      {"src": "Русский текст", "tgt": "English text"}
    ]
  }]
}
```

### BLB v2 (многоязычный)
```json
{
  "blb_version": 2,
  "format": "multilingual",
  "book": {"languages": ["ru", "en", "fr", "es"]},
  "chapters": [{
    "multilingual_pairs": [
      {
        "ru": "Русский",
        "en": "English",
        "fr": "Français",
        "es": "Español"
      }
    ]
  }]
}
```

Используйте инструменты из [Interlinear-translation-engine](https://github.com/packiba/Interlinear-translation-engine) для создания BLB файлов.

## 🛠️ Разработка

```bash
# Установка
npm install

# Развитие
npm run dev

# Сборка
npm run build

# Предпросмотр production
npm run preview
```

## 🔄 CI/CD

Приложение автоматически собирается и деплоится на GitHub Pages при каждом push на master.

**GitHub Actions Workflow:**
- Запуск: push на master
- Сборка: Node 18 + npm build
- Деплой: GitHub Pages
- Время: 2-3 минуты

**Статус деплоя:**
https://github.com/packiba/bilingreader-v2/actions

## 📦 Размер

- HTML: ~2 KB
- JS/CSS: ~150 KB (сжато)
- Icons: ~50 KB
- **Итого: ~200 KB** ⚡

## 🔐 Безопасность

- ✅ HTTPS (автоматически от GitHub Pages)
- ✅ PWA безопасность
- ✅ Service Worker кэширует локально
- ✅ Без внешних зависимостей (кроме assets)

## 📖 Документация

- [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) - инструкции по деплою
- [MULTILINGUAL_CHANGES.md](./MULTILINGUAL_CHANGES.md) - многоязычная поддержка
- [UPGRADE_PLAN.md](./UPGRADE_PLAN.md) - план развития

## 🔗 Связанные проекты

- **Parser Engine**: https://github.com/packiba/Interlinear-translation-engine
  - Парсинг PDF в JSON
  - Выравнивание предложений
  - Создание BLB файлов

- **Dev Version**: https://github.com/packiba/bilingreader-app
  - Разработка новых функций
  - Многоязычная поддержка
  - Тестирование

## 🎯 Репозитории

| Имя | Назначение | URL |
|-----|-----------|-----|
| bilingreader-v2 | Production PWA | https://github.com/packiba/bilingreader-v2 |
| bilingreader-app | Development | https://github.com/packiba/bilingreader-app |
| Interlinear-translation-engine | Parser + Aligner | https://github.com/packiba/Interlinear-translation-engine |

## 📝 Лицензия

MIT

## 👤 Автор

packiba@gmail.com

---

**Версия**: 2.0  
**Статус**: Production Ready ✅  
**PWA**: Fully Installable  
**Offline**: Supported  
**Last Updated**: 2026-11-13
