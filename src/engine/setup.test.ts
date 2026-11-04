import { describe, expect, it } from 'vitest'
import { CARDS } from './board/cards'
import { createGame } from './setup'
import type { GameSettings, GameState, PlayerSetup } from './types'

function players(n: number): PlayerSetup[] {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan', 'orange']
  return Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, color: colors[i] as string }))
}

function create(n: number, seed = 1, settings?: Partial<GameSettings>): GameState {
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

  it('makes every player human unless told otherwise', () => {
    expect(create(3).players.map((p) => p.controller)).toEqual([{ kind: 'human' }, { kind: 'human' }, { kind: 'human' }])
  })

  it('accepts AI players of every level', () => {
    const levels = ['easy', 'normal', 'hard'] as const
    const list = players(4).map((p, i) => ({ ...p, controller: i === 0 ? ({ kind: 'human' } as const) : { kind: 'ai' as const, level: levels[i - 1] ?? 'normal' } }))
    const result = createGame({ players: list, seed: 1 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.players.map((p) => p.controller)).toEqual([
        { kind: 'human' },
        { kind: 'ai', level: 'easy' },
        { kind: 'ai', level: 'normal' },
        { kind: 'ai', level: 'hard' },
      ])
    }
  })

  it('rejects an unknown AI level', () => {
    const list = players(2).map((p, i) => (i === 1 ? { ...p, controller: { kind: 'ai', level: 'expert' } } : p)) as PlayerSetup[]
    const result = createGame({ players: list, seed: 1 })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_AI_LEVEL')
      expect(result.error.message).toBe('Niveau d’IA inconnu : expert.')
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
    expect(create(2).settings).toEqual({
      auctions: true,
      dmzJackpot: false,
      doubleBootBonus: false,
      freeBuilding: false,
      noRentInQuarantine: false,
      turnLimit: null,
      netWorthTarget: null,
    })
    expect(create(2, 1, { auctions: false }).settings.auctions).toBe(false)
  })

  it('accepts every game option at once', () => {
    const all: Partial<GameSettings> = {
      dmzJackpot: true,
      doubleBootBonus: true,
      freeBuilding: true,
      noRentInQuarantine: true,
      turnLimit: 30,
      netWorthTarget: 5000,
    }
    expect(create(2, 1, all).settings).toEqual({ auctions: true, ...all })
  })

  it('accepts every proposed turn limit and net worth target', () => {
    for (const turnLimit of [20, 30, 40, 60] as const) expect(create(2, 1, { turnLimit }).settings.turnLimit).toBe(turnLimit)
    for (const netWorthTarget of [3000, 4000, 5000, 6000] as const) {
      expect(create(2, 1, { netWorthTarget }).settings.netWorthTarget).toBe(netWorthTarget)
    }
  })

  it('rejects a turn limit or a net worth target outside the proposed values', () => {
    const invalid = [{ turnLimit: 25 }, { netWorthTarget: 7500 }, { turnLimit: 0 }] as unknown as Partial<GameSettings>[]
    for (const settings of invalid) {
      const result = createGame({ players: players(2), seed: 1, settings })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error.code).toBe('INVALID_SETTINGS')
    }
  })

  it('starts with an empty DMZ pot and no reason of victory', () => {
    const state = create(3, 1, { dmzJackpot: true })
    expect(state.dmzPot).toBe(0)
    expect(state.winReason).toBeNull()
  })

  it('creates a state that survives a JSON round trip', () => {
    const state = create(4, 5, { dmzJackpot: true, turnLimit: 20, netWorthTarget: 4000 })
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
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
