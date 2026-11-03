import { describe, expect, it } from 'vitest'
import { BOARD, QUARANTINE_INDEX } from '../engine'
import { diceTotalOdds, landingOdds } from './landingOdds'

describe('diceTotalOdds', () => {
  it('gives the chance of each total of two dice', () => {
    expect(diceTotalOdds(7)).toBeCloseTo(6 / 36)
    expect(diceTotalOdds(2)).toBeCloseTo(1 / 36)
    expect(diceTotalOdds(1)).toBe(0)
    expect(diceTotalOdds(13)).toBe(0)
  })
})

describe('landingOdds', () => {
  const odds = landingOdds()
  const indexOf = (id: string) => BOARD.findIndex((s) => s.id === id)

  it('sums to 1 over the 40 squares', () => {
    expect(odds).toHaveLength(40)
    expect(odds.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 9)
  })

  it('makes the quarantine the most frequent square', () => {
    const quarantine = odds[QUARANTINE_INDEX] ?? 0
    odds.forEach((p, index) => {
      if (index !== QUARANTINE_INDEX) expect(p).toBeLessThan(quarantine)
    })
  })

  it('never leaves a pawn on Détecté !', () => {
    expect(odds[indexOf('detected')]).toBe(0)
  })

  it('reflects the cards that send pawns to Boot and to the AI kernel', () => {
    const average = 1 / 40
    expect(odds[indexOf('boot')]).toBeGreaterThan(average)
    expect(odds[indexOf('ai-kernel')]).toBeGreaterThan(odds[indexOf('state-mainframe')] ?? 0)
  })

  it('is computed once and returns the same result', () => {
    expect(landingOdds()).toBe(odds)
  })
})
