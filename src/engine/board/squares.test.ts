import { describe, expect, it } from 'vitest'
import type { FamilyId, SystemSquare } from '../types'
import { BOARD, FAMILY_SQUARES, squareAt, squareById } from './squares'

const systems = BOARD.filter((s): s is SystemSquare => s.kind === 'system')

describe('board composition', () => {
  it('has 40 squares indexed 0 to 39 in order', () => {
    expect(BOARD).toHaveLength(40)
    BOARD.forEach((square, i) => expect(square.index).toBe(i))
  })

  it('has unique identifiers', () => {
    expect(new Set(BOARD.map((s) => s.id)).size).toBe(40)
  })

  it('counts squares by kind', () => {
    const count = (kind: string) => BOARD.filter((s) => s.kind === kind).length
    expect(count('system')).toBe(22)
    expect(count('node')).toBe(4)
    expect(count('service')).toBe(2)
    expect(count('card')).toBe(6)
    expect(count('tax')).toBe(2)
    expect(count('corner')).toBe(4)
  })

  it('places the corners', () => {
    const corners = [0, 10, 20, 30].map((i) => squareAt(i))
    expect(corners.map((s) => (s.kind === 'corner' ? s.corner : null))).toEqual([
      'boot',
      'quarantine',
      'dmz',
      'detected',
    ])
    expect(corners.map((s) => s.name)).toEqual(['Boot', 'Quarantaine', 'DMZ', 'Détecté !'])
  })
})

describe('families', () => {
  const expected: Record<FamilyId, { squares: number[]; cost: number }> = {
    retro: { squares: [1, 3], cost: 50 },
    iot: { squares: [6, 7, 9], cost: 50 },
    office: { squares: [11, 12, 14], cost: 100 },
    web: { squares: [16, 17, 19], cost: 100 },
    social: { squares: [21, 23, 24], cost: 150 },
    finance: { squares: [26, 28, 29], cost: 150 },
    infrastructure: { squares: [31, 32, 34], cost: 200 },
    core: { squares: [37, 39], cost: 200 },
  }

  it('groups systems into the 8 families at the expected squares', () => {
    for (const [family, { squares }] of Object.entries(expected)) {
      const indices = systems.filter((s) => s.family === family).map((s) => s.index)
      expect(indices).toEqual(squares)
      expect(FAMILY_SQUARES[family as FamilyId].map((id) => squareById(id).index)).toEqual(squares)
    }
  })

  it('has a homogeneous backdoor cost per family', () => {
    for (const s of systems) expect(s.backdoorCost).toBe(expected[s.family].cost)
  })
})

describe('prices and rents', () => {
  it('matches the reference rows', () => {
    const rows: [number, number, number[]][] = [
      [1, 60, [4, 20, 55, 150, 200, 250]],
      [39, 400, [50, 250, 700, 1900, 2500, 3100]],
      [19, 200, [16, 80, 225, 610, 800, 990]],
    ]
    for (const [index, price, rents] of rows) {
      const square = squareAt(index)
      expect(square.kind).toBe('system')
      if (square.kind !== 'system') continue
      expect(square.price).toBe(price)
      expect([...square.rents]).toEqual(rents)
    }
  })

  it('has strictly increasing rents', () => {
    for (const s of systems) {
      for (let i = 1; i < s.rents.length; i++) expect(s.rents[i]).toBeGreaterThan(s.rents[i - 1] as number)
    }
  })

  it('has a mortgage value of half the price', () => {
    for (const s of BOARD) {
      if (s.kind === 'system' || s.kind === 'node' || s.kind === 'service') {
        expect(s.mortgageValue).toBe(s.price / 2)
      }
    }
    expect(squareById('minitel').kind === 'system' && squareById('minitel')).toMatchObject({ mortgageValue: 30 })
  })
})

describe('other squares', () => {
  it('describes nodes, services, taxes and card squares', () => {
    expect(squareAt(4)).toMatchObject({ kind: 'node', name: 'Nœud VPN', price: 200, mortgageValue: 100 })
    expect(squareAt(13)).toMatchObject({ kind: 'service', name: 'Datacenter', price: 150, mortgageValue: 75 })
    expect(squareAt(33)).toMatchObject({ kind: 'service', name: 'Cloud', price: 150 })
    expect(squareAt(5)).toMatchObject({ kind: 'tax', name: 'Rançongiciel', amount: 200 })
    expect(squareAt(38)).toMatchObject({ kind: 'tax', name: 'Amende RGPD', amount: 100 })
    expect(BOARD.filter((s) => s.kind === 'node').map((s) => s.index)).toEqual([4, 18, 25, 36])
    expect(BOARD.filter((s) => s.kind === 'card' && s.deck === 'exploit').map((s) => s.index)).toEqual([2, 15, 27])
    expect(BOARD.filter((s) => s.kind === 'card' && s.deck === 'patch').map((s) => s.index)).toEqual([8, 22, 35])
    for (const node of BOARD.filter((s) => s.kind === 'node')) expect(node).toMatchObject({ price: 200 })
  })
})
