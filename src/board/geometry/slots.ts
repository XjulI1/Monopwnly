import { layout, toBoard, type BoardPoint, type TileLayout } from './layout'

/** Radius of the base of a pawn, in world units. */
export const PAWN_RADIUS = 0.9

/** Share of the depth of a square taken by the family band, on the inner edge. */
export const BAND_SHARE = 0.22

const QUARANTINE_INDEX = 10

export type BuildingSlot = { kind: 'backdoor' | 'rootkit'; position: BoardPoint }

function grid(columns: number, rows: number, area: { x0: number; x1: number; z0: number; z1: number }): BoardPoint[] {
  const points: BoardPoint[] = []
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      points.push({
        x: area.x0 + ((column + 0.5) * (area.x1 - area.x0)) / columns,
        z: area.z0 + ((row + 0.5) * (area.z1 - area.z0)) / rows,
      })
    }
  }
  return points
}

function freeArea(tile: TileLayout) {
  const halfAlong = tile.along / 2
  const halfAcross = tile.across / 2
  const bandEdge = tile.corner ? -halfAcross : -halfAcross + tile.across * BAND_SHARE
  return { x0: -halfAlong, x1: halfAlong, z0: bandEdge, z1: halfAcross }
}

function localPawnSlots(tile: TileLayout, quarantined: boolean): BoardPoint[] {
  const half = tile.across / 2
  if (tile.index === QUARANTINE_INDEX) {
    return quarantined
      ? grid(3, 2, { x0: -half, x1: half * 0.2, z0: -half, z1: half * 0.1 })
      : [
          ...grid(3, 1, { x0: -half, x1: half, z0: half * 0.45, z1: half }),
          ...grid(1, 3, { x0: half * 0.45, x1: half, z0: -half, z1: half * 0.45 }),
        ]
  }
  return tile.corner ? grid(3, 2, freeArea(tile)) : grid(2, 3, freeArea(tile))
}

/** Positions of `count` pawns on a square, in play order; on square 10, quarantined pawns use the cell. */
export function pawnSlots(index: number, count: number, quarantined: boolean): BoardPoint[] {
  const tile = layout(index)
  return localPawnSlots(tile, quarantined)
    .slice(0, count)
    .map((local) => toBoard(tile, local))
}

/** Positions of the buildings of a system at a building level (1 to 4 backdoors, 5 a rootkit). */
export function buildingSlots(index: number, level: number): BuildingSlot[] {
  if (level <= 0) return []
  const tile = layout(index)
  const bandZ = -tile.across / 2 + (tile.across * BAND_SHARE) / 2
  if (level >= 5) return [{ kind: 'rootkit', position: toBoard(tile, { x: 0, z: bandZ }) }]
  const spacing = tile.along / 4.5
  return Array.from({ length: level }, (_, i) => ({
    kind: 'backdoor' as const,
    position: toBoard(tile, { x: (i - (level - 1) / 2) * spacing, z: bandZ }),
  }))
}

/** Point a pawn goes through when it travels across a square. */
export function travelPoint(index: number): BoardPoint {
  const tile = layout(index)
  const area = freeArea(tile)
  return toBoard(tile, { x: 0, z: (area.z0 + area.z1) / 2 })
}
