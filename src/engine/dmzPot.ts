import { emit, getPlayer, type Ctx } from './context'
import type { Payment, PlayerId } from './types'

/** Pays into the DMZ pot a tax or a card payment due to the bank when the option is on; returns false for any other payment. */
export function payToPot(ctx: Ctx, debtorId: PlayerId, payment: Payment): boolean {
  const { reason, amount } = payment
  if (!ctx.state.settings.dmzJackpot || payment.to !== 'bank' || (reason !== 'tax' && reason !== 'card')) return false
  getPlayer(ctx.state, debtorId).cash -= amount
  ctx.state.dmzPot += amount
  emit(ctx, { type: 'potIncreased', playerId: debtorId, amount, reason })
  return true
}

/** Gives the whole DMZ pot to the player, if there is anything in it. */
export function collectPot(ctx: Ctx, playerId: PlayerId): void {
  const amount = ctx.state.dmzPot
  if (amount <= 0) return
  getPlayer(ctx.state, playerId).cash += amount
  ctx.state.dmzPot = 0
  emit(ctx, { type: 'potCollected', playerId, amount })
}
