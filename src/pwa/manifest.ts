import type { ManifestOptions } from 'vite-plugin-pwa'
import { THEME_BACKGROUND, THEME_COLOR } from '../theme.ts'

/**
 * Manifeste web, passé à `VitePWA` dans `vite.config.ts`. Les adresses sont relatives pour que
 * l'application s'installe aussi servie sous un sous-chemin. Les icônes sont produites dans
 * `public/` par `pnpm generate-pwa-assets` (préréglage `minimal2023Preset`).
 */
export const manifest: Partial<ManifestOptions> = {
  id: './',
  name: 'Monopwnly',
  short_name: 'Monopwnly',
  description:
    'Jeu de plateau cyber : piratez des systèmes, installez des backdoors et ruinez vos adversaires en PwnCoins.',
  lang: 'fr',
  dir: 'ltr',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'landscape',
  background_color: THEME_BACKGROUND,
  theme_color: THEME_COLOR,
  icons: [
    { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
