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
import type { SavedGame } from './savedGame'

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
    formatVersion: 1,
    savedAt: '2026-11-03T14:05:00.000Z',
    status: 'inProgress',
    creation: {
      players: state.players.map((p) => ({ id: p.id, name: p.name, color: p.color, controller: p.controller })),
      settings: { auctions: true },
    },
    engineState: state,
    journal: recordInJournal(startJournal(start), start, events).journal,
    statistics: recordStatistics(startStatistics(start), start, events, state),
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

  it('rejects and deletes a save that is not valid JSON', () => {
    const storage = memoryStorage({ [SAVED_GAME_KEY]: '{"formatVersion": 1, ' })
    expect(loadSavedGame(accessTo(storage))).toEqual({ kind: 'unreadable' })
    expect(storage.items.has(SAVED_GAME_KEY)).toBe(false)
  })

  it('rejects a save of an unknown format version', () => {
    const { result, storage } = unreadable({ ...savedGame(), formatVersion: 2 })
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
    save({ ...game, engineState: { ...game.engineState, phase: { kind: 'gameOver' }, winner: B } })
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
