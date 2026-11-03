import { describe, expect, it } from 'vitest'
import { cardIdByTitle } from './board/cards'
import { liquidationValue } from './payments'
import { A, B, C, D, act, actAll, makeState, player, rejectCode, roll } from './testUtils'

describe('automatic payment', () => {
  it('pays immediately when cash covers the rent', () => {
    const start = makeState({ overrides: [{ position: 4, cash: 300 }], ownership: { 'intranet': { owner: B, level: 1 } } })
    const { state } = roll(start, [4, 6])
    expect(player(state, A).cash).toBe(245)
    expect(player(state, B).cash).toBe(1555)
    expect(state.phase.kind).toBe('postRoll')
  })

  it('pays several payments in order with one paid event each', () => {
    const start = makeState({ players: 4, overrides: [{ position: 25 }], decks: { exploit: [cardIdByTitle('exploit', 'Conférence de sécurité')] } })
    const { events } = roll(start, [1, 1])
    const paid = events.filter((e) => e.type === 'paid')
    expect(paid.map((e) => e.type === 'paid' && e.to)).toEqual([B, C, D])
  })
})

describe('debt phase', () => {
  function inDebt() {
    const start = makeState({
      overrides: [{ position: 3, cash: 100 }],
      ownership: {
        'smart-fridge': { owner: B, level: 4 },
        'wifi-bulb': { owner: B, level: 4 },
        'ip-camera': { owner: B, level: 4 },
        'vpn-node': { owner: A },
        'tor-node': { owner: A },
      },
    })
    return roll(start, [2, 2]).state
  }

  it('opens a debt when cash does not cover the rent, without touching the cash', () => {
    const state = inDebt()
    expect(state.phase).toEqual({
      kind: 'debt',
      debtor: A,
      payments: [{ to: B, amount: 200, reason: 'rent' }],
      resume: { kind: 'postRoll' },
    })
    expect(player(state, A).cash).toBe(100)
  })

  it('refuses payDebt when the cash does not cover the first payment', () => {
    expect(rejectCode(inDebt(), { type: 'payDebt', playerId: A })).toBe('DEBT_NOT_COVERED')
  })

  it('refuses other actions during the debt', () => {
    const state = inDebt()
    expect(rejectCode(state, { type: 'endTurn', playerId: A })).toBe('WRONG_PHASE')
    expect(rejectCode(state, { type: 'rollDice', playerId: A })).toBe('WRONG_PHASE')
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'vpn-node' })).toBe('WRONG_PHASE')
  })

  it('resumes after mortgaging and paying', () => {
    const { state } = actAll(inDebt(), [
      { type: 'mortgage', playerId: A, squareId: 'vpn-node' },
      { type: 'mortgage', playerId: A, squareId: 'tor-node' },
      { type: 'payDebt', playerId: A },
    ])
    expect(player(state, A).cash).toBe(100)
    expect(player(state, B).cash).toBe(1700)
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: true })
  })
})

describe('liquidation value', () => {
  it('adds cash, building sales and mortgage values of active squares', () => {
    const state = makeState({
      overrides: [{ cash: 50 }],
      ownership: { minitel: { owner: A, level: 1 }, 'modem-56k': { owner: A, level: 1 }, 'vpn-node': { owner: A } },
    })
    expect(liquidationValue(state, A)).toBe(260)
  })

  it('ignores mortgaged squares', () => {
    const state = makeState({ overrides: [{ cash: 50 }], ownership: { 'vpn-node': { owner: A, mortgaged: true } } })
    expect(liquidationValue(state, A)).toBe(50)
  })
})

