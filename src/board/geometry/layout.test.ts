import { describe, expect, it } from 'vitest'
import { BOARD_SIDE, CORNER_SIZE, SQUARE_WIDTH, layout, tiles } from './layout'

function overlaps(a: ReturnType<typeof layout>, b: ReturnType<typeof layout>): boolean {
  const epsilon = 1e-9
  return (
    Math.abs(a.center.x - b.center.x) < (a.width + b.width) / 2 - epsilon &&
    Math.abs(a.center.z - b.center.z) < (a.depth + b.depth) / 2 - epsilon
  )
}

describe('board layout', () => {
  it('has one tile per engine square index', () => {
    expect(tiles()).toHaveLength(40)
    tiles().forEach((tile, i) => expect(tile.index).toBe(i))
  })

  it('places larger corners at 0, 10, 20 and 30', () => {
    for (const i of [0, 10, 20, 30]) {
      const tile = layout(i)
      expect(tile.corner).toBe(true)
      expect(tile.width).toBeCloseTo(CORNER_SIZE)
      expect(tile.depth).toBeCloseTo(CORNER_SIZE)
    }
    expect(CORNER_SIZE).toBeGreaterThan(SQUARE_WIDTH)
    expect(layout(5).corner).toBe(false)
  })

  it('puts Boot in the bottom right corner, closest to the camera', () => {
    const boot = layout(0)
    expect(boot.center.x).toBeCloseTo(BOARD_SIDE / 2 - CORNER_SIZE / 2)
    expect(boot.center.z).toBeCloseTo(BOARD_SIDE / 2 - CORNER_SIZE / 2)
  })

  it('aligns squares 0 to 10 on the bottom side, square 1 next to Boot', () => {
    const bottom = Array.from({ length: 11 }, (_, i) => layout(i))
    for (const tile of bottom) expect(tile.center.z).toBeCloseTo(BOARD_SIDE / 2 - CORNER_SIZE / 2)
    for (let i = 1; i < bottom.length; i++) {
      expect(bottom[i]?.center.x).toBeLessThan(bottom[i - 1]?.center.x as number)
    }
    expect(layout(1).center.x).toBeCloseTo(BOARD_SIDE / 2 - CORNER_SIZE - SQUARE_WIDTH / 2)
    expect(layout(9).side).toBe(0)
  })

  it('goes up the left side, then right along the top and down the right side', () => {
    expect(layout(15).side).toBe(1)
    expect(layout(15).center.x).toBeCloseTo(-BOARD_SIDE / 2 + CORNER_SIZE / 2)
    expect(layout(25).side).toBe(2)
    expect(layout(25).center.z).toBeCloseTo(-BOARD_SIDE / 2 + CORNER_SIZE / 2)
    expect(layout(35).side).toBe(3)
    expect(layout(35).center.x).toBeCloseTo(BOARD_SIDE / 2 - CORNER_SIZE / 2)
    expect(layout(11).center.z).toBeLessThan(layout(10).center.z)
    expect(layout(21).center.x).toBeGreaterThan(layout(20).center.x)
    expect(layout(31).center.z).toBeGreaterThan(layout(30).center.z)
  })

  it('never overlaps two tiles', () => {
    const all = tiles()
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        expect(overlaps(all[i] as never, all[j] as never)).toBe(false)
      }
    }
  })

  it('covers a 100-unit board centered on the origin', () => {
    expect(BOARD_SIDE).toBe(100)
    expect(2 * CORNER_SIZE + 9 * SQUARE_WIDTH).toBeCloseTo(100)
    const area = tiles().reduce((sum, t) => sum + t.width * t.depth, 0)
    const ring = BOARD_SIDE * BOARD_SIDE - (BOARD_SIDE - 2 * CORNER_SIZE) ** 2
    expect(area).toBeCloseTo(ring)
    const xs = tiles().map((t) => t.center.x)
    expect(Math.max(...xs) + Math.min(...xs)).toBeCloseTo(0)
  })

  it('turns the text of each side towards the outside of the board', () => {
    expect(layout(5).rotation).toBeCloseTo(0)
    expect(layout(15).rotation).toBeCloseTo(-Math.PI / 2)
    expect(layout(25).rotation).toBeCloseTo(Math.PI)
    expect(layout(35).rotation).toBeCloseTo(Math.PI / 2)
  })

  it('gives each tile an outward direction pointing away from the center', () => {
    for (const tile of tiles().filter((t) => !t.corner)) {
      const dot = tile.outward.x * tile.center.x + tile.outward.z * tile.center.z
      expect(dot).toBeGreaterThan(0)
    }
  })
})
