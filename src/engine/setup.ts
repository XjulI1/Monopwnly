import { EXPLOIT_CARDS, PATCH_CARDS } from './board/cards'
import { BANK_BACKDOORS, BANK_ROOTKITS, STARTING_CASH } from './board/squares'
import { randomInt, shuffle } from './rng'
import type {
  AiLevel,
  CreateGameResult,
  GameSettings,
  GameState,
  NetWorthTarget,
  PlayerController,
  PlayerSetup,
  RuleError,
  TurnLimit,
} from './types'

export type CreateGameInput = {
  players: PlayerSetup[]
  seed: number
  settings?: Partial<GameSettings>
}

export const DEFAULT_SETTINGS: GameSettings = {
  auctions: true,
  dmzJackpot: false,
  doubleBootBonus: false,
  freeBuilding: false,
  noRentInQuarantine: false,
  turnLimit: null,
  netWorthTarget: null,
}

/** Turn limits a game can be created with. */
export const TURN_LIMITS: readonly TurnLimit[] = [20, 30, 40, 60]

/** Net worth targets a game can be created with. */
export const NET_WORTH_TARGETS: readonly NetWorthTarget[] = [3000, 4000, 5000, 6000]

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

function settingsProblem(settings: GameSettings): RuleError | null {
  if (settings.turnLimit !== null && !TURN_LIMITS.includes(settings.turnLimit)) {
    return { code: 'INVALID_SETTINGS', message: `Limite de tours inconnue : ${settings.turnLimit}.` }
  }
  if (settings.netWorthTarget !== null && !NET_WORTH_TARGETS.includes(settings.netWorthTarget)) {
    return { code: 'INVALID_SETTINGS', message: `Objectif de patrimoine inconnu : ${settings.netWorthTarget}.` }
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

  const settings: GameSettings = { ...DEFAULT_SETTINGS, ...input.settings }
  const problem = settingsProblem(settings)
  if (problem) return { ok: false, error: problem }

  const rng = { rngState: seed | 0 }
  const exploit = shuffle(rng, EXPLOIT_CARDS.map((c) => c.id))
  const patch = shuffle(rng, PATCH_CARDS.map((c) => c.id))
  const currentPlayerIndex = randomInt(rng, players.length)

  const state: GameState = {
    settings,
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
    firstPlayerIndex: currentPlayerIndex,
    doublesInARow: 0,
    turnNumber: 1,
    lastRoll: null,
    phase: { kind: 'preRoll' },
    rngState: rng.rngState,
    winner: null,
    winReason: null,
    tradeLimits: { thisTurn: {}, refusedAsks: {} },
    dmzPot: 0,
  }
  return { ok: true, state }
}
