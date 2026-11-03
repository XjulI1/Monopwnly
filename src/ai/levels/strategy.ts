import {
  BOARD,
  buildableSquares,
  FAMILY_SQUARES,
  liquidationValue,
  MIN_BID,
  mortgageableSquares,
  ownsWholeFamily,
  purchasableById,
  QUARANTINE_FINE,
  QUARANTINE_INDEX,
  rentIfLanded,
  sellableSquares,
  squareById,
  unmortgageableSquares,
  unmortgageCost,
  type Action,
  type AiLevel,
  type FamilyId,
  type Player,
  type SquareId,
  type TradeOffer,
} from '../../engine'
import { BID_STEP, EARLY_GAME_FREE_SQUARES, REACTIVATION_MARGIN } from '../constants'
import { diceTotalOdds } from '../landingOdds'
import type { PlayerView } from '../playerView'
import { evaluateOffer } from '../trade/evaluateOffer'
import { expectedRent, reserve } from '../valuation'

/** Everything a level needs to take one decision. */
export type DecisionContext = {
  view: PlayerView
  me: Player
  level: AiLevel
  reserve: number
  managementAllowed: boolean
}

/** How a level plays each phase in which it may have to act. */
export type Strategy = {
  preRoll: (ctx: DecisionContext) => Action
  buyDecision: (ctx: DecisionContext) => Action
  auction: (ctx: DecisionContext) => Action
  debt: (ctx: DecisionContext) => Action
  postRoll: (ctx: DecisionContext) => Action
  tradeOffer: (ctx: DecisionContext) => Action
}

/** Orders candidate squares, the first one being sacrificed or chosen first. */
export type SquareOrder = (ctx: DecisionContext, squareIds: SquareId[]) => SquareId[]

/** Builds the context of a decision. */
export function contextOf(view: PlayerView, me: Player, level: AiLevel, managementAllowed: boolean): DecisionContext {
  return { view, me, level, reserve: reserve(view, me.id, level), managementAllowed }
}

/** Squares in board order. */
export const inBoardOrder: SquareOrder = (_ctx, squareIds) =>
  [...squareIds].sort((a, b) => squareById(a).index - squareById(b).index)

/** Squares from the lowest to the highest expected rent, board order breaking ties. */
export const byExpectedRent: SquareOrder = (ctx, squareIds) =>
  inBoardOrder(ctx, squareIds).sort((a, b) => expectedRent(ctx.view, a, ctx.me.id) - expectedRent(ctx.view, b, ctx.me.id))

/** Price of a purchasable square. */
export function priceOf(squareId: SquareId): number {
  return purchasableById(squareId)?.price ?? 0
}

/** Cost of the next building level on a system. */
export function backdoorCostOf(squareId: SquareId): number {
  const square = purchasableById(squareId)
  return square?.kind === 'system' ? square.backdoorCost : 0
}

/** Family of a system. */
export function familyOf(squareId: SquareId): FamilyId | null {
  const square = purchasableById(squareId)
  return square?.kind === 'system' ? square.family : null
}

/** Building levels of a family, in board order. */
export function familyLevels(view: PlayerView, family: FamilyId): number[] {
  return FAMILY_SQUARES[family].map((id) => view.ownership[id]?.level ?? 0)
}

/** Purchasable squares nobody owns. */
export function freePurchasableCount(view: PlayerView): number {
  return BOARD.filter((square) => purchasableById(square.id) && !view.ownership[square.id]).length
}

/** Whether the square is a system of a family the player owns entirely. */
export function inCompleteFamily(ctx: DecisionContext, squareId: SquareId): boolean {
  return ownsWholeFamily(ctx.view, ctx.me.id, squareId)
}

/** Backdoor or rootkit candidates of the player, already legal. */
export function buildCandidates(ctx: DecisionContext): SquareId[] {
  return buildableSquares(ctx.view, ctx.me.id)
}

