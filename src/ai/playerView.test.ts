import { describe, expect, it } from 'vitest'
import { cardIdByTitle } from '../engine'
import { A, B, makeState } from '../engine/testUtils'
import { playerView } from './playerView'

describe('playerView', () => {
  it('reduces the decks to their sizes and drops the random generator', () => {
    const state = makeState({ overrides: [{ keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }] })
    state.decks.patch = state.decks.patch.slice(1)
    const view = playerView(state)
    expect('decks' in view).toBe(false)
    expect('rngState' in view).toBe(false)
    expect(view.deckSizes).toEqual({ exploit: 16, patch: 15 })
  })

  it('keeps the rest of the state public', () => {
    const state = makeState({
      players: 3,
      overrides: [{ cash: 900, position: 12 }, { quarantine: { failedAttempts: 1 } }],
      ownership: { blog: { owner: A, level: 2 }, forum: { owner: B, mortgaged: true } },
      phase: { kind: 'postRoll', mayRollAgain: true },
    })
    const view = playerView(state)
    expect(view.players).toEqual(state.players)
    expect(view.ownership).toEqual(state.ownership)
    expect(view.phase).toEqual(state.phase)
    expect(view.bankStock).toEqual(state.bankStock)
    expect(view.settings).toEqual(state.settings)
    expect([view.currentPlayerIndex, view.doublesInARow, view.turnNumber, view.lastRoll, view.winner]).toEqual([
      state.currentPlayerIndex,
      state.doublesInARow,
      state.turnNumber,
      state.lastRoll,
      state.winner,
    ])
  })

  it('serializes the same way whatever the deck order, the generator or the order of acquisitions', () => {
    const first = makeState({ ownership: { blog: { owner: A }, forum: { owner: B } } })
    const second = makeState({ ownership: { forum: { owner: B }, blog: { owner: A } } })
    second.decks.exploit = [...second.decks.exploit].reverse()
    second.rngState = 987654
    expect(JSON.stringify(playerView(second))).toBe(JSON.stringify(playerView(first)))
  })

  it('does not share objects with the state', () => {
    const state = makeState({ ownership: { blog: { owner: A } } })
    const view = playerView(state)
    view.players[0]!.cash = 0
    view.ownership.blog!.level = 3
    expect(state.players[0]?.cash).toBe(1500)
    expect(state.ownership.blog?.level).toBe(0)
  })
})
