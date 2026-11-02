import { describe, expect, it } from 'vitest'
import { FAMILY_COLORS, PLAYER_COLORS } from './boardTheme'

describe('board theme', () => {
  it('has 8 distinct family colors', () => {
    const colors = Object.values(FAMILY_COLORS).map((c) => c.toLowerCase())
    expect(colors).toHaveLength(8)
    expect(new Set(colors).size).toBe(8)
  })

  it('has 6 player colors distinct from each other and from the families', () => {
    const players = PLAYER_COLORS.map((c) => c.toLowerCase())
    expect(new Set(players).size).toBe(6)
    const families = new Set(Object.values(FAMILY_COLORS).map((c) => c.toLowerCase()))
    for (const color of players) expect(families.has(color)).toBe(false)
  })
})
