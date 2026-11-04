import { describe, expect, it } from 'vitest'
import { POT_ANIMATION_SECONDS, potAnimationFor, potCounterPose } from './potCounter'

describe('pot counter', () => {
  it('pulses when the pot grows and rises away when it is collected', () => {
    expect(potAnimationFor(200, 300)).toBe('grow')
    expect(potAnimationFor(300, 0)).toBe('collect')
    expect(potAnimationFor(0, 0)).toBe('none')
  })

  it('swells then settles back while the pot grows', () => {
    const middle = potCounterPose('grow', POT_ANIMATION_SECONDS.grow / 2)
    expect(middle.scale).toBeGreaterThan(1)
    expect(middle).toMatchObject({ rise: 0, opacity: 1, done: false })
    expect(potCounterPose('grow', POT_ANIMATION_SECONDS.grow)).toEqual({ scale: 1, rise: 0, opacity: 1, done: true })
  })

  it('rises and fades while a player collects the pot, then comes back at rest', () => {
    const middle = potCounterPose('collect', POT_ANIMATION_SECONDS.collect / 2)
    expect(middle.rise).toBeGreaterThan(0)
    expect(middle.opacity).toBeCloseTo(0.5)
    expect(potCounterPose('collect', POT_ANIMATION_SECONDS.collect + 1)).toEqual({ scale: 1, rise: 0, opacity: 1, done: true })
  })
})
