import { describe, expect, it } from 'vitest'
import { applyAction } from './index'
import { A, B, act, forceDice, makeState, player, roll } from './testUtils'

describe('rolling and moving', () => {
  it('moves by the dice total and records the roll', () => {
    const { state } = roll(makeState(), [2, 5])
    expect(player(state, A).position).toBe(7)
    expect(state.lastRoll).toEqual([2, 5])
  })

  it('always rolls dice between 1 and 6', () => {
    for (let seed = 0; seed < 1000; seed++) {
      const state = makeState()
      state.rngState = seed
      const result = applyAction(state, { type: 'rollDice', playerId: A })
      if (!result.ok) throw new Error(result.error.code)
      for (const die of result.state.lastRoll ?? []) {
        expect(die).toBeGreaterThanOrEqual(1)
        expect(die).toBeLessThanOrEqual(6)
      }
    }
  })
})

describe('Boot salary', () => {
  it('pays 200 when passing Boot, before resolving the square', () => {
    const { state, events } = roll(makeState({ overrides: [{ position: 36, cash: 500 }] }), [3, 4])
    expect(player(state, A)).toMatchObject({ position: 3, cash: 700 })
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'modem-56k' })
    expect(events.find((e) => e.type === 'paid')).toMatchObject({ from: 'bank', to: A, amount: 200, reason: 'salary' })
  })

  it('pays 200 when stopping on Boot', () => {
    const { state } = roll(makeState({ overrides: [{ position: 33, cash: 500 }] }), [3, 4])
    expect(player(state, A).position).toBe(0)
    expect(player(state, A).cash).toBe(700)
  })
})

describe('doubles', () => {
  it('accepts a second roll and counts consecutive doubles', () => {
    const first = roll(makeState({ overrides: [{ position: 18 }] }), [1, 1]).state
    expect(first.doublesInARow).toBe(1)
    expect(roll(first, [2, 2]).state.doublesInARow).toBe(2)
    expect(roll(first, [2, 3]).state.doublesInARow).toBe(0)
  })

  it('sends to quarantine on the third double without moving', () => {
    const start = makeState({ overrides: [{ position: 5, cash: 500 }], doublesInARow: 2, phase: { kind: 'postRoll', mayRollAgain: true } })
    const { state, events } = roll(start, [4, 4])
    expect(player(state, A)).toMatchObject({ position: 10, cash: 500, quarantine: { failedAttempts: 0 } })
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: false })
    expect(events.some((e) => e.type === 'moved')).toBe(false)
    expect(events).toContainEqual({ type: 'sentToQuarantine', playerId: A, reason: 'tripleDouble' })
  })
})

describe('landing', () => {
  it('charges the Ransomware tax', () => {
    const { state } = roll(makeState(), [2, 3])
    expect(player(state, A).cash).toBe(1300)
  })

  it('charges the GDPR fine', () => {
    const { state } = roll(makeState({ overrides: [{ position: 33 }] }), [2, 3])
    expect(player(state, A).cash).toBe(1400)
  })

  it('sends to quarantine on Détecté !', () => {
    const { state } = roll(makeState({ overrides: [{ position: 25, cash: 500 }] }), [2, 3])
    expect(player(state, A)).toMatchObject({ position: 10, cash: 500, quarantine: { failedAttempts: 0 } })
  })

  it('does nothing on a simple visit to the quarantine square', () => {
    const { state } = roll(makeState({ overrides: [{ position: 4 }] }), [2, 4])
    expect(player(state, A)).toMatchObject({ position: 10, quarantine: null, cash: 1500 })
  })

  it('does nothing on the DMZ', () => {
    const { state } = roll(makeState({ overrides: [{ position: 15 }] }), [2, 3])
    expect(player(state, A)).toMatchObject({ position: 20, cash: 1500 })
  })

  it('charges no rent on a mortgaged system', () => {
    const start = makeState({ ownership: { 'smart-fridge': { owner: B, mortgaged: true } } })
    const { state } = roll(start, [3, 4])
    expect(player(state, A).cash).toBe(1500)
    expect(player(state, B).cash).toBe(1500)
  })

  it('offers to buy a free square', () => {
    const { state } = roll(makeState(), [3, 4])
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'smart-fridge' })
  })

  it('does nothing on an own square', () => {
    const start = makeState({ ownership: { 'smart-fridge': { owner: A } } })
    const { state, events } = roll(start, [3, 4])
    expect(state.phase.kind).toBe('postRoll')
    expect(events.some((e) => e.type === 'paid')).toBe(false)
  })

  it('keeps rolling with forced dice through act helper', () => {
    const state = forceDice(makeState(), [[1, 2]])
    expect(act(state, { type: 'rollDice', playerId: A }).state.lastRoll).toEqual([1, 2])
  })
})
