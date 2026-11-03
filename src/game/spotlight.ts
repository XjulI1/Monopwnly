import type { GameState, Player } from '../engine'

/** Player the HUD puts forward: the winner once the game is over, otherwise the player whose turn it is. */
export function spotlightPlayer(state: GameState): Player | null {
  const id = state.winner ?? state.players[state.currentPlayerIndex]?.id
  return state.players.find((player) => player.id === id) ?? null
}
