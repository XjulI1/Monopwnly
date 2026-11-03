import type { GameEvent, GameState, PaymentReason, Player, PlayerId, PublicGameState, RuleErrorCode } from './types'

export type Ctx = { state: GameState; events: GameEvent[] }

export class RuleViolation extends Error {
  readonly code: RuleErrorCode

  constructor(code: RuleErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export function fail(code: RuleErrorCode, message: string): never {
  throw new RuleViolation(code, message)
}

export function emit(ctx: Ctx, event: GameEvent): void {
  ctx.events.push(event)
}

export function currentPlayer(state: PublicGameState): Player {
  const player = state.players[state.currentPlayerIndex]
  if (!player) throw new Error('No current player')
  return player
}

export function getPlayer(state: PublicGameState, id: PlayerId): Player {
  const player = state.players.find((p) => p.id === id)
  if (!player) throw new Error(`Unknown player ${id}`)
  return player
}

/** Non-bankrupt players in play order, starting at the given index (included). */
export function playersFrom(state: PublicGameState, startIndex: number): Player[] {
  const count = state.players.length
  const result: Player[] = []
  for (let offset = 0; offset < count; offset++) {
    const player = state.players[(startIndex + offset) % count]
    if (player && !player.bankrupt) result.push(player)
  }
  return result
}

/** Non-bankrupt players other than the current one, in play order after the current player. */
export function otherPlayersInOrder(state: PublicGameState): Player[] {
  return playersFrom(state, state.currentPlayerIndex + 1).filter(
    (p) => p.id !== currentPlayer(state).id,
  )
}

export function transfer(
  ctx: Ctx,
  from: PlayerId | 'bank',
  to: PlayerId | 'bank',
  amount: number,
  reason: PaymentReason,
): void {
  if (amount <= 0) return
  if (from !== 'bank') getPlayer(ctx.state, from).cash -= amount
  if (to !== 'bank') getPlayer(ctx.state, to).cash += amount
  emit(ctx, { type: 'paid', from, to, amount, reason })
}