/** Mortgaged squares of complete families the player can reactivate while keeping its reserve. */
export function familyReactivations(ctx: DecisionContext): SquareId[] {
  return unmortgageableSquares(ctx.view, ctx.me.id).filter(
    (id) => inCompleteFamily(ctx, id) && ctx.me.cash - unmortgageCost(id) >= ctx.reserve,
  )
}

/** Other mortgaged squares the player can reactivate while keeping a comfortable margin above its reserve. */
export function comfortableReactivations(ctx: DecisionContext): SquareId[] {
  return unmortgageableSquares(ctx.view, ctx.me.id).filter(
    (id) => ctx.me.cash - unmortgageCost(id) >= ctx.reserve + REACTIVATION_MARGIN,
  )
}

/** Gain in expected rent of the next building level on the square, per PwnCoin invested. */
export function buildGainPerCoin(ctx: DecisionContext, squareId: SquareId): number {
  const level = ctx.view.ownership[squareId]?.level ?? 0
  const gain = expectedRent(ctx.view, squareId, ctx.me.id, level + 1) - expectedRent(ctx.view, squareId, ctx.me.id, level)
  return gain / Math.max(1, backdoorCostOf(squareId))
}

/** Squares sorted from the best to the worst build, board order breaking ties. */
export function bestBuildsFirst(ctx: DecisionContext, squareIds: SquareId[]): SquareId[] {
  return inBoardOrder(ctx, squareIds).sort((a, b) => buildGainPerCoin(ctx, b) - buildGainPerCoin(ctx, a))
}

/** The build the player can afford above the given reserve, among candidates in order of preference. */
export function affordableBuild(ctx: DecisionContext, ordered: SquareId[], keep = ctx.reserve): Action | null {
  const squareId = ordered.find((id) => ctx.me.cash - backdoorCostOf(id) >= keep)
  return squareId ? { type: 'buildBackdoor', playerId: ctx.me.id, squareId } : null
}

/** Reactivation action of the first square of the list. */
export function reactivation(ctx: DecisionContext, squareIds: SquareId[]): Action | null {
  const [squareId] = squareIds
  return squareId ? { type: 'unmortgage', playerId: ctx.me.id, squareId } : null
}

/** The proposal of a trade, or null when there is no offer to make. */
export function proposal(ctx: DecisionContext, offer: TradeOffer | null): Action | null {
  return offer ? { type: 'proposeTrade', playerId: ctx.me.id, offer } : null
}

/** Accepts the trade offered to the player when its evaluation at the level of the player says so, refuses it otherwise. */
export function answerOffer(ctx: DecisionContext): Action {
  const phase = ctx.view.phase
  const accept = phase.kind === 'tradeOffer' && evaluateOffer(ctx.view, phase.offer, ctx.level).accept
  return { type: accept ? 'acceptTrade' : 'rejectTrade', playerId: ctx.me.id }
}

/** Rolls the dice after a double, ends the turn otherwise. */
export function rollOrEnd(ctx: DecisionContext): Action {
  const phase = ctx.view.phase
  return phase.kind === 'postRoll' && !phase.mayRollAgain
    ? { type: 'endTurn', playerId: ctx.me.id }
    : { type: 'rollDice', playerId: ctx.me.id }
}

/** Buys the square or declines it. */
export function buyOrDecline(ctx: DecisionContext, buy: boolean): Action {
  return buy ? { type: 'buyProperty', playerId: ctx.me.id } : { type: 'declineProperty', playerId: ctx.me.id }
}

/** Square of the current purchase decision or auction. */
export function offeredSquare(ctx: DecisionContext): SquareId {
  const phase = ctx.view.phase
  if (phase.kind !== 'buyDecision' && phase.kind !== 'auction') throw new Error(`No square on offer in ${phase.kind}`)
  return phase.squareId
}

