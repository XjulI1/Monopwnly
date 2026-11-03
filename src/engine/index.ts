import { buyProperty, declineProperty, passBid, placeBid } from './acquisition'
import { RuleViolation, type Ctx } from './context'
import { buildBackdoor, mortgage, sellBackdoor, unmortgage } from './development'
import { rollDice } from './movement'
import { declareBankruptcy, payDebt } from './payments'
import { payQuarantineFine, useDecryptionKey } from './quarantine'
import { expectedActor, flowCandidates, squareActions } from './queries'
import { endTurn } from './turn'
import type { Action, ActionResult, ActionType, GameState, PhaseKind } from './types'

const ALLOWED_PHASES: Record<ActionType, readonly PhaseKind[]> = {
  rollDice: ['preRoll', 'postRoll'],
  payQuarantineFine: ['preRoll'],
  useDecryptionKey: ['preRoll'],
  buyProperty: ['buyDecision'],
  declineProperty: ['buyDecision'],
  placeBid: ['auction'],
  passBid: ['auction'],
  buildBackdoor: ['preRoll', 'postRoll'],
  sellBackdoor: ['preRoll', 'postRoll', 'debt'],
  mortgage: ['preRoll', 'postRoll', 'debt'],
  unmortgage: ['preRoll', 'postRoll'],
  payDebt: ['debt'],
  declareBankruptcy: ['debt'],
  endTurn: ['postRoll'],
}

function dispatch(ctx: Ctx, action: Action): void {
  switch (action.type) {
    case 'rollDice':
      return rollDice(ctx)
    case 'payQuarantineFine':
      return payQuarantineFine(ctx)
    case 'useDecryptionKey':
      return useDecryptionKey(ctx)
    case 'buyProperty':
      return buyProperty(ctx)
    case 'declineProperty':
      return declineProperty(ctx)
    case 'placeBid':
      return placeBid(ctx, action.playerId, action.amount)
    case 'passBid':
      return passBid(ctx, action.playerId)
    case 'buildBackdoor':
      return buildBackdoor(ctx, action.playerId, action.squareId)
    case 'sellBackdoor':
      return sellBackdoor(ctx, action.playerId, action.squareId)
    case 'mortgage':
      return mortgage(ctx, action.playerId, action.squareId)
    case 'unmortgage':
      return unmortgage(ctx, action.playerId, action.squareId)
    case 'payDebt':
      return payDebt(ctx)
    case 'declareBankruptcy':
      return declareBankruptcy(ctx)
    case 'endTurn':
      return endTurn(ctx)
  }
}

/** Validates an action against the state and returns the new state with its events, or a rule error. The input state is never modified. */
export function applyAction(state: GameState, action: Action): ActionResult {
  if (state.phase.kind === 'gameOver') {
    return { ok: false, error: { code: 'GAME_OVER', message: 'La partie est terminée.' } }
  }
  if (!ALLOWED_PHASES[action.type].includes(state.phase.kind)) {
    return { ok: false, error: { code: 'WRONG_PHASE', message: 'Cette action n’est pas possible maintenant.' } }
  }
  if (action.playerId !== expectedActor(state)) {
    return { ok: false, error: { code: 'NOT_YOUR_TURN', message: 'Ce n’est pas à vous de jouer.' } }
  }
  const ctx: Ctx = { state: structuredClone(state), events: [] }
  try {
    dispatch(ctx, action)
  } catch (thrown) {
    if (thrown instanceof RuleViolation) return { ok: false, error: { code: thrown.code, message: thrown.message } }
    throw thrown
  }
  return { ok: true, state: ctx.state, events: ctx.events }
}

/** Actions the expected player can take right now (a bid is listed at its minimum amount). */
export function legalActions(state: GameState): Action[] {
  return [...flowCandidates(state).filter((action) => applyAction(state, action).ok), ...squareActions(state)]
}

export { cardById, cardIdByTitle, CARDS, EXPLOIT_CARDS, PATCH_CARDS } from './board/cards'
export {
  BOARD,
  BOARD_SIZE,
  FAMILY_NAMES,
  FAMILY_SQUARES,
  MAX_QUARANTINE_ATTEMPTS,
  MIN_BID,
  NODE_RENTS,
  purchasableById,
  QUARANTINE_FINE,
  QUARANTINE_INDEX,
  SALARY,
  SERVICE_MULTIPLIERS,
  squareAt,
  squareById,
  STARTING_CASH,
} from './board/squares'
export { unmortgageCost } from './development'
export { liquidationValue } from './payments'
export {
  buildableSquares,
  expectedActor,
  mortgageableSquares,
  netWorth,
  ownedSquares,
  rentIfLanded,
  sellableSquares,
  unmortgageableSquares,
} from './queries'
export { ownsWholeFamily } from './rent'
export { randomInt } from './rng'
export type { RngHolder } from './rng'
export { AI_LEVELS, createGame, DEFAULT_SETTINGS, MAX_PLAYERS, MIN_PLAYERS } from './setup'
export type { CreateGameInput } from './setup'
export type * from './types'
