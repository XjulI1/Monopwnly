import { describe, expect, it } from 'vitest'
import { randomInt, rollTwoDice, shuffle } from './rng'

describe('rng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = { rngState: 42 }
    const b = { rngState: 42 }
    const seqA = Array.from({ length: 20 }, () => randomInt(a, 1000))
    const seqB = Array.from({ length: 20 }, () => randomInt(b, 1000))
    expect(seqA).toEqual(seqB)
    expect(a.rngState).toBe(b.rngState)
  })

  it('produces different sequences for different seeds', () => {
    const a = { rngState: 1 }
    const b = { rngState: 2 }
    const seqA = Array.from({ length: 10 }, () => randomInt(a, 1000))
    const seqB = Array.from({ length: 10 }, () => randomInt(b, 1000))
    expect(seqA).not.toEqual(seqB)
  })

  it('draws integers within bounds', () => {
    const holder = { rngState: 7 }
    for (let i = 0; i < 2000; i++) {
      const value = randomInt(holder, 6)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(6)
    }
  })

  it('rolls two dice between 1 and 6', () => {
    const holder = { rngState: 99 }
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      for (const die of rollTwoDice(holder)) {
        expect(die).toBeGreaterThanOrEqual(1)
        expect(die).toBeLessThanOrEqual(6)
        seen.add(die)
      }
    }
    expect(seen.size).toBe(6)
  })

  it('shuffles deterministically and keeps every element', () => {
    const items = Array.from({ length: 16 }, (_, i) => `card-${i}`)
    const a = shuffle({ rngState: 5 }, items)
    const b = shuffle({ rngState: 5 }, items)
    expect(a).toEqual(b)
    expect([...a].sort()).toEqual([...items].sort())
    expect(a).not.toEqual(items)
    expect(items[0]).toBe('card-0')
  })
})
