import { BOARD_SIZE, QUARANTINE_INDEX, SALARY, squareAt } from './board/squares'
import { drawCard } from './cards'
import { currentPlayer, emit, fail, getPlayer, transfer, type Ctx } from './context'
import { collectPot } from './dmzPot'
import { charge } from './payments'
import { attemptQuarantineExit } from './quarantine'
import { rentFor, type RentModifier } from './rent'
import { rollTwoDice } from './rng'
import { enterPostRoll } from './turn'
import type { CornerKind, GameState, PlayerId, QuarantineReason } from './types'

export function rollDice(ctx: Ctx): void {
  const state = ctx.state
  if (state.phase.kind === 'postRoll' && !state.phase.mayRollAgain) {
    fail('WRONG_PHASE', 'Vous avez déjà lancé les dés ce tour-ci.')
  }
  const player = currentPlayer(state)
  const dice = rollTwoDice(state)
  state.lastRoll = dice
  if (player.quarantine) {
    attemptQuarantineExit(ctx, dice)
    return
  }
  emit(ctx, { type: 'diceRolled', playerId: player.id, dice, purpose: 'move' })
  state.doublesInARow = dice[0] === dice[1] ? state.doublesInARow + 1 : 0
  if (state.doublesInARow === 3) {
    sendToQuarantine(ctx, player.id, 'tripleDouble')
    enterPostRoll(ctx)
    return
  }
  moveForward(ctx, dice[0] + dice[1])
  resolveLanding(ctx)
}

export function moveForward(ctx: Ctx, steps: number): void {
  const player = currentPlayer(ctx.state)
  const path = Array.from({ length: steps }, (_, i) => (player.position + i + 1) % BOARD_SIZE)
  player.position = path[path.length - 1] ?? player.position
  emit(ctx, { type: 'moved', playerId: player.id, path, backward: false })
  if (path.includes(0)) {
    emit(ctx, { type: 'passedBoot', playerId: player.id })
    transfer(ctx, 'bank', player.id, SALARY, 'salary')
  }
}

export function moveForwardTo(ctx: Ctx, target: number): void {
  const position = currentPlayer(ctx.state).position
  const steps = (target - position + BOARD_SIZE) % BOARD_SIZE
  moveForward(ctx, steps === 0 ? BOARD_SIZE : steps)
}

export function moveBackward(ctx: Ctx, steps: number): void {
  const player = currentPlayer(ctx.state)
  const path = Array.from({ length: steps }, (_, i) => (player.position - i - 1 + BOARD_SIZE * 2) % BOARD_SIZE)
  player.position = path[path.length - 1] ?? player.position
  emit(ctx, { type: 'moved', playerId: player.id, path, backward: true })
}

export function moveBackwardTo(ctx: Ctx, target: number): void {
  const position = currentPlayer(ctx.state).position
  moveBackward(ctx, (position - target + BOARD_SIZE) % BOARD_SIZE)
}

export function sendToQuarantine(ctx: Ctx, playerId: PlayerId, reason: QuarantineReason): void {
  const player = getPlayer(ctx.state, playerId)
  player.position = QUARANTINE_INDEX
  player.quarantine = { failedAttempts: 0 }
  if (currentPlayer(ctx.state).id === playerId) ctx.state.doublesInARow = 0
  emit(ctx, { type: 'sentToQuarantine', playerId, reason })
}

function ownerCollectsNoRent(state: GameState, ownerId: PlayerId): boolean {
  return state.settings.noRentInQuarantine && getPlayer(state, ownerId).quarantine !== null
}

function payBootBonus(ctx: Ctx, playerId: PlayerId): void {
  if (!ctx.state.settings.doubleBootBonus) return
  emit(ctx, { type: 'bootBonus', playerId })
  transfer(ctx, 'bank', playerId, SALARY, 'salary')
}

function resolveCorner(ctx: Ctx, corner: CornerKind): void {
  const playerId = currentPlayer(ctx.state).id
  if (corner === 'boot') payBootBonus(ctx, playerId)
  if (corner === 'detected') sendToQuarantine(ctx, playerId, 'detected')
  if (corner === 'dmz') collectPot(ctx, playerId)
}

/** Resolves the arrival of the current player on their square, then enters postRoll or a waiting phase. */
export function resolveLanding(ctx: Ctx, modifier: RentModifier = 'none'): void {
  const state = ctx.state
  const player = currentPlayer(state)
  const square = squareAt(player.position)
  switch (square.kind) {
    case 'corner':
      resolveCorner(ctx, square.corner)
      enterPostRoll(ctx)
      return
    case 'tax':
      charge(ctx, player.id, [{ to: 'bank', amount: square.amount, reason: 'tax' }], { kind: 'postRoll' })
      return
    case 'card':
      drawCard(ctx, square.deck)
      return
    default: {
      const own = state.ownership[square.id]
      if (!own) {
        state.phase = { kind: 'buyDecision', squareId: square.id }
        return
      }
      if (own.owner === player.id || own.mortgaged) {
        enterPostRoll(ctx)
        return
      }
      if (ownerCollectsNoRent(state, own.owner)) {
        emit(ctx, { type: 'rentWaived', playerId: player.id, ownerId: own.owner, squareId: square.id })
        enterPostRoll(ctx)
        return
      }
      let diceTotal = state.lastRoll ? state.lastRoll[0] + state.lastRoll[1] : 0
      if (square.kind === 'service' && modifier === 'serviceTimesTen') {
        const dice = rollTwoDice(state)
        emit(ctx, { type: 'diceRolled', playerId: player.id, dice, purpose: 'serviceRent' })
        diceTotal = dice[0] + dice[1]
      }
      const rent = rentFor(state, square.id, diceTotal, modifier)
      charge(ctx, player.id, [{ to: own.owner, amount: rent, reason: 'rent' }], { kind: 'postRoll' })
    }
  }
}
