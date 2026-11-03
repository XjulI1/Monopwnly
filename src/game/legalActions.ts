import {
  applyAction,
  BOARD,
  expectedActor,
  legalActions,
  liquidationValue,
  MIN_BID,
  purchasableById,
  unmortgageCost,
  type Action,
  type GameState,
  type Payment,
  type PlayerId,
  type SquareId,
} from '../engine'

/** Whether the engine accepts an action, and its reason when it does not. */
export type ActionCheck = { allowed: boolean; reason: string | null }

/** Engine actions that manage a square. */
export type ManagementType = 'buildBackdoor' | 'sellBackdoor' | 'mortgage' | 'unmortgage'

/** A management action offered on a square, with the amount paid or received. */
export type ManagementOption = ActionCheck & {
  type: ManagementType
  action: Action
  amount: number
  rootkit: boolean
}

/** What a debtor owes and can still do. */
export type DebtSummary = {
  debtor: PlayerId
  payment: Payment
  remaining: Payment[]
  cash: number
  raisable: number
  covered: boolean
  unavoidable: boolean
}

const MANAGEMENT_TYPES: readonly string[] = ['buildBackdoor', 'sellBackdoor', 'mortgage', 'unmortgage']

/** Tries the action on the engine without keeping the result. */
export function checkAction(state: GameState, action: Action): ActionCheck {
  const result = applyAction(state, action)
  return result.ok ? { allowed: true, reason: null } : { allowed: false, reason: result.error.message }
}

function offeredTypes(state: GameState, isSystem: boolean, mortgaged: boolean): ManagementType[] {
  const phase = state.phase.kind
  if (phase === 'debt') return isSystem ? ['sellBackdoor', 'mortgage'] : ['mortgage']
  if (phase !== 'preRoll' && phase !== 'postRoll') return []
  const finance: ManagementType = mortgaged ? 'unmortgage' : 'mortgage'
  return isSystem ? ['buildBackdoor', 'sellBackdoor', finance] : [finance]
}

/** Management actions offered to the player on one of their squares in the current phase, legal or not. */
export function managementOptions(state: GameState, playerId: PlayerId, squareId: SquareId): ManagementOption[] {
  const square = purchasableById(squareId)
  const own = state.ownership[squareId]
  if (!square || !own || own.owner !== playerId) return []
  const isSystem = square.kind === 'system'
  const backdoorCost = isSystem ? square.backdoorCost : 0
  const amounts: Record<ManagementType, number> = {
    buildBackdoor: backdoorCost,
    sellBackdoor: backdoorCost / 2,
    mortgage: square.mortgageValue,
    unmortgage: unmortgageCost(squareId),
  }
  return offeredTypes(state, isSystem, own.mortgaged).map((type) => {
    const action: Action = { type, playerId, squareId }
    return {
      type,
      action,
      amount: amounts[type],
      rootkit: (type === 'buildBackdoor' && own.level === 4) || (type === 'sellBackdoor' && own.level === 5),
      ...checkAction(state, action),
    }
  })
}

/** Squares of the player on which at least one management action is legal right now, in board order. */
export function manageableSquares(state: GameState, playerId: PlayerId): SquareId[] {
  if (expectedActor(state) !== playerId) return []
  const ids = new Set(
    legalActions(state).flatMap((action) =>
      MANAGEMENT_TYPES.includes(action.type) && 'squareId' in action ? [action.squareId] : [],
    ),
  )
  return BOARD.filter((square) => ids.has(square.id)).map((square) => square.id)
}

/** Smallest bid the engine accepts and largest one the expected bidder can afford, during an auction. */
export function bidLimits(state: GameState): { min: number; max: number } | null {
  const phase = state.phase
  if (phase.kind !== 'auction') return null
  const bidder = state.players.find((p) => p.id === phase.nextBidder)
  return { min: phase.highBidder === null ? MIN_BID : phase.highBid + 1, max: bidder?.cash ?? 0 }
}

/** Current payment of the debtor, the payments after it, and whether it can be paid now or at all. */
export function debtSummary(state: GameState): DebtSummary | null {
  const phase = state.phase
  if (phase.kind !== 'debt') return null
  const [payment, ...remaining] = phase.payments
  const debtor = state.players.find((p) => p.id === phase.debtor)
  if (!payment || !debtor) return null
  const total = liquidationValue(state, debtor.id)
  return {
    debtor: debtor.id,
    payment,
    remaining,
    cash: debtor.cash,
    raisable: total - debtor.cash,
    covered: checkAction(state, { type: 'payDebt', playerId: debtor.id }).allowed,
    unavoidable: total < payment.amount,
  }
}