/** Whether the player can pay the price without going under its reserve. */
export function keepsReserve(ctx: DecisionContext, price: number): boolean {
  return ctx.me.cash - price >= ctx.reserve
}

/** Smallest bid an AI places: 10 Ᵽ to open, then 10 Ᵽ above the highest bid. */
export function nextBid(ctx: DecisionContext): number {
  const phase = ctx.view.phase
  if (phase.kind !== 'auction') return MIN_BID
  return phase.highBidder === null ? MIN_BID : phase.highBid + BID_STEP
}

/** Places the next bid when it stays within the value and above the reserve, passes otherwise. */
export function bidUpTo(ctx: DecisionContext, value: number): Action {
  const amount = nextBid(ctx)
  return amount <= value && amount <= ctx.me.cash - ctx.reserve
    ? { type: 'placeBid', playerId: ctx.me.id, amount }
    : { type: 'passBid', playerId: ctx.me.id }
}

/** Pays the debt when the first payment is covered, otherwise raises cash in the given order of sacrifice, or goes bankrupt. */
export function settleDebt(ctx: DecisionContext, order: SquareOrder): Action {
  const phase = ctx.view.phase
  const id = ctx.me.id
  const first = phase.kind === 'debt' ? phase.payments[0] : undefined
  if (!first || ctx.me.cash >= first.amount) return { type: 'payDebt', playerId: id }
  if (!ctx.managementAllowed || liquidationValue(ctx.view, id) < first.amount) return { type: 'declareBankruptcy', playerId: id }
  const [sale] = order(ctx, sellableSquares(ctx.view, id))
  if (sale) return { type: 'sellBackdoor', playerId: id, squareId: sale }
  const mortgageable = mortgageableSquares(ctx.view, id)
  const [isolated] = order(ctx, mortgageable.filter((squareId) => !inCompleteFamily(ctx, squareId)))
  if (isolated) return { type: 'mortgage', playerId: id, squareId: isolated }
  const [inFamily] = order(ctx, mortgageable)
  if (inFamily) return { type: 'mortgage', playerId: id, squareId: inFamily }
  return { type: 'declareBankruptcy', playerId: id }
}

/** Expected rent of the opponent squares 2 to 12 squares after the quarantine. */
export function dangerAfterQuarantine(ctx: DecisionContext): number {
  let expected = 0
  for (let total = 2; total <= 12; total++) {
    const square = BOARD[(QUARANTINE_INDEX + total) % BOARD.length]
    const own = square ? ctx.view.ownership[square.id] : undefined
    if (!square || !own || own.owner === ctx.me.id || own.mortgaged) continue
    expected += diceTotalOdds(total) * rentIfLanded(ctx.view, square.id, total)
  }
  return expected
}

/** Leaves the quarantine at once with a key or the fine while many squares are still for sale, tries a double otherwise. */
export function leaveQuarantineEarly(ctx: DecisionContext, stay: boolean): Action {
  const id = ctx.me.id
  if (stay || freePurchasableCount(ctx.view) < EARLY_GAME_FREE_SQUARES) return { type: 'rollDice', playerId: id }
  if (ctx.me.keys.length > 0) return { type: 'useDecryptionKey', playerId: id }
  if (ctx.me.cash >= QUARANTINE_FINE && keepsReserve(ctx, QUARANTINE_FINE)) return { type: 'payQuarantineFine', playerId: id }
  return { type: 'rollDice', playerId: id }
}

/** Families whose levels are spread over the given range. */
export function familiesWithin(ctx: DecisionContext, squareIds: SquareId[], accept: (levels: number[]) => boolean): SquareId[] {
  return squareIds.filter((id) => {
    const family = familyOf(id)
    return family !== null && accept(familyLevels(ctx.view, family))
  })
}

/** Opponents of the player still in the game. */
export function rivals(ctx: DecisionContext): Player[] {
  return ctx.view.players.filter((p) => p.id !== ctx.me.id && !p.bankrupt)
}
