import tailwindcss from '@tailwindcss/vite'
import { templateCompilerOptions } from '@tresjs/core'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { manifest } from './src/pwa/manifest.ts'

const THREE_BUNDLE_LIMIT_KB = 1600
const PRECACHE_FILE_LIMIT_BYTES = 4 * 1024 * 1024

export default defineConfig({
  plugins: [
    vue({ ...templateCompilerOptions }),
    tailwindcss(),
    VitePWA({
      // La nouvelle version attend que le joueur recharge depuis l'accueil, ou le lancement suivant.
      registerType: 'prompt',
      // Enregistrement fait par main.ts via `virtual:pwa-register`.
      injectRegister: false,
      manifest,
      // Les icônes sont déjà couvertes par `globPatterns`.
      includeManifestIcons: false,
      workbox: {
        // Le plugin ajoute lui-même le manifeste à la liste de précache.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Le script principal, Three.js compris, est proche de la limite par défaut (2 Mo).
        maximumFileSizeToCacheInBytes: PRECACHE_FILE_LIMIT_BYTES,
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    chunkSizeWarningLimit: THREE_BUNDLE_LIMIT_KB,
  },
})
