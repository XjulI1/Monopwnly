import { EXPLOIT_CARDS, PATCH_CARDS } from './board/cards'
import { BANK_BACKDOORS, BANK_ROOTKITS, STARTING_CASH } from './board/squares'
import { randomInt, shuffle } from './rng'
import type { AiLevel, CreateGameResult, GameSettings, GameState, PlayerController, PlayerSetup } from './types'

export type CreateGameInput = {
  players: PlayerSetup[]
  seed: number
  settings?: Partial<GameSettings>
}

export const DEFAULT_SETTINGS: GameSettings = { auctions: true }

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 6

/** AI levels, from the weakest to the strongest. */
export const AI_LEVELS: readonly AiLevel[] = ['easy', 'normal', 'hard']

function controllerOf(setup: PlayerSetup): PlayerController {
  return setup.controller?.kind === 'ai' ? { kind: 'ai', level: setup.controller.level } : { kind: 'human' }
}

function unknownLevel(players: PlayerSetup[]): string | null {
  for (const { controller } of players) {
    if (controller?.kind === 'ai' && !AI_LEVELS.includes(controller.level)) return String(controller.level)
  }
  return null
}

/** Creates a new game ready to play, or explains why the request is invalid. */
export function createGame(input: CreateGameInput): CreateGameResult {
  const { players, seed } = input
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    return {
      ok: false,
      error: { code: 'INVALID_PLAYER_COUNT', message: 'Une partie se joue de 2 à 6 joueurs.' },
    }
  }
  const ids = new Set(players.map((p) => p.id))
  const colors = new Set(players.map((p) => p.color))
  if (ids.size !== players.length || colors.size !== players.length) {
    return {
      ok: false,
      error: { code: 'DUPLICATE_PLAYER', message: 'Chaque joueur doit avoir un identifiant et une couleur distincts.' },
    }
  }

  const level = unknownLevel(players)
  if (level !== null) {
    return { ok: false, error: { code: 'INVALID_AI_LEVEL', message: `Niveau d’IA inconnu : ${level}.` } }
  }

  const rng = { rngState: seed | 0 }
  const exploit = shuffle(rng, EXPLOIT_CARDS.map((c) => c.id))
  const patch = shuffle(rng, PATCH_CARDS.map((c) => c.id))
  const currentPlayerIndex = randomInt(rng, players.length)

  const state: GameState = {
    settings: { ...DEFAULT_SETTINGS, ...input.settings },
    boardId: 'monopwnly',
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      controller: controllerOf(p),
      cash: STARTING_CASH,
      position: 0,
      quarantine: null,
      keys: [],
      bankrupt: false,
    })),
    ownership: {},
    bankStock: { backdoors: BANK_BACKDOORS, rootkits: BANK_ROOTKITS },
    decks: { exploit, patch },
    currentPlayerIndex,
    doublesInARow: 0,
    turnNumber: 1,
    lastRoll: null,
    phase: { kind: 'preRoll' },
    rngState: rng.rngState,
    winner: null,
    tradeLimits: { thisTurn: {}, refusedAsks: {} },
  }
  return { ok: true, state }
}
