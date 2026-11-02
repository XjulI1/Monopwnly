import { describe, expect, it } from 'vitest'
import { movePath } from './path'
import { travelPoint } from './slots'

describe('move path', () => {
  it('gives one waypoint per square, in order', () => {
    const squares = [3, 4, 5, 6, 7, 8, 9, 10]
    expect(movePath(squares)).toEqual(squares.map(travelPoint))
  })

  it('goes through Boot', () => {
    const path = movePath([37, 38, 39, 0, 1, 2])
    expect(path).toHaveLength(6)
    expect(path[3]).toEqual(travelPoint(0))
  })

  it('moves back square by square', () => {
    expect(movePath([22, 21, 20, 19])).toEqual([22, 21, 20, 19].map(travelPoint))
  })

  it('jumps directly to quarantine with a two-element list', () => {
    expect(movePath([30, 10])).toEqual([travelPoint(30), travelPoint(10)])
  })
})
