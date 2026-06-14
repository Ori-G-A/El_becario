import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El SW se registra en dev para poder probar la instalación localmente.
      devOptions: { enabled: true },
      includeAssets: ['favicon.svg', 'becario-icon.svg'],
      // SEGURIDAD: solo precacheamos el shell estático (JS/CSS/HTML/iconos).
      // NO se define runtimeCaching para el dominio de Supabase, así que las
      // respuestas con datos sensibles NUNCA quedan cacheadas offline en claro.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: 'El Becario',
        short_name: 'Becario',
        description: 'El pasante no remunerado que te ordena la vida.',
        lang: 'es',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#EFEDE4',
        theme_color: '#EFEDE4',
        icons: [
          {
            src: 'becario-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'becario-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
