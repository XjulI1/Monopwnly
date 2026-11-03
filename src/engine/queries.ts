import { MIN_BID, purchasableById } from './board/squares'
import { currentPlayer, getPlayer } from './context'
import { buildProblem, mortgageProblem, sellProblem, unmortgageProblem } from './development'
import { rentFor } from './rent'
import type { Action, PlayerId, PublicGameState, SquareId } from './types'

/** The player the game is waiting for: the bidder during an auction, the debtor during a debt, otherwise the current player. */
export function expectedActor(state: PublicGameState): PlayerId | null {
  const phase = state.phase
  if (phase.kind === 'gameOver') return null
  if (phase.kind === 'auction') return phase.nextBidder
  if (phase.kind === 'debt') return phase.debtor
  return currentPlayer(state).id
}

/** Squares owned by the player, in board order of their identifiers in the ownership record. */
export function ownedSquares(state: PublicGameState, playerId: PlayerId): SquareId[] {
  return Object.keys(state.ownership).filter((id) => state.ownership[id]?.owner === playerId)
}

/** Squares where the player could add a backdoor or a rootkit right now, ignoring the phase. */
export function buildableSquares(state: PublicGameState, playerId: PlayerId): SquareId[] {
  return ownedSquares(state, playerId).filter((id) => buildProblem(state, playerId, id) === null)
}

/** Squares where the player could sell a building level right now, ignoring the phase. */
export function sellableSquares(state: PublicGameState, playerId: PlayerId): SquareId[] {
  return ownedSquares(state, playerId).filter((id) => sellProblem(state, playerId, id) === null)
}

/** Squares the player could mortgage right now, ignoring the phase. */
export function mortgageableSquares(state: PublicGameState, playerId: PlayerId): SquareId[] {
  return ownedSquares(state, playerId).filter((id) => mortgageProblem(state, playerId, id) === null)
}

/** Mortgaged squares the player could reactivate right now, ignoring the phase. */
export function unmortgageableSquares(state: PublicGameState, playerId: PlayerId): SquareId[] {
  return ownedSquares(state, playerId).filter((id) => unmortgageProblem(state, playerId, id) === null)
}

/** Net worth of a player: cash, plus the price of the active squares, the mortgage value of the mortgaged ones and the cost of the buildings. */
export function netWorth(state: PublicGameState, playerId: PlayerId): number {
  let total = getPlayer(state, playerId).cash
  for (const id of ownedSquares(state, playerId)) {
    const square = purchasableById(id)
    const own = state.ownership[id]
    if (!square || !own) continue
    total += own.mortgaged ? square.mortgageValue : square.price
    if (square.kind === 'system') total += own.level * square.backdoorCost
  }
  return total
}

/** Rent an opponent would pay by stopping on the square (services use the given dice total, 7 by default). */
export function rentIfLanded(state: PublicGameState, squareId: SquareId, diceTotal = 7): number {
  return rentFor(state, squareId, diceTotal)
}

type SquareActionType = 'buildBackdoor' | 'sellBackdoor' | 'mortgage' | 'unmortgage'

/** Square actions the expected player can take in the current phase, already validated. */
export function squareActions(state: PublicGameState): Action[] {
  const playerId = expectedActor(state)
  if (!playerId) return []
  const kind = state.phase.kind
  const types: SquareActionType[] =
    kind === 'preRoll' || kind === 'postRoll'
      ? ['buildBackdoor', 'sellBackdoor', 'mortgage', 'unmortgage']
      : kind === 'debt'
        ? ['sellBackdoor', 'mortgage']
        : []
  const lists: Record<SquareActionType, SquareId[]> = {
    buildBackdoor: types.includes('buildBackdoor') ? buildableSquares(state, playerId) : [],
    sellBackdoor: types.includes('sellBackdoor') ? sellableSquares(state, playerId) : [],
    mortgage: types.includes('mortgage') ? mortgageableSquares(state, playerId) : [],
    unmortgage: types.includes('unmortgage') ? unmortgageableSquares(state, playerId) : [],
  }
  return types.flatMap((type) => lists[type].map((squareId) => ({ type, playerId, squareId })))
}

/** Candidate actions of the expected player other than square actions, before validation; a bid is proposed at its minimum amount. */
export function flowCandidates(state: PublicGameState): Action[] {
  const playerId = expectedActor(state)
  if (!playerId) return []
  const phase = state.phase
  switch (phase.kind) {
    case 'preRoll':
      return [
        { type: 'rollDice', playerId },
        { type: 'payQuarantineFine', playerId },
        { type: 'useDecryptionKey', playerId },
      ]
    case 'postRoll':
      return [
        { type: 'rollDice', playerId },
        { type: 'endTurn', playerId },
      ]
    case 'buyDecision':
      return [
        { type: 'buyProperty', playerId },
        { type: 'declineProperty', playerId },
      ]
    case 'auction':
      return [
        { type: 'placeBid', playerId, amount: phase.highBidder === null ? MIN_BID : phase.highBid + 1 },
        { type: 'passBid', playerId },
      ]
    case 'debt':
      return [
        { type: 'payDebt', playerId },
        { type: 'declareBankruptcy', playerId },
      ]
    case 'gameOver':
      return []
  }
}
