import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Registration is done by hand in src/pwa.ts, so updates never reload the app on their own.
      injectRegister: false,
      registerType: 'prompt',
      // Icons are already picked up by globPatterns below.
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'Miyagi Street Quiz',
        short_name: 'Street Quiz',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Placeholder colours until branding is decided.
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Everything the app needs offline. Question files are bundled into the JS.
        globPatterns: ['**/*.{html,js,css,png,svg}'],
        // (the plugin adds manifest.webmanifest itself)
        cleanupOutdatedCaches: true,
        // A new version waits until the app is next opened fresh (or Reset questions applies it).
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ],
})
