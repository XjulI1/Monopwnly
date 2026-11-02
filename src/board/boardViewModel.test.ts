import { describe, expect, it } from 'vitest'
import { createGame, type GameState } from '../engine'
import { boardViewModel } from './boardViewModel'
import { pawnSlots } from './geometry/slots'

function game(players = 3): GameState {
  const colors = ['#ff8a1c', '#39ff6a', '#2f5bff', '#ff38f0', '#f2f4f8', '#9a9aff']
  const result = createGame({
    players: Array.from({ length: players }, (_, i) => ({ id: `p${i + 1}`, name: `J${i + 1}`, color: colors[i] as string })),
    seed: 1,
  })
  if (!result.ok) throw new Error()
  return result.state
}

describe('squares', () => {
  it('shows a bank square without owner', () => {
    const view = boardViewModel(game(), {})
    expect(view.squares[17]).toMatchObject({ owner: null, ownerColor: null, mortgaged: false, level: 0 })
  })

  it('shows the owner color, mortgage and building level', () => {
    const state = game()
    state.ownership.blog = { owner: 'p2', mortgaged: true, level: 0 }
    state.ownership.intranet = { owner: 'p1', mortgaged: false, level: 3 }
    const view = boardViewModel(state, {})
    expect(view.squares[17]).toMatchObject({ owner: 'p2', ownerColor: '#39ff6a', mortgaged: true })
    expect(view.squares[14]).toMatchObject({ owner: 'p1', level: 3 })
  })

  it('has 40 squares in board order', () => {
    const view = boardViewModel(game(), {})
    expect(view.squares.map((s) => s.index)).toEqual(Array.from({ length: 40 }, (_, i) => i))
  })
})

describe('pawns', () => {
  it('shows only active players, in play order on their square', () => {
    const state = game(3)
    const second = state.players[1]
    if (second) second.bankrupt = true
    const view = boardViewModel(state, {})
    expect(view.pawns.map((p) => p.playerId)).toEqual(['p1', 'p3'])
    expect(view.pawns.map((p) => p.position)).toEqual(pawnSlots(0, 2, false))
  })

  it('flags quarantined pawns and places them in the cell', () => {
    const state = game(2)
    for (const p of state.players) p.position = 10
    const first = state.players[0]
    if (first) first.quarantine = { failedAttempts: 0 }
    const view = boardViewModel(state, {})
    expect(view.pawns[0]).toMatchObject({ playerId: 'p1', quarantined: true, position: pawnSlots(10, 1, true)[0] })
    expect(view.pawns[1]).toMatchObject({ playerId: 'p2', quarantined: false, position: pawnSlots(10, 1, false)[0] })
  })
})

describe('highlights', () => {
  it('shows no highlight and no dimming by default', () => {
    const view = boardViewModel(game(), {})
    expect(view.squares.every((s) => s.highlight === 'none' && !s.dimmed)).toBe(true)
  })

  it('dims non-selectable squares when some are selectable', () => {
    const view = boardViewModel(game(), { 16: 'selectable', 17: 'selectable', 19: 'selected' })
    expect(view.squares[16]).toMatchObject({ highlight: 'selectable', dimmed: false })
    expect(view.squares[19]).toMatchObject({ highlight: 'selected', dimmed: false })
    expect(view.squares[5]).toMatchObject({ highlight: 'none', dimmed: true })
  })

  it('does not dim when only a selection is shown', () => {
    const view = boardViewModel(game(), { 28: 'selected' })
    expect(view.squares[28]?.highlight).toBe('selected')
    expect(view.squares.some((s) => s.dimmed)).toBe(false)
  })
})
