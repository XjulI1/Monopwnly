import { describe, expect, it } from 'vitest'
import { liquidationValue, netWorth, type GameState } from '../engine'
import { A, B, C, D, makeState } from '../engine/testUtils'
import { RESIGN_RUIN_ROUNDS } from './constants'
import { landingOdds } from './landingOdds'
import { playerView } from './playerView'
import { expectedLossPerRound, gameLost } from './resignation'

const SALARY_PER_ROLL = 35

const FINANCE_ROOTKITS = {
  'cash-machine': { owner: B, level: 5 },
  neobank: { owner: B, level: 5 },
  'online-exchange': { owner: B, level: 5 },
} as const

const CORE_ROOTKITS = {
  'state-mainframe': { owner: B, level: 5 },
  'ai-kernel': { owner: B, level: 5 },
} as const

function odds(index: number): number {
  return landingOdds()[index] ?? 0
}

function lostGame(): GameState {
  return makeState({ overrides: [{ cash: 20 }, { cash: 500 }], ownership: { minitel: { owner: A }, ...FINANCE_ROOTKITS } })
}

function distancedWithoutDanger(): GameState {
  return makeState({
    overrides: [{ cash: 200 }, { cash: 2500 }],
    ownership: { 'cash-machine': { owner: B }, neobank: { owner: B }, 'online-exchange': { owner: B } },
  })
}

function ruinedWithin(state: GameState, playerId: string): boolean {
  const view = playerView(state)
  return liquidationValue(view, playerId) < RESIGN_RUIN_ROUNDS * expectedLossPerRound(view, playerId)
}

describe('expected loss per round', () => {
  it('weighs the opponent rents by the landing odds, minus the own rents and the share of the salary', () => {
    const expected = odds(26) * 1550 + odds(28) * 1550 + odds(29) * 1735 - odds(1) * 4 - SALARY_PER_ROLL
    expect(expectedLossPerRound(playerView(lostGame()), A)).toBeCloseTo(expected, 9)
  })

  it('is negative when the salary covers the rents to expect', () => {
    expect(expectedLossPerRound(playerView(distancedWithoutDanger()), A)).toBeLessThan(0)
  })

  it('counts the own rents as paid by every opponent', () => {
    const state = makeState({ players: 3, ownership: { minitel: { owner: A, level: 4 }, 'modem-56k': { owner: A, level: 4 } } })
    const expected = -(odds(1) * 200 + odds(3) * 200) * 2 - SALARY_PER_ROLL
    expect(expectedLossPerRound(playerView(state), A)).toBeCloseTo(expected, 9)
  })

  it('ignores mortgaged squares on both sides', () => {
    const state = makeState({
      ownership: { minitel: { owner: A, mortgaged: true }, satellite: { owner: B, mortgaged: true }, 'power-grid': { owner: B } },
    })
    expect(expectedLossPerRound(playerView(state), A)).toBeCloseTo(odds(31) * 40 - SALARY_PER_ROLL, 9)
  })
})

describe('lost game', () => {
  it('is lost far behind the richest opponent, with rents that would ruin the player within a few rounds', () => {
    const state = lostGame()
    expect(ruinedWithin(state, A)).toBe(true)
    expect(gameLost(playerView(state), A)).toBe(true)
  })

  it('is not lost far behind when the salary covers the rents to expect', () => {
    expect(gameLost(playerView(distancedWithoutDanger()), A)).toBe(false)
  })

  it('is not lost under threat with a sixth of the net worth of the richest opponent', () => {
    const state = makeState({
      overrides: [{ cash: 400 }, { cash: 200 }],
      ownership: { 'power-grid': { owner: A }, satellite: { owner: A }, ...FINANCE_ROOTKITS, ...CORE_ROOTKITS },
    })
    expect(ruinedWithin(state, A)).toBe(true)
    expect(netWorth(state, B)).toBe(6 * netWorth(state, A))
    expect(gameLost(playerView(state), A)).toBe(false)
  })

  it('compares the player with the richest of several opponents', () => {
    const state = makeState({
      players: 4,
      overrides: [{ cash: 0 }, { cash: 590 }, { cash: 1040 }, { cash: 1040 }],
      ownership: { minitel: { owner: A, level: 4 }, 'modem-56k': { owner: A, level: 4 }, ...FINANCE_ROOTKITS },
    })
    expect(ruinedWithin(state, A)).toBe(true)
    expect(netWorth(state, B)).toBe(7 * netWorth(state, A))
    expect(netWorth(state, C)).toBe(2 * netWorth(state, A))
    expect(netWorth(state, D)).toBe(2 * netWorth(state, A))
    expect(gameLost(playerView(state), A)).toBe(true)
  })

  it('leaves bankrupt opponents out of the comparison', () => {
    const state = lostGame()
    const richest = state.players[1]
    if (richest) richest.bankrupt = true
    expect(gameLost(playerView(state), A)).toBe(false)
  })
})
