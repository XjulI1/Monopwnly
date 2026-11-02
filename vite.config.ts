import { templateCompilerOptions } from '@tresjs/core'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const THREE_BUNDLE_LIMIT_KB = 1600

export default defineConfig({
  plugins: [vue({ ...templateCompilerOptions })],
  build: {
    chunkSizeWarningLimit: THREE_BUNDLE_LIMIT_KB,
  },
})
