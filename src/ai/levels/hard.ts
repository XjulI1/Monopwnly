import { mortgageableSquares, purchasableById, QUARANTINE_FINE, type Action, type SquareId } from '../../engine'
import { HARD_TARGET_BACKDOORS, LOW_BANK_STOCK, LOW_STOCK_RESERVE_FACTOR, LOW_YIELD_RATIO, QUARANTINE_DANGER_FACTOR } from '../constants'
import { crossOffer, debtSaleOffer, purchaseOffer } from '../trade/proposeOffers'
import { familyOutlook, squareValue, yieldRatio } from '../valuation'
import {
  affordableBuild,
  answerOffer,
  backdoorCostOf,
  bestBuildsFirst,
  bidUpTo,
  buildCandidates,
  buyOrDecline,
  byExpectedRent,
  comfortableReactivations,
  dangerAfterQuarantine,
  familiesWithin,
  familyReactivations,
  inCompleteFamily,
  keepsReserve,
  leaveQuarantineEarly,
  offeredSquare,
  priceOf,
  proposal,
  reactivation,
  rivals,
  rollOrEnd,
  settleDebt,
  type DecisionContext,
  type Strategy,
} from './strategy'

function buildOrder(ctx: DecisionContext): SquareId[] {
  const candidates = buildCandidates(ctx)
  const inProgress = familiesWithin(ctx, candidates, (levels) => Math.max(...levels) > 0 && Math.min(...levels) < HARD_TARGET_BACKDOORS)
  if (inProgress.length > 0) return bestBuildsFirst(ctx, inProgress)
  const belowTarget = familiesWithin(ctx, candidates, (levels) => Math.min(...levels) < HARD_TARGET_BACKDOORS)
  return bestBuildsFirst(ctx, belowTarget.length > 0 ? belowTarget : candidates)
}

function buildingReserve(ctx: DecisionContext): number {
  return ctx.view.bankStock.backdoors <= LOW_BANK_STOCK ? ctx.reserve * LOW_STOCK_RESERVE_FACTOR : ctx.reserve
}

function mortgageToBuild(ctx: DecisionContext, ordered: SquareId[], keep: number): Action | null {
  const [target] = ordered
  if (!target) return null
  const isolated = byExpectedRent(ctx, mortgageableSquares(ctx.view, ctx.me.id).filter((id) => !inCompleteFamily(ctx, id)))
  const raisable = isolated.reduce((sum, id) => sum + (purchasableById(id)?.mortgageValue ?? 0), 0)
  const [first] = isolated
  if (!first || ctx.me.cash + raisable - backdoorCostOf(target) < keep) return null
  return { type: 'mortgage', playerId: ctx.me.id, squareId: first }
}

function manage(ctx: DecisionContext): Action | null {
  if (!ctx.managementAllowed) return null
  const order = buildOrder(ctx)
  const keep = buildingReserve(ctx)
  return (
    reactivation(ctx, familyReactivations(ctx)) ??
    affordableBuild(ctx, order, keep) ??
    mortgageToBuild(ctx, order, keep) ??
    reactivation(ctx, byExpectedRent(ctx, comfortableReactivations(ctx)).reverse())
  )
}

function tradeProposal(ctx: DecisionContext): Action | null {
  return proposal(ctx, crossOffer(ctx) ?? purchaseOffer(ctx))
}

function waitsForAuction(ctx: DecisionContext, squareId: SquareId): boolean {
  const outlook = familyOutlook(ctx.view, squareId, ctx.me.id)
  const interesting = outlook.completes || outlook.approaches || outlook.blocks
  const poorest = rivals(ctx).every((rival) => ctx.me.cash < rival.cash)
  return ctx.view.settings.auctions && poorest && !interesting && yieldRatio(ctx.view, squareId, ctx.me.id) < LOW_YIELD_RATIO
}

/** Hard level: more prudent reserve, blocking and yield in the value, three backdoors per system first, tactical refusals, cross trades. */
export const hard: Strategy = {
  preRoll: (ctx) => {
    const managed = tradeProposal(ctx) ?? manage(ctx)
    if (managed) return managed
    if (!ctx.me.quarantine) return { type: 'rollDice', playerId: ctx.me.id }
    return leaveQuarantineEarly(ctx, dangerAfterQuarantine(ctx) > QUARANTINE_DANGER_FACTOR * QUARANTINE_FINE)
  },
  buyDecision: (ctx) => {
    const squareId = offeredSquare(ctx)
    const price = priceOf(squareId)
    if (price > ctx.me.cash || waitsForAuction(ctx, squareId)) return buyOrDecline(ctx, false)
    const outlook = familyOutlook(ctx.view, squareId, ctx.me.id)
    return buyOrDecline(ctx, (keepsReserve(ctx, price) && !outlook.contested) || outlook.completes || outlook.blocks)
  },
  auction: (ctx) => bidUpTo(ctx, squareValue(ctx.view, offeredSquare(ctx), ctx.me.id, 'hard')),
  debt: (ctx) => proposal(ctx, debtSaleOffer(ctx)) ?? settleDebt(ctx, byExpectedRent),
  postRoll: (ctx) => tradeProposal(ctx) ?? manage(ctx) ?? rollOrEnd(ctx),
  tradeOffer: answerOffer,
}
