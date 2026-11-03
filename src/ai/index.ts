import { applyAction, expectedActor, type Action, type AiLevel, type GameEvent, type GameState, type PlayerId } from '../engine'
import { MANAGEMENT_LIMIT } from './constants'
import { easy } from './levels/easy'
import { hard } from './levels/hard'
import { normal } from './levels/normal'
import { contextOf, type Strategy } from './levels/strategy'
import { playerView, type PlayerView } from './playerView'

const STRATEGIES: Record<AiLevel, Strategy> = { easy, normal, hard }

const MANAGEMENT_ACTIONS: ReadonlySet<Action['type']> = new Set(['buildBackdoor', 'sellBackdoor', 'mortgage', 'unmortgage'])

/** Whether the action manages properties (build, sell, mortgage, reactivate) rather than moving the game on. */
export function isManagement(action: Action): boolean {
  return MANAGEMENT_ACTIONS.has(action.type)
}

/** Chooses the action of an AI from the public view of the game; `managementLeft` is how many management actions it may still take in this phase. */
export function chooseAction(view: PlayerView, playerId: PlayerId, level: AiLevel, managementLeft = MANAGEMENT_LIMIT): Action {
  if (expectedActor(view) !== playerId) throw new Error(`${playerId} is not the player expected to act`)
  const me = view.players.find((p) => p.id === playerId)
  if (!me) throw new Error(`Unknown player ${playerId}`)
  const ctx = contextOf(view, me, level, managementLeft > 0)
  const strategy = STRATEGIES[level]
  switch (view.phase.kind) {
    case 'preRoll':
      return strategy.preRoll(ctx)
    case 'buyDecision':
      return strategy.buyDecision(ctx)
    case 'auction':
      return strategy.auction(ctx)
    case 'debt':
      return strategy.debt(ctx)
    case 'postRoll':
      return strategy.postRoll(ctx)
    case 'gameOver':
      throw new Error('The game is over')
  }
}

/** Why an automatic run stopped. */
export type StopReason = 'human' | 'gameOver' | 'roundLimit'

/** Options of an automatic run. */
export type AutoplayOptions = {
  maxRounds?: number
  onAction?: (action: Action, events: GameEvent[], state: GameState) => void
}

/** Lets the AIs play, one action at a time through `applyAction`, until a human must act, the game ends or the round limit is passed. */
export function playUntilHumanOrEnd(start: GameState, options: AutoplayOptions = {}): { state: GameState; stop: StopReason } {
  let state = start
  let management = 0
  for (;;) {
    if (state.phase.kind === 'gameOver') return { state, stop: 'gameOver' }
    if (options.maxRounds !== undefined && state.turnNumber > options.maxRounds) return { state, stop: 'roundLimit' }
    const actor = expectedActor(state)
    const controller = state.players.find((p) => p.id === actor)?.controller
    if (!actor || controller?.kind !== 'ai') return { state, stop: 'human' }
    const action = chooseAction(playerView(state), actor, controller.level, MANAGEMENT_LIMIT - management)
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(`AI action rejected: ${action.type} (${result.error.code}) ${result.error.message}`)
    management = isManagement(action) ? management + 1 : 0
    options.onAction?.(action, result.events, result.state)
    state = result.state
  }
}

export { playerView } from './playerView'
export type { PlayerView } from './playerView'
