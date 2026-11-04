import {
  FAMILY_SQUARES,
  netWorth,
  purchasableById,
  QUARANTINE_FINE,
  stateAfterTrade,
  type Action,
  type FamilyId,
  type PlayerId,
  type SquareId,
  type TradeOffer,
} from '../engine'
import { END_GAME_ROUNDS, TARGET_THREAT_SHARE } from './constants'
import type { DecisionContext } from './levels/strategy'
import type { PlayerView } from './playerView'
import { expectedRent, familyOutlook, opponents } from './valuation'

const FAMILIES = Object.keys(FAMILY_SQUARES) as FamilyId[]

/** Whether a limited game is in its last rounds, when normal and hard AIs play for their immediate net worth. */
export function endGameNear(view: PlayerView): boolean {
  const { turnLimit } = view.settings
  return turnLimit !== null && view.turnNumber > turnLimit - END_GAME_ROUNDS
}

/** Opponents of the player whose net worth reached the threatening share of the net worth target. */
export function threateningRivals(view: PlayerView, playerId: PlayerId): PlayerId[] {
  const target = view.settings.netWorthTarget
  if (target === null) return []
  return opponents(view, playerId)
    .map((p) => p.id)
    .filter((id) => netWorth(view, id) >= TARGET_THREAT_SHARE * target)
}

function blocksThreateningRival(ctx: DecisionContext, squareId: SquareId): boolean {
  return threateningRivals(ctx.view, ctx.me.id).some((rival) => familyOutlook(ctx.view, squareId, rival).completes)
}

/** Most a normal or hard AI bids for the square: anything its reserve allows to keep a family from a threatening rival (hard), the price near the end of a limited game, its own value otherwise. */
export function auctionCeiling(ctx: DecisionContext, squareId: SquareId, value: number): number {
  if (ctx.level === 'hard' && blocksThreateningRival(ctx, squareId)) return Number.POSITIVE_INFINITY
  if (endGameNear(ctx.view)) return purchasableById(squareId)?.price ?? 0
  return value
}

function ownsFamily(view: PlayerView, playerId: PlayerId, family: FamilyId): boolean {
  return FAMILY_SQUARES[family].every((id) => view.ownership[id]?.owner === playerId)
}

function completesFamilyOf(before: PlayerView, after: PlayerView, playerId: PlayerId): boolean {
  return FAMILIES.some((family) => !ownsFamily(before, playerId, family) && ownsFamily(after, playerId, family))
}

/** Whether the options make a normal or hard AI refuse the offer its usual evaluation would accept. */
export function optionsRefuseOffer(ctx: DecisionContext, offer: TradeOffer): boolean {
  if (ctx.level === 'easy') return false
  const before = ctx.view
  const after = stateAfterTrade(before, offer)
  if (endGameNear(before) && netWorth(after, ctx.me.id) <= netWorth(before, ctx.me.id)) return true
  if (!threateningRivals(before, ctx.me.id).includes(offer.from)) return false
  return ctx.level === 'hard'
    ? netWorth(after, offer.from) > netWorth(before, offer.from)
    : completesFamilyOf(before, after, offer.from)
}

function rentAtStake(ctx: DecisionContext): number {
  return Object.entries(ctx.view.ownership)
    .filter(([, own]) => own.owner === ctx.me.id && !own.mortgaged)
    .reduce((sum, [id]) => sum + expectedRent(ctx.view, id, ctx.me.id), 0)
}

/** Leaves the quarantine at once, with a key or the fine, when no rent is collected there and the squares of the AI bring more than the fine; null otherwise. */
export function rentlessQuarantineExit(ctx: DecisionContext): Action | null {
  if (!ctx.me.quarantine || !ctx.view.settings.noRentInQuarantine || rentAtStake(ctx) <= QUARANTINE_FINE) return null
  if (ctx.me.keys.length > 0) return { type: 'useDecryptionKey', playerId: ctx.me.id }
  if (ctx.me.cash >= QUARANTINE_FINE) return { type: 'payQuarantineFine', playerId: ctx.me.id }
  return null
}
