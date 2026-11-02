import { cardById } from './board/cards'
import { MAX_QUARANTINE_ATTEMPTS, QUARANTINE_FINE } from './board/squares'
import { currentPlayer, emit, fail, transfer, type Ctx } from './context'
import { moveForward, resolveLanding } from './movement'
import { charge } from './payments'
import { enterPostRoll } from './turn'

function requireQuarantine(ctx: Ctx) {
  const player = currentPlayer(ctx.state)
  if (!player.quarantine) fail('NOT_IN_QUARANTINE', 'Vous n’êtes pas en quarantaine.')
  return player
}

export function payQuarantineFine(ctx: Ctx): void {
  const player = requireQuarantine(ctx)
  if (player.cash < QUARANTINE_FINE) {
    fail('INSUFFICIENT_FUNDS', `Il faut ${QUARANTINE_FINE} Ᵽ pour sortir de quarantaine.`)
  }
  transfer(ctx, player.id, 'bank', QUARANTINE_FINE, 'quarantineFine')
  player.quarantine = null
  emit(ctx, { type: 'leftQuarantine', playerId: player.id, method: 'fine' })
}

export function useDecryptionKey(ctx: Ctx): void {
  const player = requireQuarantine(ctx)
  const key = player.keys.shift()
  if (!key) fail('NO_KEY', 'Vous n’avez pas de Clé de déchiffrement.')
  ctx.state.decks[cardById(key).deck].push(key)
  player.quarantine = null
  emit(ctx, { type: 'keyUsed', playerId: player.id, cardId: key })
  emit(ctx, { type: 'leftQuarantine', playerId: player.id, method: 'key' })
}

export function attemptQuarantineExit(ctx: Ctx, dice: [number, number]): void {
  const player = currentPlayer(ctx.state)
  const quarantine = player.quarantine
  if (!quarantine) return
  emit(ctx, { type: 'diceRolled', playerId: player.id, dice, purpose: 'quarantine' })
  const total = dice[0] + dice[1]
  ctx.state.doublesInARow = 0
  if (dice[0] === dice[1]) {
    player.quarantine = null
    emit(ctx, { type: 'leftQuarantine', playerId: player.id, method: 'double' })
    moveForward(ctx, total)
    resolveLanding(ctx)
    return
  }
  const failedAttempts = quarantine.failedAttempts + 1
  emit(ctx, { type: 'quarantineAttemptFailed', playerId: player.id, failedAttempts })
  if (failedAttempts < MAX_QUARANTINE_ATTEMPTS) {
    quarantine.failedAttempts = failedAttempts
    enterPostRoll(ctx)
    return
  }
  player.quarantine = null
  emit(ctx, { type: 'leftQuarantine', playerId: player.id, method: 'forcedFine' })
  charge(ctx, player.id, [{ to: 'bank', amount: QUARANTINE_FINE, reason: 'quarantineFine' }], {
    kind: 'moveAfterFine',
    steps: total,
  })
}
