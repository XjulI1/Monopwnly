import { describe, expect, it } from 'vitest'
import { CARDS } from './board/cards'
import { createGame } from './setup'
import type { GameState, PlayerSetup } from './types'

function players(n: number): PlayerSetup[] {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan', 'orange']
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, color: colors[i] as string }))
}

function create(n: number, seed = 1, settings?: { auctions?: boolean }): GameState {
  const result = createGame({ players: players(n), seed, settings })
  if (!result.ok) throw new Error(result.error.code)
  return result.state
}

describe('createGame', () => {
  it('creates a 4-player game in the given order', () => {
    const state = create(4)
    expect(state.players.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(state.players.every((p) => !p.bankrupt)).toBe(true)
  })

  it('rejects 1 and 7 players', () => {
    for (const n of [1, 7]) {
      const result = createGame({ players: players(n), seed: 1 })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('INVALID_PLAYER_COUNT')
    }
  })

  it('rejects duplicate identifiers or colors', () => {
    const sameId = [...players(2), { id: 'p1', name: 'X', color: 'pink' }]
    const sameColor = [...players(2), { id: 'p9', name: 'X', color: 'red' }]
    for (const list of [sameId, sameColor]) {
      const result = createGame({ players: list, seed: 1 })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('DUPLICATE_PLAYER')
    }
  })

  it('applies default settings and partial settings', () => {
    expect(create(2).settings).toEqual({ auctions: true })
    expect(create(2, 1, { auctions: false }).settings.auctions).toBe(false)
  })

  it('starts every player on Boot with 1 500 and no key', () => {
    const state = create(3)
    for (const p of state.players) {
      expect(p).toMatchObject({ position: 0, cash: 1500, keys: [], quarantine: null, bankrupt: false })
    }
    expect(state.ownership).toEqual({})
    expect(state.bankStock).toEqual({ backdoors: 32, rootkits: 12 })
  })

  it('shuffles complete decks deterministically', () => {
    const a = create(4, 123)
    const b = create(4, 123)
    for (const deck of ['exploit', 'patch'] as const) {
      expect(a.decks[deck]).toHaveLength(16)
      expect(new Set(a.decks[deck]).size).toBe(16)
      expect([...a.decks[deck]].sort()).toEqual(CARDS.filter((c) => c.deck === deck).map((c) => c.id))
      expect(a.decks[deck]).toEqual(b.decks[deck])
    }
  })

  it('draws the first player deterministically and starts in preRoll on turn 1', () => {
    const a = create(4, 2024)
    const b = create(4, 2024)
    expect(a.currentPlayerIndex).toBe(b.currentPlayerIndex)
    const firsts = new Set(Array.from({ length: 30 }, (_, seed) => create(4, seed).currentPlayerIndex))
    expect(firsts.size).toBeGreaterThan(1)
    expect(a.phase).toEqual({ kind: 'preRoll' })
    expect(a.turnNumber).toBe(1)
    expect(a.doublesInARow).toBe(0)
    expect(a.winner).toBeNull()
  })
})
