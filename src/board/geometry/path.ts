import type { BoardPoint } from './layout'
import { travelPoint } from './slots'

/** Waypoints of a pawn moving through the given squares, in the given order. */
export function movePath(squares: readonly number[]): BoardPoint[] {
  return squares.map(travelPoint)
}
