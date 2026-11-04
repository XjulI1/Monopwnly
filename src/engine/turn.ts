import { currentPlayer, emit, fail, playersFrom, type Ctx } from './context'
import { standings } from './queries'
import type { PlayerId, PublicGameState, WinReason } from './types'

export function enterPostRoll(ctx: Ctx): void {
  const player = currentPlayer(ctx.state)
  ctx.state.phase = {
    kind: 'postRoll',
    mayRollAgain: ctx.state.doublesInARow > 0 && player.quarantine === null && !player.bankrupt,
  }
}

export function endTurn(ctx: Ctx): void {
  const phase = ctx.state.phase
  if (phase.kind === 'postRoll' && phase.mayRollAgain) {
    fail('MUST_ROLL_AGAIN', 'Vous avez fait un double : relancez les dés avant de finir votre tour.')
  }
  finishTurn(ctx)
}

/** Ends the turn of the current player: declares the winner when an end condition is met, hands the turn to the next player otherwise. */
export function finishTurn(ctx: Ctx): void {
  if (checkVictory(ctx)) return
  advanceToNextPlayer(ctx)
}

function seatsAhead(state: PublicGameState, from: number, to: number): number {
  const seats = state.players.length
  return ((to - from - 1 + seats) % seats) + 1
}

/** Whether handing the turn from one seat to another reaches or passes the seat of the first player of the game. */
export function opensNewRound(state: PublicGameState, previous: number, next: number): boolean {
  return seatsAhead(state, previous, state.firstPlayerIndex) <= seatsAhead(state, previous, next)
}

function nextPlayerIndex(state: PublicGameState): number | null {
  const next = playersFrom(state, state.currentPlayerIndex + 1)[0]
  return next ? state.players.indexOf(next) : null
}

export function advanceToNextPlayer(ctx: Ctx): void {
  const state = ctx.state
  const nextIndex = nextPlayerIndex(state)
  const next = nextIndex === null ? undefined : state.players[nextIndex]
  if (nextIndex === null || !next) return
  if (opensNewRound(state, state.currentPlayerIndex, nextIndex)) state.turnNumber += 1
  state.currentPlayerIndex = nextIndex
  state.doublesInARow = 0
  state.tradeLimits.thisTurn = {}
  state.phase = { kind: 'preRoll' }
  emit(ctx, { type: 'turnStarted', playerId: next.id, turnNumber: state.turnNumber })
}

function declareWinner(ctx: Ctx, playerId: PlayerId, reason: WinReason): void {
  ctx.state.winner = playerId
  ctx.state.winReason = reason
  ctx.state.phase = { kind: 'gameOver' }
  emit(ctx, { type: 'gameWon', playerId, reason })
}

/** Declares the winner when a single solvent player remains; returns true if the game is over. */
export function checkLastStanding(ctx: Ctx): boolean {
  const solvent = ctx.state.players.filter((p) => !p.bankrupt)
  const winner = solvent[0]
  if (solvent.length !== 1 || !winner) return false
  declareWinner(ctx, winner.id, 'lastStanding')
  return true
}

function lastTurnOfLimit(state: PublicGameState): boolean {
  const { turnLimit } = state.settings
  const nextIndex = nextPlayerIndex(state)
  if (turnLimit === null || nextIndex === null || state.turnNumber < turnLimit) return false
  return opensNewRound(state, state.currentPlayerIndex, nextIndex)
}

/** Checks the end conditions in order at the end of a turn: last solvent player, net worth target, turn limit; returns true if the game is over. */
export function checkVictory(ctx: Ctx): boolean {
  if (checkLastStanding(ctx)) return true
  const state = ctx.state
  const leader = standings(state)[0]
  if (!leader) return false
  const target = state.settings.netWorthTarget
  if (target !== null && leader.netWorth >= target) {
    declareWinner(ctx, leader.playerId, 'netWorthTarget')
    return true
  }
  if (lastTurnOfLimit(state)) {
    declareWinner(ctx, leader.playerId, 'turnLimit')
    return true
  }
  return false
}
