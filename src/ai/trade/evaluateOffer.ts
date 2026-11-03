import {
  FAMILY_SQUARES,
  netWorth,
  purchasableById,
  stateAfterTrade,
  type AiLevel,
  type FamilyId,
  type PlayerId,
  type TradeOffer,
  type TradeSide,
} from '../../engine'
import { DECRYPTION_KEY_VALUE, TRADE_ACCEPT_THRESHOLD, TRADE_DANGER_LEVEL, TRADE_DANGER_ROUNDS } from '../constants'
import type { PlayerView } from '../playerView'
import { expectedRent, playerOf, squareValue } from '../valuation'

/** How the recipient of an offer weighs it, in PwnCoins: net gain, value exchanged, danger and lead penalty included in the gain. */
export type OfferEvaluation = { gain: number; exchanged: number; danger: number; penalty: number; accept: boolean }

const MAX_LEVEL = 5
const FAMILIES = Object.keys(FAMILY_SQUARES) as FamilyId[]

function sideValue(view: PlayerView, side: TradeSide, playerId: PlayerId, level: AiLevel): number {
  const squares = side.squares.reduce((sum, id) => sum + squareValue(view, id, playerId, level), 0)
  return squares + side.cash + side.keys.length * DECRYPTION_KEY_VALUE
}

function ownsFamily(view: PlayerView, playerId: PlayerId, family: FamilyId): boolean {
  return FAMILY_SQUARES[family].every((id) => view.ownership[id]?.owner === playerId)
}

function familyBuildCost(family: FamilyId): number {
  return FAMILY_SQUARES[family].reduce((sum, id) => {
    const square = purchasableById(id)
    return sum + (square?.kind === 'system' ? square.backdoorCost : 0)
  }, 0)
}

function dangerLevel(after: PlayerView, playerId: PlayerId, family: FamilyId, level: AiLevel): number {
  if (level !== 'hard') return TRADE_DANGER_LEVEL
  return Math.min(MAX_LEVEL, Math.floor(playerOf(after, playerId).cash / Math.max(1, familyBuildCost(family))))
}

function danger(before: PlayerView, after: PlayerView, author: PlayerId, level: AiLevel): number {
  if (level === 'easy') return 0
  return FAMILIES.filter((family) => !ownsFamily(before, author, family) && ownsFamily(after, author, family)).reduce((total, family) => {
    const built = dangerLevel(after, author, family, level)
    const perRound = FAMILY_SQUARES[family].reduce((sum, id) => sum + expectedRent(after, id, author, built), 0)
    return total + perRound * TRADE_DANGER_ROUNDS
  }, 0)
}

function leadPenalty(before: PlayerView, after: PlayerView, author: PlayerId, level: AiLevel): number {
  if (level !== 'hard') return 0
  const others = before.players.filter((p) => p.id !== author && !p.bankrupt).map((p) => p.id)
  const best = (view: PlayerView) => Math.max(...others.map((id) => netWorth(view, id)))
  if (netWorth(before, author) > best(before)) return 0
  return Math.max(0, netWorth(after, author) - best(after))
}

/** How the recipient of the offer, playing at the given level, weighs it; squares received are valued on the state after the trade. */
export function evaluateOffer(view: PlayerView, offer: TradeOffer, level: AiLevel): OfferEvaluation {
  const after = stateAfterTrade(view, offer)
  const received = sideValue(after, offer.give, offer.to, level)
  const given = sideValue(view, offer.receive, offer.to, level)
  const threat = danger(view, after, offer.from, level)
  const penalty = leadPenalty(view, after, offer.from, level)
  const gain = received - given - threat - penalty
  const exchanged = received + given
  return { gain, exchanged, danger: threat, penalty, accept: gain >= TRADE_ACCEPT_THRESHOLD[level] * exchanged }
}
