import type { Action } from '../../engine'
import { familyOutlook, squareValue } from '../valuation'
import {
  affordableBuild,
  bestBuildsFirst,
  bidUpTo,
  buildCandidates,
  buyOrDecline,
  byExpectedRent,
  comfortableReactivations,
  familyReactivations,
  keepsReserve,
  leaveQuarantineEarly,
  offeredSquare,
  priceOf,
  reactivation,
  rollOrEnd,
  settleDebt,
  type DecisionContext,
  type Strategy,
} from './strategy'

function manage(ctx: DecisionContext): Action | null {
  if (!ctx.managementAllowed) return null
  return (
    reactivation(ctx, familyReactivations(ctx)) ??
    affordableBuild(ctx, bestBuildsFirst(ctx, buildCandidates(ctx))) ??
    reactivation(ctx, byExpectedRent(ctx, comfortableReactivations(ctx)).reverse())
  )
}

/** Normal level: reserve from the rents within reach, family premium, best rent per PwnCoin when building. */
export const normal: Strategy = {
  preRoll: (ctx) => manage(ctx) ?? (ctx.me.quarantine ? leaveQuarantineEarly(ctx, false) : { type: 'rollDice', playerId: ctx.me.id }),
  buyDecision: (ctx) => {
    const squareId = offeredSquare(ctx)
    const price = priceOf(squareId)
    const outlook = familyOutlook(ctx.view, squareId, ctx.me.id)
    return buyOrDecline(ctx, price <= ctx.me.cash && ((keepsReserve(ctx, price) && !outlook.contested) || outlook.completes))
  },
  auction: (ctx) => bidUpTo(ctx, squareValue(ctx.view, offeredSquare(ctx), ctx.me.id, 'normal')),
  debt: (ctx) => settleDebt(ctx, byExpectedRent),
  postRoll: (ctx) => manage(ctx) ?? rollOrEnd(ctx),
}
