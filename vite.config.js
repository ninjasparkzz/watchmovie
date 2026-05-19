import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'WatchTV',
        short_name: 'WatchTV',
        description: 'Premium Streaming Experience',
        theme_color: '#0e0e16',
        background_color: '#0e0e16',
        display: 'standalone',
        icons: [
          {
            src: '/aiostreams-site/public/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
