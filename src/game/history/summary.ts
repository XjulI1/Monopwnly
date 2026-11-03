import { FAMILY_NAMES, purchasableById, squareById, type GameState, type PlayerId, type SquareId } from '../../engine'
import { ofName } from './format'
import type { Bankruptcy, GameStatistics } from './statistics'

/** Value of a player round after round, for a chart. */
export type WealthLine = { id: PlayerId; name: string; color: string; points: { turn: number; value: number }[] }

/** A square and the rent it earned during the game. */
export type RentedSquare = { squareId: SquareId; name: string; family: string; total: number }

/** Number of squares in the ranking of the most profitable ones. */
export const TOP_SQUARES = 5

/** Players from the winner to the first one who went bankrupt. */
export function ranking(state: GameState, stats: GameStatistics): PlayerId[] {
  const rankOf = (id: PlayerId) => stats.players[id]?.bankruptcy?.rank ?? 0
  const others = state.players.map((p) => p.id).filter((id) => id !== state.winner)
  const standing = others.filter((id) => rankOf(id) === 0)
  const ruined = others.filter((id) => rankOf(id) > 0).sort((a, b) => rankOf(b) - rankOf(a))
  return [...(state.winner ? [state.winner] : []), ...standing, ...ruined]
}

/** When and to whom a player went bankrupt, e.g. `Faillite au tour 23 au profit d’Alice`. */
export function bankruptcyLine(state: GameState, bankruptcy: Bankruptcy | null): string | null {
  if (!bankruptcy) return null
  const { creditor } = bankruptcy
  const name = creditor === 'bank' ? 'la banque' : (state.players.find((p) => p.id === creditor)?.name ?? creditor)
  return `Faillite au tour ${bankruptcy.turn} au profit ${ofName(name)}`
}

/** One line per player, in the given order, with their cash or net worth at the start of each round they played. */
export function wealthSeries(state: GameState, stats: GameStatistics, order: readonly PlayerId[], measure: 'cash' | 'netWorth'): WealthLine[] {
  return order.flatMap((id) => {
    const player = state.players.find((p) => p.id === id)
    if (!player) return []
    const points = stats.rounds.flatMap((round) => {
      const reading = round.players.find((p) => p.playerId === id)
      return reading ? [{ turn: round.turn, value: reading[measure] }] : []
    })
    return [{ id, name: player.name, color: player.color, points }]
  })
}

function familyOf(squareId: SquareId): string {
  const square = purchasableById(squareId)
  if (square?.kind === 'system') return FAMILY_NAMES[square.family]
  return square?.kind === 'node' ? 'Nœuds' : 'Services'
}

/** The squares that earned the most rent, from the most profitable one. */
export function topSquares(stats: GameStatistics, count = TOP_SQUARES): RentedSquare[] {
  return Object.entries(stats.squareRents)
    .filter(([, total]) => total > 0)
    .sort(([a, x], [b, y]) => y - x || squareById(a).index - squareById(b).index)
    .slice(0, count)
    .map(([squareId, total]) => ({ squareId, name: squareById(squareId).name, family: familyOf(squareId), total }))
}
