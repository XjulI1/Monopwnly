import type { Action } from '../../engine'
import { EASY_AUCTION_DISCOUNT } from '../constants'
import {
  affordableBuild,
  bidUpTo,
  buildCandidates,
  buyOrDecline,
  inBoardOrder,
  keepsReserve,
  offeredSquare,
  priceOf,
  rollOrEnd,
  settleDebt,
  type DecisionContext,
  type Strategy,
} from './strategy'

function manage(ctx: DecisionContext): Action | null {
  if (!ctx.managementAllowed) return null
  return affordableBuild(ctx, inBoardOrder(ctx, buildCandidates(ctx)))
}

/** Easy level: fixed reserve, price as the only value, board order everywhere, always tries a double in quarantine. */
export const easy: Strategy = {
  preRoll: (ctx) => manage(ctx) ?? { type: 'rollDice', playerId: ctx.me.id },
  buyDecision: (ctx) => {
    const price = priceOf(offeredSquare(ctx))
    return buyOrDecline(ctx, price <= ctx.me.cash && keepsReserve(ctx, price))
  },
  auction: (ctx) => bidUpTo(ctx, priceOf(offeredSquare(ctx)) * (1 - EASY_AUCTION_DISCOUNT)),
  debt: (ctx) => settleDebt(ctx, inBoardOrder),
  postRoll: (ctx) => manage(ctx) ?? rollOrEnd(ctx),
}
