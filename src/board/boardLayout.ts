/** Height of a square tile, in world units. */
export const TILE_HEIGHT = 0.8

/** Extra lift of the hovered square. */
export const HOVER_LIFT = 0.25

/** Thickness of the owner frame around a square. */
export const FRAME_THICKNESS = 0.35

/** Arc height of a pawn hopping from one square to the next. */
export const HOP_HEIGHT = 1.6

/** Brightness factor applied to the label of a dimmed or mortgaged square. */
export const DIMMED_BRIGHTNESS = 0.35

/** Segments of a square frame in the local frame of a tile, dashed for a mortgaged square. */
export function frameSegments(
  along: number,
  across: number,
  dashed: boolean,
): { x: number; z: number; width: number; depth: number }[] {
  const t = FRAME_THICKNESS
  const sides = [
    { x: 0, z: -across / 2 + t / 2, length: along, horizontal: true },
    { x: 0, z: across / 2 - t / 2, length: along, horizontal: true },
    { x: -along / 2 + t / 2, z: 0, length: across - 2 * t, horizontal: false },
    { x: along / 2 - t / 2, z: 0, length: across - 2 * t, horizontal: false },
  ]
  return sides.flatMap((side) => {
    const pieces = dashed ? Math.max(3, Math.round(side.length / 1.4)) : 1
    const step = side.length / pieces
    const size = dashed ? step * 0.55 : side.length
    return Array.from({ length: pieces }, (_, i) => {
      const offset = -side.length / 2 + step * (i + 0.5)
      return side.horizontal
        ? { x: side.x + offset, z: side.z, width: size, depth: t }
        : { x: side.x, z: side.z + offset, width: t, depth: size }
    })
  })
}
