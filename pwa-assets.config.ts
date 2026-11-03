import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'
import { THEME_BACKGROUND } from './src/theme.ts'

// L'icône source est déjà pleine page avec son motif dans la zone de sécurité : ni marge ni fond
// blanc ajoutés aux variantes « maskable » et Apple.
const fullBleed = { padding: 0, resizeOptions: { background: THEME_BACKGROUND } }

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, ...fullBleed },
    apple: { ...minimal2023Preset.apple, ...fullBleed },
  },
  images: ['public/icon.svg'],
})
