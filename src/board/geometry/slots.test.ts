import { describe, expect, it } from 'vitest'
import { layout, type BoardPoint } from './layout'
import { PAWN_RADIUS, buildingSlots, pawnSlots, travelPoint } from './slots'

function inside(index: number, point: BoardPoint, margin = 0): boolean {
  const tile = layout(index)
  return (
    Math.abs(point.x - tile.center.x) <= tile.width / 2 - margin &&
    Math.abs(point.z - tile.center.z) <= tile.depth / 2 - margin
  )
}

function apart(points: BoardPoint[], distance: number): boolean {
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i] as BoardPoint
      const b = points[j] as BoardPoint
      if (Math.hypot(a.x - b.x, a.z - b.z) < distance) return false
    }
  }
  return true
}

describe('pawn slots', () => {
  it('places 1 to 6 pawns without overlap inside the tile', () => {
    for (const index of [0, 1, 7, 13, 20, 25, 30, 39]) {
      for (let count = 1; count <= 6; count++) {
        const slots = pawnSlots(index, count, false)
        expect(slots).toHaveLength(count)
        expect(apart(slots, 2 * PAWN_RADIUS)).toBe(true)
        for (const slot of slots) expect(inside(index, slot, PAWN_RADIUS)).toBe(true)
      }
    }
  })

  it('keeps a stable order: the first slots do not move when pawns are added', () => {
    const three = pawnSlots(16, 3, false)
    const five = pawnSlots(16, 5, false)
    expect(five.slice(0, 3)).toEqual(three)
  })

  it('separates quarantined pawns from visitors on square 10', () => {
    const cell = pawnSlots(10, 6, true)
    const visit = pawnSlots(10, 6, false)
    expect(apart([...cell, ...visit], 2 * PAWN_RADIUS)).toBe(true)
    for (const slot of [...cell, ...visit]) expect(inside(10, slot, PAWN_RADIUS)).toBe(true)
  })
})

describe('building slots', () => {
  it('aligns 1 to 4 backdoors on the family band', () => {
    for (const index of [1, 14, 24, 37]) {
      for (let level = 1; level <= 4; level++) {
        const slots = buildingSlots(index, level)
        expect(slots).toHaveLength(level)
        for (const slot of slots) expect(inside(index, slot.position)).toBe(true)
        expect(slots.every((s) => s.kind === 'backdoor')).toBe(true)
        const tile = layout(index)
        const outward = slots.map((s) => (s.position.x - tile.center.x) * tile.outward.x + (s.position.z - tile.center.z) * tile.outward.z)
        for (const d of outward) expect(d).toBeCloseTo(outward[0] as number)
        expect(outward[0]).toBeLessThan(0)
        expect(apart(slots.map((s) => s.position), 1)).toBe(true)
      }
    }
  })

  it('centers a single rootkit on the band', () => {
    const slots = buildingSlots(16, 5)
    expect(slots).toHaveLength(1)
    expect(slots[0]?.kind).toBe('rootkit')
    const tile = layout(16)
    const position = slots[0]?.position ?? { x: Infinity, z: Infinity }
    const alongOffset = (position.x - tile.center.x) * tile.outward.z - (position.z - tile.center.z) * tile.outward.x
    expect(alongOffset).toBeCloseTo(0)
  })

  it('places nothing at level 0', () => {
    expect(buildingSlots(16, 0)).toEqual([])
  })
})

describe('travel point', () => {
  it('lies inside the tile of the square', () => {
    for (let i = 0; i < 40; i++) expect(inside(i, travelPoint(i))).toBe(true)
  })
})
