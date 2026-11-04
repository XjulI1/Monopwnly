import { cardIdByTitle } from './board/cards'
import { applyAction } from './index'
import { rollTwoDice } from './rng'
import { createGame } from './setup'
import type {
  Action,
  DeckKind,
  GameEvent,
  GameSettings,
  GameState,
  Ownership,
  Phase,
  Player,
  RuleErrorCode,
  SquareId,
} from './types'

export type StateOptions = {
  players?: number
  settings?: Partial<GameSettings>
  current?: number
  firstPlayer?: number
  overrides?: Partial<Player>[]
  ownership?: Record<SquareId, Partial<Ownership> & { owner: string }>
  phase?: Phase
  decks?: Partial<Record<DeckKind, string[]>>
  bankStock?: { backdoors: number; rootkits: number }
  doublesInARow?: number
}

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan']

export const A = 'p1'
export const B = 'p2'
export const C = 'p3'
export const D = 'p4'

/** Builds a game state tailored for a test: player 1 plays first unless told otherwise. */
export function makeState(options: StateOptions = {}): GameState {
  const count = options.players ?? 2
  const result = createGame({
    players: Array.from({ length: count }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}`, color: COLORS[i] as string })),
    seed: 1,
    settings: options.settings,
  })
  if (!result.ok) throw new Error(result.error.code)
  const state = result.state
  state.currentPlayerIndex = options.current ?? 0
  state.firstPlayerIndex = options.firstPlayer ?? 0
  options.overrides?.forEach((override, i) => {
    const player = state.players[i]
    if (player) Object.assign(player, override)
  })
  for (const [id, own] of Object.entries(options.ownership ?? {})) {
    state.ownership[id] = { mortgaged: false, level: 0, ...own }
  }
  if (options.phase) state.phase = options.phase
  if (options.decks?.exploit) state.decks.exploit = options.decks.exploit
  if (options.decks?.patch) state.decks.patch = options.decks.patch
  if (options.bankStock) state.bankStock = options.bankStock
  if (options.doublesInARow !== undefined) state.doublesInARow = options.doublesInARow
  return state
}

/** Sets the generator state so that the next dice rolls give the requested values. */
export function forceDice(state: GameState, rolls: [number, number][]): GameState {
  for (let seed = 1; seed < 50_000_000; seed++) {
    const holder = { rngState: seed }
    if (rolls.every(([a, b]) => {
      const [x, y] = rollTwoDice(holder)
      return x === a && y === b
    })) {
      state.rngState = seed
      return state
    }
  }
  throw new Error('No seed found for the requested dice')
}

/** Applies an action that must succeed. */
export function act(state: GameState, action: Action): { state: GameState; events: GameEvent[] } {
  const result = applyAction(state, action)
  if (!result.ok) throw new Error(`${action.type} rejected: ${result.error.code} ${result.error.message}`)
  return { state: result.state, events: result.events }
}

/** Applies a sequence of actions that must all succeed and returns the final state and all events. */
export function actAll(state: GameState, actions: Action[]): { state: GameState; events: GameEvent[] } {
  let current = state
  const events: GameEvent[] = []
  for (const action of actions) {
    const result = act(current, action)
    current = result.state
    events.push(...result.events)
  }
  return { state: current, events }
}

/** Applies an action that must be rejected and returns the error code. */
export function rejectCode(state: GameState, action: Action): RuleErrorCode {
  const result = applyAction(state, action)
  if (result.ok) throw new Error(`${action.type} unexpectedly accepted`)
  return result.error.code
}

/** Rolls the given dice for the player expected to roll. */
export function roll(state: GameState, dice: [number, number], playerId?: string) {
  const id = playerId ?? (state.players[state.currentPlayerIndex]?.id as string)
  return act(forceDice(structuredClone(state), [dice]), { type: 'rollDice', playerId: id })
}

/** Puts the card with the given title on top of its deck. */
export function withCardOnTop(state: GameState, deck: DeckKind, title: string): GameState {
  const id = cardIdByTitle(deck, title)
  state.decks[deck] = [id, ...state.decks[deck].filter((c) => c !== id)]
  return state
}

/** Returns the player with the given identifier. */
export function player(state: GameState, id: string): Player {
  const found = state.players.find((p) => p.id === id)
  if (!found) throw new Error(`Unknown player ${id}`)
  return found
}
