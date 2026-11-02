/** A point on the board plane (x to the right, z towards the camera). */
export type BoardPoint = { x: number; z: number }

/** Placement of a square on the board. */
export type TileLayout = {
  index: number
  /** 0 bottom (Boot to Quarantaine), 1 left, 2 top, 3 right. */
  side: 0 | 1 | 2 | 3
  corner: boolean
  center: BoardPoint
  /** Extent along the world x axis. */
  width: number
  /** Extent along the world z axis. */
  depth: number
  /** Rotation around the vertical axis that turns the tile content towards the outside of the board. */
  rotation: number
  /** Unit vector pointing from the tile towards the outside of the board. */
  outward: BoardPoint
  /** Extent of the tile along its side of the board (local x). */
  along: number
  /** Extent of the tile from the inner edge to the outer edge (local z). */
  across: number
}

/** Side of the square board, in world units. */
export const BOARD_SIDE = 100

/** Ratio between the depth of a square and its width, as on a classic board game. */
const CORNER_TO_SQUARE = 1.6

/** Width of an ordinary square along its side. */
export const SQUARE_WIDTH = BOARD_SIDE / (2 * CORNER_TO_SQUARE + 9)

/** Side of a corner square, also the depth of an ordinary square. */
export const CORNER_SIZE = SQUARE_WIDTH * CORNER_TO_SQUARE

const HALF = BOARD_SIDE / 2
const EDGE = HALF - CORNER_SIZE / 2
const ROTATIONS = [0, -Math.PI / 2, Math.PI, Math.PI / 2] as const

function offsetAlongSide(position: number): number {
  return HALF - CORNER_SIZE - (position - 0.5) * SQUARE_WIDTH
}

function centerOf(side: number, position: number): BoardPoint {
  const corner = position === 0
  const offset = corner ? EDGE : offsetAlongSide(position)
  switch (side) {
    case 0:
      return { x: offset, z: EDGE }
    case 1:
      return { x: -EDGE, z: offset }
    case 2:
      return { x: -offset, z: -EDGE }
    default:
      return { x: EDGE, z: -offset }
  }
}

/** Layout of the square at a board index (0 to 39). */
export function layout(index: number): TileLayout {
  const side = Math.floor(index / 10) as 0 | 1 | 2 | 3
  const position = index % 10
  const corner = position === 0
  const rotation = ROTATIONS[side]
  const along = corner ? CORNER_SIZE : SQUARE_WIDTH
  const across = CORNER_SIZE
  const horizontal = side === 0 || side === 2
  return {
    index,
    side,
    corner,
    center: centerOf(side, position),
    width: horizontal ? along : across,
    depth: horizontal ? across : along,
    rotation,
    outward: { x: Math.round(Math.sin(rotation)), z: Math.round(Math.cos(rotation)) },
    along,
    across,
  }
}

/** Layouts of the 40 squares, in board order. */
export function tiles(): TileLayout[] {
  return Array.from({ length: 40 }, (_, i) => layout(i))
}

/** Converts a point in the local frame of a tile (local z towards the outside) to the board plane. */
export function toBoard(tile: TileLayout, local: BoardPoint): BoardPoint {
  const cos = Math.cos(tile.rotation)
  const sin = Math.sin(tile.rotation)
  return {
    x: tile.center.x + local.x * cos + local.z * sin,
    z: tile.center.z - local.x * sin + local.z * cos,
  }
}

/** Index of the square under a board point, or null in the center or outside the board. */
export function squareAtPoint(point: BoardPoint): number | null {
  for (const tile of tiles()) {
    if (
      Math.abs(point.x - tile.center.x) <= tile.width / 2 &&
      Math.abs(point.z - tile.center.z) <= tile.depth / 2
    ) {
      return tile.index
    }
  }
  return null
}
