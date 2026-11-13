import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  // The deploy workflow sets VITE_BASE to "/<repo name>/", so the same code
  // builds correctly for every repository it is published from.
  const base = loadEnv(mode, '.', 'VITE_').VITE_BASE || '/bilingreader-app/'
  return {
    base,
    define: {
      __BUILD_TAG__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC — v0.3 langs')
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Biling Reader',
          short_name: 'BilingReader',
          description: 'Чтение параллельных текстов на любой паре языков',
          start_url: base,
          scope: base,
          display: 'standalone',
          orientation: 'landscape',
          theme_color: '#1A1E24',
          background_color: '#1A1E24',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
          navigateFallback: base + 'index.html'
        }
      })
    ]
  }
})
