import { describe, expect, it, vi } from 'vitest'
import { A, B, act, forceDice, makeState } from '../engine/testUtils'
import { recordInJournal, startJournal } from './history/journal'
import { recordStatistics, startStatistics } from './history/statistics'
import {
  createSaver,
  deleteSavedGame,
  loadSavedGame,
  SAVED_GAME_KEY,
  writeSavedGame,
  type SaveStorage,
  type StorageAccess,
} from './persistence'
import { SAVE_FORMAT_VERSION, type SavedGame } from './savedGame'

function memoryStorage(initial: Record<string, string> = {}): SaveStorage & { items: Map<string, string> } {
  const items = new Map(Object.entries(initial))
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  }
}

function accessTo(storage: SaveStorage): StorageAccess {
  return () => storage
}

function savedGame(): SavedGame {
  const start = forceDice(makeState({ ownership: { blog: { owner: B, level: 2, mortgaged: false } } }), [[2, 4]])
  const { state, events } = act(start, { type: 'rollDice', playerId: A })
  return {
    formatVersion: SAVE_FORMAT_VERSION,
    savedAt: '2026-11-03T14:05:00.000Z',
    status: 'inProgress',
    creation: {
      players: state.players.map((p) => ({ id: p.id, name: p.name, color: p.color, controller: p.controller })),
      settings: { ...state.settings },
    },
    engineState: state,
    journal: recordInJournal(startJournal(start), start, events).journal,
    statistics: recordStatistics(startStatistics(start), start, events, state),
  }
}

const OPTION_SETTINGS = ['dmzJackpot', 'doubleBootBonus', 'freeBuilding', 'noRentInQuarantine', 'turnLimit', 'netWorthTarget']

function withoutKeys(fields: object, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)))
}

function beforeOptions(game: SavedGame): Record<string, unknown> {
  const engineState = withoutKeys(game.engineState, ['dmzPot', 'winReason', 'firstPlayerIndex'])
  return {
    ...game,
    formatVersion: 2,
    creation: { ...game.creation, settings: withoutKeys(game.creation.settings, OPTION_SETTINGS) },
    engineState: { ...engineState, settings: withoutKeys(game.engineState.settings, OPTION_SETTINGS) },
  }
}

function stored(game: unknown): Record<string, string> {
  return { [SAVED_GAME_KEY]: JSON.stringify(game) }
}

function unreadable(game: unknown) {
  const storage = memoryStorage(stored(game))
  return { result: loadSavedGame(accessTo(storage)), storage }
}

