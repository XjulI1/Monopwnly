import { cardById } from './board/cards'
import { BOARD, BOARD_SIZE } from './board/squares'
import { currentPlayer, emit, otherPlayersInOrder, transfer, type Ctx } from './context'
import { moveBackward, moveBackwardTo, moveForwardTo, resolveLanding, sendToQuarantine } from './movement'
import { charge, collectFrom } from './payments'
import { enterPostRoll } from './turn'
import type { DeckKind, GameState, PlayerId } from './types'

function nextSquareOfKind(position: number, kind: 'node' | 'service'): number {
  for (let offset = 1; offset <= BOARD_SIZE; offset++) {
    const index = (position + offset) % BOARD_SIZE
    if (BOARD[index]?.kind === kind) return index
  }
  return position
}

/** Number of backdoors and rootkits a player has on the board. */
export function buildingCounts(state: GameState, playerId: PlayerId): { backdoors: number; rootkits: number } {
  let backdoors = 0
  let rootkits = 0
  for (const own of Object.values(state.ownership)) {
    if (own.owner !== playerId) continue
    if (own.level === 5) rootkits += 1
    else backdoors += own.level
  }
  return { backdoors, rootkits }
}

export function drawCard(ctx: Ctx, deck: DeckKind): void {
  const state = ctx.state
  const player = currentPlayer(state)
  const cardId = state.decks[deck].shift()
  if (!cardId) {
    enterPostRoll(ctx)
    return
  }
  emit(ctx, { type: 'cardDrawn', playerId: player.id, deck, cardId })
  const effect = cardById(cardId).effect
  if (effect.kind === 'decryptionKey') {
    player.keys.push(cardId)
    enterPostRoll(ctx)
    return
  }
  state.decks[deck].push(cardId)

  switch (effect.kind) {
    case 'gain':
      transfer(ctx, 'bank', player.id, effect.amount, 'card')
      enterPostRoll(ctx)
      return
    case 'pay':
      charge(ctx, player.id, [{ to: 'bank', amount: effect.amount, reason: 'card' }], { kind: 'postRoll' })
      return
    case 'payPerBuilding': {
      const { backdoors, rootkits } = buildingCounts(state, player.id)
      const amount = backdoors * effect.perBackdoor + rootkits * effect.perRootkit
      charge(ctx, player.id, [{ to: 'bank', amount, reason: 'card' }], { kind: 'postRoll' })
      return
    }
    case 'payEachPlayer': {
      const payments = otherPlayersInOrder(state).map((p) => ({ to: p.id, amount: effect.amount, reason: 'card' as const }))
      charge(ctx, player.id, payments, { kind: 'postRoll' })
      return
    }
    case 'collectFromEachPlayer':
      collectFrom(ctx, player.id, otherPlayersInOrder(state).map((p) => p.id), effect.amount)
      return
    case 'goToQuarantine':
      sendToQuarantine(ctx, player.id, 'card')
      enterPostRoll(ctx)
      return
    case 'moveTo':
      moveForwardTo(ctx, effect.target)
      resolveLanding(ctx)
      return
    case 'moveBack':
      moveBackward(ctx, effect.steps)
      resolveLanding(ctx)
      return
    case 'moveBackTo':
      moveBackwardTo(ctx, effect.target)
      resolveLanding(ctx)
      return
    case 'nextNode':
      moveForwardTo(ctx, nextSquareOfKind(player.position, 'node'))
      resolveLanding(ctx, 'double')
      return
    case 'nextService':
      moveForwardTo(ctx, nextSquareOfKind(player.position, 'service'))
      resolveLanding(ctx, 'serviceTimesTen')
  }
}
