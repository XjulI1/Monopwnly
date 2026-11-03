import { BOARD, type DeckKind, type GameState, type Ownership, type PublicGameState, type SquareId } from '../engine'

/** What an AI may know of a game: the public state, with each deck reduced to its size. */
export type PlayerView = PublicGameState & { deckSizes: Record<DeckKind, number> }

function ownershipInBoardOrder(state: GameState): Record<SquareId, Ownership> {
  const ownership: Record<SquareId, Ownership> = {}
  for (const square of BOARD) {
    const own = state.ownership[square.id]
    if (own) ownership[square.id] = { owner: own.owner, mortgaged: own.mortgaged, level: own.level }
  }
  return ownership
}

/** Projects a game state on its public information, as a copy whose JSON form only depends on that information. */
export function playerView(state: GameState): PlayerView {
  return {
    settings: structuredClone(state.settings),
    boardId: state.boardId,
    players: structuredClone(state.players),
    ownership: ownershipInBoardOrder(state),
    bankStock: { backdoors: state.bankStock.backdoors, rootkits: state.bankStock.rootkits },
    deckSizes: { exploit: state.decks.exploit.length, patch: state.decks.patch.length },
    currentPlayerIndex: state.currentPlayerIndex,
    doublesInARow: state.doublesInARow,
    turnNumber: state.turnNumber,
    lastRoll: state.lastRoll ? [state.lastRoll[0], state.lastRoll[1]] : null,
    phase: structuredClone(state.phase),
    winner: state.winner,
  }
}
