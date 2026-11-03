import { isSavedGame, SAVE_FORMAT_VERSION, type GameRecord, type SavedGame } from './savedGame'
import type { GameConfig } from './setupForm'

/** Key of the saved game in the storage of the browser. */
export const SAVED_GAME_KEY = 'monopwnly.savedGame'

/** The part of the Web Storage API the saved game needs. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Gives the storage of the saved game; throws when the browser blocks it. */
export type StorageAccess = () => SaveStorage

/** Outcome of reading the saved game. */
export type SavedGameLookup =
  | { kind: 'none' }
  | { kind: 'found'; game: SavedGame }
  | { kind: 'unreadable' }
  | { kind: 'unavailable' }

/** The local storage of the browser. */
export const browserStorage: StorageAccess = () => {
  const storage = globalThis.localStorage
  if (!storage) throw new Error('No local storage')
  return storage
}

function parse(raw: string): SavedGame | null {
  try {
    const value: unknown = JSON.parse(raw)
    return isSavedGame(value) ? value : null
  } catch {
    return null
  }
}

/** Deletes the saved game; returns false when the storage is unavailable. */
export function deleteSavedGame(access: StorageAccess = browserStorage): boolean {
  try {
    access().removeItem(SAVED_GAME_KEY)
    return true
  } catch {
    return false
  }
}

/** Reads the saved game; an unreadable, incomplete, incoherent or incompatible save is deleted. */
export function loadSavedGame(access: StorageAccess = browserStorage): SavedGameLookup {
  let raw: string | null
  try {
    raw = access().getItem(SAVED_GAME_KEY)
  } catch {
    return { kind: 'unavailable' }
  }
  if (raw === null) return { kind: 'none' }
  const game = parse(raw)
  if (game) return { kind: 'found', game }
  deleteSavedGame(access)
  return { kind: 'unreadable' }
}

/** Replaces the saved game; returns false when the storage is full or unavailable. */
export function writeSavedGame(game: SavedGame, access: StorageAccess = browserStorage): boolean {
  try {
    access().setItem(SAVED_GAME_KEY, JSON.stringify(game))
    return true
  } catch {
    return false
  }
}

/** Saves the records of a game created with the given settings; each call returns false when the write failed. */
export function createSaver(
  creation: GameConfig,
  access: StorageAccess = browserStorage,
  now: () => Date = () => new Date(),
): (record: GameRecord) => boolean {
  return (record) =>
    writeSavedGame(
      {
        formatVersion: SAVE_FORMAT_VERSION,
        savedAt: now().toISOString(),
        status: record.engineState.phase.kind === 'gameOver' ? 'finished' : 'inProgress',
        creation,
        engineState: record.engineState,
        journal: record.journal,
        statistics: record.statistics,
      },
      access,
    )
}
