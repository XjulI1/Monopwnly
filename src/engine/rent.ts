import { FAMILY_SQUARES, NODE_RENTS, SERVICE_MULTIPLIERS, purchasableById } from './board/squares'
import type { GameState, SquareId } from './types'

export type RentModifier = 'none' | 'double' | 'serviceTimesTen'

function countOwnedOfKind(state: GameState, owner: string, kind: 'node' | 'service'): number {
  return Object.entries(state.ownership).filter(
    ([id, own]) => own.owner === owner && purchasableById(id)?.kind === kind,
  ).length
}

/** Returns true when the player owns every system of the family of the given square. */
export function ownsWholeFamily(state: GameState, owner: string, squareId: SquareId): boolean {
  const square = purchasableById(squareId)
  if (!square || square.kind !== 'system') return false
  return FAMILY_SQUARES[square.family].every((id) => state.ownership[id]?.owner === owner)
}

/** Rent due on an owned, active square; 0 for a free or mortgaged square. */
export function rentFor(
  state: GameState,
  squareId: SquareId,
  diceTotal: number,
  modifier: RentModifier = 'none',
): number {
  const square = purchasableById(squareId)
  const own = state.ownership[squareId]
  if (!square || !own || own.mortgaged) return 0
  if (square.kind === 'system') {
    if (own.level > 0) return square.rents[own.level]
    return ownsWholeFamily(state, own.owner, squareId) ? square.rents[0] * 2 : square.rents[0]
  }
  if (square.kind === 'node') {
    const count = countOwnedOfKind(state, own.owner, 'node')
    const rent = NODE_RENTS[count - 1] ?? 0
    return modifier === 'double' ? rent * 2 : rent
  }
  if (modifier === 'serviceTimesTen') return diceTotal * 10
  const count = countOwnedOfKind(state, own.owner, 'service')
  return diceTotal * (SERVICE_MULTIPLIERS[count - 1] ?? 0)
}
