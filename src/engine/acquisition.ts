import { MIN_BID, purchasableById } from './board/squares'
import { currentPlayer, emit, fail, getPlayer, playersFrom, transfer, type Ctx } from './context'
import { enterPostRoll } from './turn'
import type { PlayerId, SquareId } from './types'

function priceOf(squareId: SquareId): number {
  return purchasableById(squareId)?.price ?? 0
}

function give(ctx: Ctx, playerId: PlayerId, squareId: SquareId): void {
  ctx.state.ownership[squareId] = { owner: playerId, mortgaged: false, level: 0 }
}

export function buyProperty(ctx: Ctx): void {
  const phase = ctx.state.phase
  if (phase.kind !== 'buyDecision') return
  const player = currentPlayer(ctx.state)
  const price = priceOf(phase.squareId)
  if (player.cash < price) fail('INSUFFICIENT_FUNDS', `Il vous faut ${price} Ᵽ pour acheter ce système.`)
  transfer(ctx, player.id, 'bank', price, 'purchase')
  give(ctx, player.id, phase.squareId)
  emit(ctx, { type: 'propertyBought', playerId: player.id, squareId: phase.squareId, price })
  enterPostRoll(ctx)
}

export function declineProperty(ctx: Ctx): void {
  const state = ctx.state
  const phase = state.phase
  if (phase.kind !== 'buyDecision') return
  const player = currentPlayer(state)
  emit(ctx, { type: 'propertyDeclined', playerId: player.id, squareId: phase.squareId })
  if (!state.settings.auctions) {
    enterPostRoll(ctx)
    return
  }
  const bidders = playersFrom(state, state.currentPlayerIndex).map((p) => p.id)
  state.phase = {
    kind: 'auction',
    squareId: phase.squareId,
    highBid: 0,
    highBidder: null,
    bidders,
    nextBidder: player.id,
  }
  emit(ctx, { type: 'auctionStarted', squareId: phase.squareId, bidders })
}

function auctionPhase(ctx: Ctx) {
  const phase = ctx.state.phase
  if (phase.kind !== 'auction') fail('WRONG_PHASE', 'Aucune enchère en cours.')
  return phase
}

function settleIfOver(ctx: Ctx): void {
  const phase = auctionPhase(ctx)
  if (phase.bidders.length === 0) {
    emit(ctx, { type: 'auctionUnsold', squareId: phase.squareId })
    enterPostRoll(ctx)
    return
  }
  const [last] = phase.bidders
  if (phase.bidders.length === 1 && last && phase.highBidder === last) {
    transfer(ctx, last, 'bank', phase.highBid, 'auction')
    give(ctx, last, phase.squareId)
    emit(ctx, { type: 'auctionWon', playerId: last, squareId: phase.squareId, amount: phase.highBid })
    enterPostRoll(ctx)
  }
}

export function placeBid(ctx: Ctx, playerId: PlayerId, amount: number): void {
  const phase = auctionPhase(ctx)
  const minimum = phase.highBidder === null ? MIN_BID : phase.highBid + 1
  if (!Number.isInteger(amount) || amount < minimum) {
    fail('INVALID_BID', `La mise doit être d’au moins ${minimum} Ᵽ.`)
  }
  if (amount > getPlayer(ctx.state, playerId).cash) fail('INSUFFICIENT_FUNDS', 'Vous ne pouvez pas miser plus que votre argent.')
  phase.highBid = amount
  phase.highBidder = playerId
  const index = phase.bidders.indexOf(playerId)
  phase.nextBidder = phase.bidders[(index + 1) % phase.bidders.length] ?? playerId
  emit(ctx, { type: 'bidPlaced', playerId, amount })
  settleIfOver(ctx)
}

export function passBid(ctx: Ctx, playerId: PlayerId): void {
  const phase = auctionPhase(ctx)
  const index = phase.bidders.indexOf(playerId)
  phase.bidders.splice(index, 1)
  if (phase.bidders.length > 0) phase.nextBidder = phase.bidders[index % phase.bidders.length] ?? playerId
  emit(ctx, { type: 'bidPassed', playerId })
  settleIfOver(ctx)
}