describe('bankruptcy', () => {
  it('transfers everything to a player creditor', () => {
    const start = makeState({
      players: 3,
      overrides: [{ cash: 20, keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }],
      ownership: {
        forum: { owner: A, level: 1 },
        blog: { owner: A },
        'online-shop': { owner: A },
        'tor-node': { owner: A, mortgaged: true },
      },
      bankStock: { backdoors: 31, rootkits: 12 },
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }, { to: C, amount: 10, reason: 'card' }], resume: { kind: 'postRoll' } },
    })
    const { state, events } = act(start, { type: 'declareBankruptcy', playerId: A })
    expect(player(state, B).cash).toBe(1500 + 70)
    expect(player(state, C).cash).toBe(1500)
    expect(state.ownership.forum).toEqual({ owner: B, mortgaged: false, level: 0 })
    expect(state.ownership['tor-node']).toEqual({ owner: B, mortgaged: true, level: 0 })
    expect(player(state, B).keys).toEqual([cardIdByTitle('patch', 'Clé de déchiffrement')])
    expect(state.bankStock.backdoors).toBe(32)
    expect(player(state, A)).toMatchObject({ bankrupt: true, cash: 0, keys: [] })
    expect(events).toContainEqual({ type: 'bankrupt', playerId: A, creditor: B })
  })

  it('returns everything to the bank', () => {
    const key = cardIdByTitle('exploit', 'Clé de déchiffrement')
    const start = makeState({
      players: 3,
      overrides: [{ cash: 10, keys: [key] }],
      ownership: { minitel: { owner: A, mortgaged: true } },
      decks: { exploit: [] },
      phase: { kind: 'debt', debtor: A, payments: [{ to: 'bank', amount: 200, reason: 'tax' }], resume: { kind: 'postRoll' } },
    })
    const { state } = act(start, { type: 'declareBankruptcy', playerId: A })
    expect(state.ownership.minitel).toBeUndefined()
    expect(state.decks.exploit).toEqual([key])
    expect(player(state, A).bankrupt).toBe(true)
  })

  it('passes to the next player when the current player goes bankrupt', () => {
    const start = makeState({
      players: 3,
      overrides: [{ cash: 10 }],
      phase: { kind: 'debt', debtor: A, payments: [{ to: 'bank', amount: 200, reason: 'tax' }], resume: { kind: 'postRoll' } },
    })
    const { state } = act(start, { type: 'declareBankruptcy', playerId: A })
    expect(state.players[state.currentPlayerIndex]?.id).toBe(B)
    expect(state.phase).toEqual({ kind: 'preRoll' })
  })

  it('resumes the current player turn when another payer goes bankrupt', () => {
    const start = makeState({
      players: 3,
      overrides: [{ position: 3 }, { cash: 5 }, { cash: 5 }],
      decks: { patch: [cardIdByTitle('patch', 'Serveur de jeu partagé')] },
    })
    let state = roll(start, [2, 3]).state
    expect(state.phase).toMatchObject({ kind: 'debt', debtor: B })
    state = act(state, { type: 'declareBankruptcy', playerId: B }).state
    expect(state.phase).toMatchObject({ kind: 'debt', debtor: C })
    state = act(state, { type: 'declareBankruptcy', playerId: C }).state
    expect(state.winner).toBe(A)
  })

  it('declares the last solvent player winner', () => {
    const start = makeState({
      overrides: [{ cash: 10 }],
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 200, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const { state, events } = act(start, { type: 'declareBankruptcy', playerId: A })
    expect(state.winner).toBe(B)
    expect(state.phase).toEqual({ kind: 'gameOver' })
    expect(events).toContainEqual({ type: 'gameWon', playerId: B })
  })

  it('resumes in postRoll of the current player after a payer bankruptcy at 3 solvent players', () => {
    const start = makeState({
      players: 4,
      overrides: [{ position: 3 }, { cash: 5 }],
      decks: { patch: [cardIdByTitle('patch', 'Serveur de jeu partagé')] },
    })
    let state = roll(start, [2, 3]).state
    state = act(state, { type: 'declareBankruptcy', playerId: B }).state
    expect(state.phase.kind).toBe('postRoll')
    expect(state.players[state.currentPlayerIndex]?.id).toBe(A)
    expect(player(state, A).cash).toBe(1500 + 5 + 20)
  })
})
