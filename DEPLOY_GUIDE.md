# BilingReader v2 PWA - Deployment Guide

## 🚀 GitHub Actions автоматический деплой

Приложение автоматически собирается и деплоится на GitHub Pages при каждом push в master ветку.

### Как это работает

1. **Push на master** → GitHub Actions запускается
2. **npm run build** → собирает PWA приложение
3. **Деплой на GitHub Pages** → приложение становится доступно по URL
4. **PWA манифест** → приложение можно установить как нативное приложение

### URLs

**Production PWA:**
```
https://packiba.github.io/bilingreader-v2/
```

**Installation:**
- На мобильном: откройте URL, нажмите меню → "Install app" или "Add to Home Screen"
- На PC: откройте URL, нажмите кнопку установки в адресной строке браузера

### Структура репозитория v2-deploy

```
bilingreader-v2/
├── .github/workflows/
│   └── deploy-pwa.yml          # GitHub Actions workflow
├── dist/                        # Собранное приложение (генерируется)
├── src/                         # Исходный код
├── vite.config.ts              # Конфиг с base: /bilingreader-v2/
├── package.json
└── index.html
```

## 🔧 Локальная разработка

```bash
# Установка зависимостей
npm install

# Разработка (с горячей перезагрузкой)
npm run dev

# Локальный предпросмотр production сборки
npm run preview

# Полная сборка
npm run build
```

## 📱 PWA функциональность

Приложение работает как:
- ✅ Веб-приложение (через браузер)
- ✅ Установленное нативное приложение (iOS/Android/Windows)
- ✅ Оффлайн (Service Worker кэширует все ресурсы)
- ✅ Работает на медленных сетях (оптимизировано)

### Манифест PWA

Путь: `vite.config.ts` → VitePWA plugin

```typescript
manifest: {
  name: 'Biling Reader',
  short_name: 'BilingReader',
  start_url: '/bilingreader-v2/',
  scope: '/bilingreader-v2/',
  display: 'standalone',  // Как нативное приложение
  icons: [...]
}
```

## 🔄 CI/CD Pipeline

### GitHub Actions: deploy-pwa.yml

```
┌─────────────────┐
│ Push на master  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Build Job (ubuntu)      │
├─────────────────────────┤
│ 1. Checkout code        │
│ 2. Setup Node 18        │
│ 3. npm ci               │
│ 4. npm run build        │
│ 5. Upload dist/         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Deploy Job              │
├─────────────────────────┤
│ Deploy pages artifact   │
│ to GitHub Pages         │
└────────┬────────────────┘
         │
         ▼
    ✅ LIVE
```

## 📊 Мониторинг деплоя

1. Перейти в https://github.com/packiba/bilingreader-v2
2. Actions → Deploy PWA to GitHub Pages
3. Смотреть статус последнего run'a
4. ✅ = успешно, ❌ = ошибка (см. логи)

## 🐛 Troubleshooting

### Приложение не деплоится
- Проверить Actions логи: GitHub → bilingreader-v2 → Actions
- Проверить Node версию (должна быть 18+)
- Проверить npm ошибки в логе

### Приложение медленное при первой загрузке
- Это нормально на первый раз (Service Worker кэширует)
- При 2-й загрузке будет очень быстро
- Проверить в DevTools Application → Cache Storage

### URL неверная в адресной строке
- Убедитесь, что `base` в vite.config.ts совпадает с путём репозитория
- Должно быть: `base: '/bilingreader-v2/'`

## 🎯 Статус

- [x] GitHub Actions workflow создан
- [x] PWA конфигурация готова
- [ ] Первый деплой (нужно запушить код)
- [ ] Проверить на мобильном
- [ ] Установить как приложение

## 📦 Размер бандла

Оптимизировано для быстрой загрузки:
- HTML: ~2 KB
- JS/CSS: ~150 KB (сжато)
- Icons: ~50 KB
- **Итого: ~200 KB** - очень быстро!

## 🔐 HTTPS

GitHub Pages автоматически выдаёт HTTPS сертификаты.
✅ Безопасно для PWA

## 💾 Как пользователи получат обновления

- Web: автоматическое обновление (Service Worker)
- Installed App: автоматическое обновление (раз в сутки)
- Ручное: Откройте в браузере → обновится автоматически

---

**Deployment URL**: https://packiba.github.io/bilingreader-v2/
**Repository**: https://github.com/packiba/bilingreader-v2
