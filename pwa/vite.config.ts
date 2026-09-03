import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/bilingreader-app/',
  define: {
    __BUILD_TAG__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC')
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
        description: 'Чтение параллельных текстов (BG/RU)',
        start_url: '/bilingreader-app/',
        scope: '/bilingreader-app/',
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
        navigateFallback: '/bilingreader-app/index.html'
      }
    })
  ]
})