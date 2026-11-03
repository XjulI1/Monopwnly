import { QUARANTINE_INDEX, type GameEvent, type GameState, type PlayerId } from '../../engine'

/** Board index of each player, kept up to date while the events of one action are read in order. */
export type PositionTracker = {
  at: (playerId: PlayerId | 'bank') => number
  follow: (event: GameEvent) => void
}

/** Follows the players from their squares before an action. */
export function trackPositions(before: GameState): PositionTracker {
  const positions = new Map(before.players.map((p) => [p.id, p.position]))
  return {
    at: (playerId) => positions.get(playerId) ?? 0,
    follow: (event) => {
      if (event.type === 'sentToQuarantine') positions.set(event.playerId, QUARANTINE_INDEX)
      if (event.type !== 'moved') return
      const last = event.path.at(-1)
      if (last !== undefined) positions.set(event.playerId, last)
    },
  }
}