describe('loadSavedGame', () => {
  it('finds nothing in an empty storage', () => {
    expect(loadSavedGame(accessTo(memoryStorage()))).toEqual({ kind: 'none' })
  })

  it('reads back exactly what was written', () => {
    const storage = memoryStorage()
    const game = savedGame()
    expect(writeSavedGame(game, accessTo(storage))).toBe(true)
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'found', game })
  })

  it('reads a game saved during an auction or a debt', () => {
    const storage = memoryStorage()
    const auction = savedGame()
    auction.engineState.phase = { kind: 'auction', squareId: 'tor-node', highBid: 120, highBidder: B, bidders: [A, B], nextBidder: A }
    writeSavedGame(auction, accessTo(storage))
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'found', game: auction })
    const debt = savedGame()
    debt.engineState.phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 400, reason: 'rent' }], resume: { kind: 'postRoll' } }
    writeSavedGame(debt, accessTo(storage))
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'found', game: debt })
  })

  it('reads a game saved while a trade offer waits for its answer', () => {
    const storage = memoryStorage()
    const game = savedGame()
    game.engineState.phase = {
      kind: 'tradeOffer',
      offer: { from: B, to: A, give: { squares: ['blog'], cash: 0, keys: [] }, receive: { squares: [], cash: 400, keys: [] } },
      resume: { kind: 'preRoll' },
    }
    game.engineState.tradeLimits = { thisTurn: { [B]: { count: 1, partners: [A], rejected: [] } }, refusedAsks: { [A]: { blog: { holder: B, count: 2 } } } }
    writeSavedGame(game, accessTo(storage))
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'found', game })
  })

  it('reads a save of the format before the trades with empty trade limits and no game option', () => {
    const game = savedGame()
    const old = beforeOptions(game)
    const storage = memoryStorage(stored({ ...old, formatVersion: 1, engineState: withoutKeys(old.engineState as object, ['tradeLimits']) }))
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'found', game })
  })

  it('reads a save of the format before the game options with every option off and an empty pot', () => {
    const game = savedGame()
    const result = loadSavedGame(accessTo(memoryStorage(stored(beforeOptions(game)))))
    expect(result).toEqual({ kind: 'found', game })
    if (result.kind !== 'found') return
    expect(result.game.engineState).toMatchObject({ dmzPot: 0, firstPlayerIndex: 0, winReason: null })
    expect(result.game.creation.settings).toEqual(game.engineState.settings)
  })

  it('goes on with a migrated game exactly as before', () => {
    const game = savedGame()
    const result = loadSavedGame(accessTo(memoryStorage(stored(beforeOptions(game)))))
    if (result.kind !== 'found') throw new Error('not found')
    const next = (state: SavedGame['engineState']) => act(forceDice(structuredClone(state), [[3, 4]]), { type: 'rollDice', playerId: B })
    const ended = { ...game.engineState, phase: { kind: 'postRoll', mayRollAgain: false } } as SavedGame['engineState']
    const migratedEnded = { ...result.game.engineState, phase: { kind: 'postRoll', mayRollAgain: false } } as SavedGame['engineState']
    const original = act(ended, { type: 'endTurn', playerId: A })
    const migrated = act(migratedEnded, { type: 'endTurn', playerId: A })
    expect(migrated).toEqual(original)
    expect(next(migrated.state)).toEqual(next(original.state))
  })

  it('gives the last solvent player as reason of a victory saved before the game options', () => {
    const game = savedGame()
    game.status = 'finished'
    game.engineState.phase = { kind: 'gameOver' }
    game.engineState.winner = B
    game.engineState.winReason = 'lastStanding'
    const result = loadSavedGame(accessTo(memoryStorage(stored(beforeOptions(game)))))
    expect(result).toEqual({ kind: 'found', game })
  })

  it('rejects incoherent game options', () => {
    const game = savedGame()
    const invalid = [
      { ...game, engineState: { ...game.engineState, settings: { ...game.engineState.settings, turnLimit: 25 } } },
      { ...game, engineState: { ...game.engineState, dmzPot: -10 } },
      { ...game, engineState: { ...game.engineState, winReason: 'turnLimit' } },
      { ...game, creation: { ...game.creation, settings: { ...game.creation.settings, netWorthTarget: 7500 } } },
    ]
    for (const save of invalid) expect(unreadable(save).result).toEqual({ kind: 'unreadable' })
  })

  it('rejects an incoherent trade offer or trade limits', () => {
    const offer = savedGame()
    const badOffer = {
      kind: 'tradeOffer',
      offer: { from: A, to: 'p9', give: { squares: [], cash: 10, keys: [] }, receive: { squares: [], cash: 0, keys: [] } },
      resume: { kind: 'preRoll' },
    }
    expect(unreadable({ ...offer, engineState: { ...offer.engineState, phase: badOffer } }).result).toEqual({ kind: 'unreadable' })
    const limits = savedGame()
    expect(unreadable({ ...limits, engineState: { ...limits.engineState, tradeLimits: { thisTurn: { [A]: { count: -1 } } } } }).result).toEqual({
      kind: 'unreadable',
    })
  })

  it('rejects and deletes a save that is not valid JSON', () => {
    const storage = memoryStorage({ [SAVED_GAME_KEY]: '{"formatVersion": 1, ' })
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'unreadable' })
    expect(storage.items.has(SAVED_GAME_KEY)).toBe(false)
  })

  it('rejects a save of an unknown format version', () => {
    const { result, storage } = unreadable({ ...savedGame(), formatVersion: SAVE_FORMAT_VERSION + 1 })
    expect(result).toEqual({ kind: 'unreadable' })
    expect(storage.items.has(SAVED_GAME_KEY)).toBe(false)
  })

  it('rejects a save with missing fields', () => {
    const withoutJournal: Partial<SavedGame> = savedGame()
    delete withoutJournal.journal
    expect(unreadable(withoutJournal).result).toEqual({ kind: 'unreadable' })
    const game = savedGame()
    const withoutCash: Partial<SavedGame['engineState']['players'][number]> = { ...game.engineState.players[0] }
    delete withoutCash.cash
    expect(unreadable({ ...game, engineState: { ...game.engineState, players: [withoutCash, game.engineState.players[1]] } }).result).toEqual({
      kind: 'unreadable',
    })
    expect(unreadable({ ...game, statistics: { ...game.statistics, rounds: undefined } }).result).toEqual({ kind: 'unreadable' })
  })

  it('rejects an owner on a square that cannot be bought', () => {
    const game = savedGame()
    game.engineState.ownership['patch-8'] = { owner: A, mortgaged: false, level: 0 }
    expect(unreadable(game).result).toEqual({ kind: 'unreadable' })
  })

  it('rejects an incoherent engine state', () => {
    const tooFew = savedGame()
    tooFew.engineState.players = tooFew.engineState.players.slice(0, 1)
    expect(unreadable(tooFew).result).toEqual({ kind: 'unreadable' })
    const strangerOwner = savedGame()
    strangerOwner.engineState.ownership.forum = { owner: 'p9', mortgaged: false, level: 0 }
    expect(unreadable(strangerOwner).result).toEqual({ kind: 'unreadable' })
    const unknownPhase = savedGame()
    expect(unreadable({ ...unknownPhase, engineState: { ...unknownPhase.engineState, phase: { kind: 'trading' } } }).result).toEqual({
      kind: 'unreadable',
    })
    const otherBoard = savedGame()
    expect(unreadable({ ...otherBoard, engineState: { ...otherBoard.engineState, boardId: 'classic' } }).result).toEqual({
      kind: 'unreadable',
    })
  })

  it('treats a storage that throws on access as unavailable', () => {
    const blocked: StorageAccess = () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    }
    expect(loadSavedGame(blocked)).toEqual({ kind: 'unavailable' })
    expect(writeSavedGame(savedGame(), blocked)).toBe(false)
    expect(() => deleteSavedGame(blocked)).not.toThrow()
  })
})

