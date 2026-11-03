import { applyAction, type Action, type AiLevel, type GameState, type PlayerId } from '../../engine'
import { chooseAction } from '../index'
import { playerView } from '../playerView'

/** The action the AI of the given level takes for the expected player. */
export function decide(state: GameState, playerId: PlayerId, level: AiLevel): Action {
  return chooseAction(playerView(state), playerId, level)
}

/** Lets the AI play while its decisions match the predicate; returns the actions taken and the final state. */
export function playWhile(
  start: GameState,
  playerId: PlayerId,
  level: AiLevel,
  keepGoing: (action: Action) => boolean,
  limit = 60,
): { actions: Action[]; state: GameState; next: Action } {
  let state = start
  const actions: Action[] = []
  for (let i = 0; i < limit; i++) {
    const action = decide(state, playerId, level)
    if (!keepGoing(action)) return { actions, state, next: action }
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(`${action.type} rejected: ${result.error.code}`)
    actions.push(action)
    state = result.state
  }
  throw new Error('The AI kept going past the limit')
}
