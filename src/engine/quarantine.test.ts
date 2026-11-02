import { describe, expect, it } from 'vitest'
import { cardIdByTitle } from './board/cards'
import { A, B, act, makeState, player, rejectCode, roll } from './testUtils'

const inQuarantine = (failedAttempts = 0, extra: object = {}) =>
  makeState({ overrides: [{ position: 10, quarantine: { failedAttempts }, ...extra }] })

describe('entering quarantine', () => {
  it('enters by a card after a double without the right to roll again', () => {
    const start = makeState({ overrides: [{ position: 4 }], decks: { patch: [cardIdByTitle('patch', 'Alerte du SOC')] } })
    const { state, events } = roll(start, [2, 2])
    expect(player(state, A)).toMatchObject({ position: 10, quarantine: { failedAttempts: 0 } })
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: false })
    expect(events).toContainEqual({ type: 'sentToQuarantine', playerId: A, reason: 'card' })
  })

  it('enters on Détecté ! without salary', () => {
    const { state } = roll(makeState({ overrides: [{ position: 26 }] }), [1, 3])
    expect(player(state, A)).toMatchObject({ position: 10, cash: 1500, quarantine: { failedAttempts: 0 } })
  })
})

describe('paying the fine', () => {
  it('pays 50 and stays in preRoll', () => {
    const { state } = act(inQuarantine(0, { cash: 300 }), { type: 'payQuarantineFine', playerId: A })
    expect(player(state, A)).toMatchObject({ cash: 250, quarantine: null })
    expect(state.phase).toEqual({ kind: 'preRoll' })
  })

  it('refuses the fine without enough cash', () => {
    expect(rejectCode(inQuarantine(0, { cash: 40 }), { type: 'payQuarantineFine', playerId: A })).toBe('INSUFFICIENT_FUNDS')
  })

  it('refuses the fine outside quarantine', () => {
    expect(rejectCode(makeState(), { type: 'payQuarantineFine', playerId: A })).toBe('NOT_IN_QUARANTINE')
  })
})

describe('decryption key', () => {
  it('frees the player and puts the key under its deck', () => {
    const key = cardIdByTitle('exploit', 'Clé de déchiffrement')
    const start = inQuarantine(0, { keys: [key] })
    start.decks.exploit = start.decks.exploit.filter((id) => id !== key)
    const { state } = act(start, { type: 'useDecryptionKey', playerId: A })
    expect(player(state, A)).toMatchObject({ quarantine: null, keys: [] })
    expect(state.decks.exploit.at(-1)).toBe(key)
    expect(state.decks.exploit).toHaveLength(16)
  })

  it('refuses without a key', () => {
    expect(rejectCode(inQuarantine(), { type: 'useDecryptionKey', playerId: A })).toBe('NO_KEY')
  })
})

describe('trying a double', () => {
  it('frees and moves on a double without rolling again', () => {
    const { state, events } = roll(inQuarantine(), [4, 4])
    expect(player(state, A)).toMatchObject({ position: 18, quarantine: null })
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'tor-node' })
    expect(events).toContainEqual({ type: 'leftQuarantine', playerId: A, method: 'double' })
    const bought = act(state, { type: 'buyProperty', playerId: A }).state
    expect(bought.phase).toEqual({ kind: 'postRoll', mayRollAgain: false })
  })

  it('counts a failed attempt and ends the move', () => {
    const { state } = roll(inQuarantine(), [2, 5])
    expect(player(state, A)).toMatchObject({ position: 10, quarantine: { failedAttempts: 1 } })
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: false })
  })

  it('pays 50 and moves after the third failure', () => {
    const { state } = roll(inQuarantine(2, { cash: 400 }), [1, 3])
    expect(player(state, A)).toMatchObject({ position: 14, cash: 350, quarantine: null })
  })

  it('goes through the debt before moving when the fine cannot be paid', () => {
    const start = makeState({
      overrides: [{ position: 10, quarantine: { failedAttempts: 2 }, cash: 20 }],
      ownership: { 'vpn-node': { owner: A } },
    })
    let state = roll(start, [1, 3]).state
    expect(state.phase).toEqual({
      kind: 'debt',
      debtor: A,
      payments: [{ to: 'bank', amount: 50, reason: 'quarantineFine' }],
      resume: { kind: 'moveAfterFine', steps: 4 },
    })
    state = act(state, { type: 'mortgage', playerId: A, squareId: 'vpn-node' }).state
    state = act(state, { type: 'payDebt', playerId: A }).state
    expect(player(state, A)).toMatchObject({ position: 14, cash: 70 })
  })
})

describe('rights in quarantine', () => {
  it('still collects rent', () => {
    const start = makeState({
      current: 1,
      overrides: [{ position: 10, quarantine: { failedAttempts: 0 } }, { position: 4 }],
      ownership: { 'intranet': { owner: A } },
    })
    const { state } = roll(start, [4, 6], B)
    expect(player(state, A).cash).toBe(1512)
  })
})
