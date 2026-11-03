import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { THEME_BACKGROUND, THEME_COLOR } from '../theme'
import { manifest } from './manifest'

const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url))

const cssVariable = (name: string) =>
  readFileSync(root('src/style.css'), 'utf8').match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]+);`, 'i'))?.[1]

describe('web app manifest', () => {
  it('names the app Monopwnly, in French', () => {
    expect(manifest.name).toBe('Monopwnly')
    expect(manifest.short_name).toBe('Monopwnly')
    expect(manifest.lang).toBe('fr')
    expect(manifest.description).toBeTruthy()
  })

  it('uses relative addresses, so the app installs under a sub-path too', () => {
    for (const address of [manifest.id, manifest.start_url, manifest.scope]) expect(address).toBe('./')
  })

  it('opens standalone, in landscape', () => {
    expect(manifest.display).toBe('standalone')
    expect(manifest.orientation).toBe('landscape')
  })

  it('takes its colours from the theme', () => {
    expect(manifest.background_color).toBe(THEME_BACKGROUND)
    expect(manifest.theme_color).toBe(THEME_COLOR)
    expect(cssVariable('void')).toBe(THEME_BACKGROUND)
    expect(cssVariable('panel')).toBe(THEME_COLOR)
    expect(readFileSync(root('index.html'), 'utf8')).toContain(`<meta name="theme-color" content="${THEME_COLOR}" />`)
  })

  it('declares 192 and 512 pixel icons, one of them maskable, each one present in public/', () => {
    const icons = manifest.icons ?? []
    const sizes = icons.map((icon) => icon.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(icons.some((icon) => icon.purpose === 'maskable' && icon.sizes === '512x512')).toBe(true)
    for (const icon of icons) expect(existsSync(root(`public/${icon.src}`)), icon.src).toBe(true)
  })
})
