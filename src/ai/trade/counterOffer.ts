import {
  counterProblem,
  FAMILY_SQUARES,
  purchasableById,
  reversedOffer,
  stateAfterTrade,
  type FamilyId,
  type PlayerId,
  type TradeOffer,
} from '../../engine'
import { COUNTER_MAX_SHARE, TRADE_CASH_STEP } from '../constants'
import type { DecisionContext } from '../levels/strategy'
import { optionsRefuseOffer } from '../options'
import type { PlayerView } from '../playerView'
import { evaluateOffer } from './evaluateOffer'
import { smallestAcceptedStep } from './stepSearch'

const FAMILIES = Object.keys(FAMILY_SQUARES) as FamilyId[]

/** Whether the AI, recipient of the offer, accepts it: its evaluation at its level says so and the game options do not make it refuse. */
export function acceptsOffer(ctx: DecisionContext, offer: TradeOffer): boolean {
  return evaluateOffer(ctx.view, offer, ctx.level).accept && !optionsRefuseOffer(ctx, offer)
}

function withNetCash(offer: TradeOffer, net: number): TradeOffer {
  return { ...offer, give: { ...offer.give, cash: Math.max(0, net) }, receive: { ...offer.receive, cash: Math.max(0, -net) } }
}

/** Counter-offer of a normal or hard AI to an offer it does not accept as it is: the same offer with the smallest complement of PwnCoins in its favour that makes it accept, if that complement stays within half the value exchanged and the author can pay it. */
export function counterOffer(ctx: DecisionContext): TradeOffer | null {
  const phase = ctx.view.phase
  if (ctx.level === 'easy' || phase.kind !== 'tradeOffer' || phase.original !== null) return null
  const offer = phase.offer
  const author = ctx.view.players.find((p) => p.id === offer.from)
  if (!author) return null
  const net = offer.give.cash - offer.receive.cash
  const completed = (steps: number) => withNetCash(offer, net + steps * TRADE_CASH_STEP)
  const most = Math.min(COUNTER_MAX_SHARE * evaluateOffer(ctx.view, offer, ctx.level).exchanged, author.cash - net)
  const steps = smallestAcceptedStep((n) => acceptsOffer(ctx, completed(n)), Math.floor(most / TRADE_CASH_STEP))
  if (steps === null || steps === 0) return null
  const counter = reversedOffer(completed(steps))
  return counterProblem(ctx.view, counter) === null ? counter : null
}

function ownsFamily(view: PlayerView, playerId: PlayerId, family: FamilyId): boolean {
  return FAMILY_SQUARES[family].every((id) => view.ownership[id]?.owner === playerId)
}

function backdoorsOfCompletedFamilies(ctx: DecisionContext, offer: TradeOffer): number {
  const after = stateAfterTrade(ctx.view, offer)
  return FAMILIES.filter((family) => !ownsFamily(ctx.view, ctx.me.id, family) && ownsFamily(after, ctx.me.id, family))
    .flatMap((family) => FAMILY_SQUARES[family])
    .reduce((sum, id) => {
      const square = purchasableById(id)
      return sum + (square?.kind === 'system' ? square.backdoorCost : 0)
    }, 0)
}

function keepsItsMoney(ctx: DecisionContext, counter: TradeOffer): boolean {
  if (counter.receive.cash === 0) return true
  const kept = ctx.level === 'hard' ? ctx.reserve + backdoorsOfCompletedFamilies(ctx, counter) : ctx.reserve
  return ctx.me.cash - counter.receive.cash + counter.give.cash >= kept
}

function coversMortgageValue(ctx: DecisionContext, counter: TradeOffer): boolean {
  const phase = ctx.view.phase
  if (phase.kind !== 'tradeOffer' || phase.resume.kind !== 'debt' || phase.resume.debtor !== ctx.me.id) return false
  const onlyCash = counter.give.squares.length === 0 && counter.give.keys.length === 0 && counter.receive.keys.length === 0
  const mortgageValue = counter.receive.squares.reduce((sum, id) => sum + (purchasableById(id)?.mortgageValue ?? 0), 0)
  return onlyCash && counter.receive.squares.length > 0 && counter.give.cash - counter.receive.cash >= mortgageValue
}

/** Whether the AI, author of the offer, accepts the counter-offer it received: during its own debt, as soon as its sale brings the mortgage value of the squares; otherwise as any offer received, while keeping its reserve, and at the hard level a backdoor on each system of the families the trade completes. */
export function acceptsCounter(ctx: DecisionContext): boolean {
  const phase = ctx.view.phase
  if (phase.kind !== 'tradeOffer') return false
  const counter = phase.offer
  return coversMortgageValue(ctx, counter) || (acceptsOffer(ctx, counter) && keepsItsMoney(ctx, counter))
}