describe('writeSavedGame', () => {
  it('reports a failed write without throwing', () => {
    const full = memoryStorage()
    full.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    expect(writeSavedGame(savedGame(), accessTo(full))).toBe(false)
  })
})

describe('deleteSavedGame', () => {
  it('removes the save', () => {
    const storage = memoryStorage(stored(savedGame()))
    deleteSavedGame(accessTo(storage))
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'none' })
  })
})

describe('createSaver', () => {
  it('writes the record of the game with its creation settings, the date and its status', () => {
    const storage = memoryStorage()
    const game = savedGame()
    const save = createSaver(game.creation, accessTo(storage), () => new Date('2026-11-03T14:05:00.000Z'))
    expect(save({ engineState: game.engineState, journal: game.journal, statistics: game.statistics })).toBe(true)
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'found', game })
  })

  it('marks a won game as finished', () => {
    const storage = memoryStorage()
    const game = savedGame()
    const save = createSaver(game.creation, accessTo(storage))
    save({ ...game, engineState: { ...game.engineState, phase: { kind: 'gameOver' }, winner: B, winReason: 'lastStanding' } })
    const found = loadSavedGame(accessTo(storage))
    expect(found.kind === 'found' && found.game.status).toBe('finished')
  })

  it('reports a failed write', () => {
    const game = savedGame()
    const failing = vi.fn(() => {
      throw new Error('blocked')
    })
    expect(createSaver(game.creation, failing)(game)).toBe(false)
  })
})
