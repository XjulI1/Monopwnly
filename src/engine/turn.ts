import { currentPlayer, emit, fail, playersFrom, type Ctx } from './context'

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
  advanceToNextPlayer(ctx)
}

export function advanceToNextPlayer(ctx: Ctx): void {
  const state = ctx.state
  const previous = state.currentPlayerIndex
  const next = playersFrom(state, previous + 1)[0]
  if (!next) return
  const nextIndex = state.players.indexOf(next)
  if (nextIndex <= previous) state.turnNumber += 1
  state.currentPlayerIndex = nextIndex
  state.doublesInARow = 0
  state.tradeLimits.thisTurn = {}
  state.phase = { kind: 'preRoll' }
  emit(ctx, { type: 'turnStarted', playerId: next.id, turnNumber: state.turnNumber })
}

/** Declares the winner when a single solvent player remains; returns true if the game is over. */
export function checkVictory(ctx: Ctx): boolean {
  const solvent = ctx.state.players.filter((p) => !p.bankrupt)
  if (solvent.length !== 1) return false
  const winner = solvent[0]
  if (!winner) return false
  ctx.state.winner = winner.id
  ctx.state.phase = { kind: 'gameOver' }
  emit(ctx, { type: 'gameWon', playerId: winner.id })
  return true
}
