import {
  FAMILY_SQUARES,
  mortgageableSquares,
  purchasableById,
  sellableSquares,
  turnProposals,
  validateTrade,
  type AiLevel,
  type FamilyId,
  type Player,
  type PlayerId,
  type SquareId,
  type TradeOffer,
  type TradeSide,
} from '../../engine'
import { DEBT_SALE_FACTOR, PURCHASE_PRICE_STEPS, REACHABLE_LEVEL, TRADE_CASH_STEP } from '../constants'
import { byExpectedRent, inCompleteFamily, rivals, type DecisionContext } from '../levels/strategy'
import { expectedRent, horizon } from '../valuation'
import { evaluateOffer } from './evaluateOffer'
import { smallestAcceptedStep } from './stepSearch'

type Missing = { squareId: SquareId; holder: PlayerId }

const FAMILIES = Object.keys(FAMILY_SQUARES) as FamilyId[]
const NOTHING: TradeSide = { squares: [], cash: 0, keys: [] }

function roundUp(amount: number): number {
  return Math.ceil(amount / TRADE_CASH_STEP) * TRADE_CASH_STEP
}

function missingSquare(ctx: DecisionContext, owner: PlayerId, family: FamilyId): Missing | null {
  const others = FAMILY_SQUARES[family].filter((id) => ctx.view.ownership[id]?.owner !== owner)
  const [squareId] = others
  const holder = squareId ? ctx.view.ownership[squareId]?.owner : undefined
  return others.length === 1 && squareId && holder ? { squareId, holder } : null
}

function budget(ctx: DecisionContext): number {
  return Math.max(0, ctx.me.cash - ctx.reserve)
}

function proposable(ctx: DecisionContext, offer: TradeOffer): boolean {
  return !turnProposals(ctx.view, ctx.me.id).partners.includes(offer.to) && validateTrade(ctx.view, offer) === null
}

function refusalsOf(ctx: DecisionContext, missing: Missing): number {
  const asked = ctx.view.tradeLimits.refusedAsks[ctx.me.id]?.[missing.squareId]
  return asked?.holder === missing.holder ? asked.count : 0
}

/** Offer to buy for PwnCoins the square that completes a family of the AI, at a price that rises with the refusals. */
export function purchaseOffer(ctx: DecisionContext): TradeOffer | null {
  for (const family of FAMILIES) {
    const missing = missingSquare(ctx, ctx.me.id, family)
    if (!missing) continue
    const step = PURCHASE_PRICE_STEPS[refusalsOf(ctx, missing)]
    const price = purchasableById(missing.squareId)?.price ?? 0
    if (step === undefined) continue
    const amount = roundUp(price * step)
    if (amount > budget(ctx)) continue
    const offer: TradeOffer = { from: ctx.me.id, to: missing.holder, give: { ...NOTHING, cash: amount }, receive: { ...NOTHING, squares: [missing.squareId] } }
    if (proposable(ctx, offer)) return offer
  }
  return null
}

function familyRent(ctx: DecisionContext, family: FamilyId, owner: PlayerId): number {
  return FAMILY_SQUARES[family].reduce((sum, id) => sum + expectedRent(ctx.view, id, owner, REACHABLE_LEVEL), 0)
}

function levelOf(player: Player): AiLevel {
  return player.controller.kind === 'ai' ? player.controller.level : 'normal'
}

function withCash(offer: TradeOffer, cash: number): TradeOffer {
  return { ...offer, give: { ...offer.give, cash } }
}

function buildCost(family: FamilyId): number {
  return FAMILY_SQUARES[family].reduce((sum, id) => {
    const square = purchasableById(id)
    return sum + (square?.kind === 'system' ? square.backdoorCost : 0)
  }, 0)
}

function cheapestAccepted(ctx: DecisionContext, offer: TradeOffer, partner: Player, most: number): TradeOffer | null {
  const accepts = (steps: number) => evaluateOffer(ctx.view, withCash(offer, steps * TRADE_CASH_STEP), levelOf(partner)).accept
  const steps = smallestAcceptedStep(accepts, Math.floor(Math.max(0, most) / TRADE_CASH_STEP))
  return steps === null ? null : withCash(offer, steps * TRADE_CASH_STEP)
}

/** Offer where the AI and a rival each complete a family, when the family the AI gets brings more rent, with the PwnCoins the rival should need to accept; the AI keeps enough to put a backdoor on each system of its family and never pays more than its extra rent over the rest of the game. */
export function crossOffer(ctx: DecisionContext): TradeOffer | null {
  for (const rival of rivals(ctx)) {
    for (const wanted of FAMILIES) {
      const take = missingSquare(ctx, ctx.me.id, wanted)
      if (take?.holder !== rival.id) continue
      for (const ceded of FAMILIES) {
        const give = missingSquare(ctx, rival.id, ceded)
        const advantage = familyRent(ctx, wanted, ctx.me.id) - familyRent(ctx, ceded, rival.id)
        if (give?.holder !== ctx.me.id || advantage <= 0) continue
        const most = Math.min(budget(ctx) - buildCost(wanted), advantage * horizon(ctx.view))
        const base: TradeOffer = { from: ctx.me.id, to: rival.id, give: { ...NOTHING, squares: [give.squareId] }, receive: { ...NOTHING, squares: [take.squareId] } }
        const offer = cheapestAccepted(ctx, base, rival, most)
        if (offer && proposable(ctx, offer)) return offer
      }
    }
  }
  return null
}

/** Offer, during a debt not yet covered, of an isolated square for more than its mortgage value to the richest player who is not the creditor. */
export function debtSaleOffer(ctx: DecisionContext): TradeOffer | null {
  const phase = ctx.view.phase
  const first = phase.kind === 'debt' ? phase.payments[0] : undefined
  if (!first || ctx.me.cash >= first.amount || sellableSquares(ctx.view, ctx.me.id).length > 0) return null
  const partners = turnProposals(ctx.view, ctx.me.id).partners
  const [buyer] = rivals(ctx)
    .filter((p) => p.id !== first.to && !partners.includes(p.id))
    .sort((a, b) => b.cash - a.cash)
  if (!buyer) return null
  const isolated = byExpectedRent(ctx, mortgageableSquares(ctx.view, ctx.me.id).filter((id) => !inCompleteFamily(ctx, id)))
  for (const squareId of isolated) {
    const price = Math.ceil((purchasableById(squareId)?.mortgageValue ?? 0) * DEBT_SALE_FACTOR)
    if (price > buyer.cash) continue
    const offer: TradeOffer = { from: ctx.me.id, to: buyer.id, give: { ...NOTHING, squares: [squareId] }, receive: { ...NOTHING, cash: price } }
    if (validateTrade(ctx.view, offer) === null) return offer
  }
  return null
}
