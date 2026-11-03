import { afterEach, describe, expect, it, vi } from 'vitest'
import { ANIMATION_SPEEDS, durationsFor, loadAnimationSpeed, saveAnimationSpeed, SPEED_LABELS } from './animationSpeed'

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: reduce && query.includes('reduce'), media: query }))
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('durations', () => {
  it('plays every animation faster in fast mode than in normal mode', () => {
    const normal = durationsFor('normal')
    const fast = durationsFor('fast')
    for (const key of ['diceRoll', 'perSquare', 'payment', 'bankruptcy', 'aiPause', 'aiCard'] as const) {
      expect(normal[key]).toBeGreaterThan(fast[key])
      expect(fast[key]).toBeGreaterThan(0)
    }
  })

  it('plays nothing in instant mode', () => {
    expect(durationsFor('instant')).toEqual({ diceRoll: 0, perSquare: 0, payment: 0, bankruptcy: 0, aiPause: 0, aiCard: 0 })
  })

  it('offers three speeds with French labels', () => {
    expect(ANIMATION_SPEEDS.map((speed) => SPEED_LABELS[speed])).toEqual(['Normale', 'Rapide', 'Instantanée'])
  })
})

describe('remembered speed', () => {
  it('defaults to normal', () => {
    stubReducedMotion(false)
    expect(loadAnimationSpeed()).toBe('normal')
  })

  it('reads back the saved speed', () => {
    stubReducedMotion(false)
    saveAnimationSpeed('fast')
    expect(loadAnimationSpeed()).toBe('fast')
  })

  it('ignores an unknown stored value', () => {
    stubReducedMotion(false)
    localStorage.setItem('monopwnly.animationSpeed', 'warp')
    expect(loadAnimationSpeed()).toBe('normal')
  })

  it('falls back to normal when the slow speed that no longer exists was saved', () => {
    stubReducedMotion(false)
    localStorage.setItem('monopwnly.animationSpeed', 'slow')
    expect(loadAnimationSpeed()).toBe('normal')
  })

  it('falls back to the default when the storage throws', () => {
    stubReducedMotion(false)
    const denied = () => {
      throw new Error('denied')
    }
    vi.stubGlobal('localStorage', { getItem: denied, setItem: denied, clear: () => undefined })
    expect(() => saveAnimationSpeed('fast')).not.toThrow()
    expect(loadAnimationSpeed()).toBe('normal')
  })

  it('defaults to instant when the system asks for reduced motion', () => {
    stubReducedMotion(true)
    expect(loadAnimationSpeed()).toBe('instant')
  })

  it('prefers a saved speed over the reduced motion preference', () => {
    stubReducedMotion(true)
    saveAnimationSpeed('normal')
    expect(loadAnimationSpeed()).toBe('normal')
  })
})
