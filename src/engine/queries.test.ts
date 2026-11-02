import { describe, expect, it } from 'vitest'
import { legalActions } from './index'
import { buildableSquares, expectedActor, mortgageableSquares, rentIfLanded, sellableSquares, unmortgageableSquares } from './queries'
import { liquidationValue } from './payments'
import { A, B, C, makeState } from './testUtils'

describe('expected actor', () => {
  it('is the bidder during an auction and the debtor during a debt', () => {
    expect(expectedActor(makeState())).toBe(A)
    expect(
      expectedActor(makeState({ players: 3, phase: { kind: 'auction', squareId: 'blog', highBid: 0, highBidder: null, bidders: [A, B, C], nextBidder: C } })),
    ).toBe(C)
    expect(
      expectedActor(makeState({ phase: { kind: 'debt', debtor: B, payments: [], resume: { kind: 'postRoll' } } })),
    ).toBe(B)
    expect(expectedActor(makeState({ phase: { kind: 'gameOver' } }))).toBeNull()
  })
})

describe('legal actions', () => {
  it('offers rolling and managing in preRoll', () => {
    const state = makeState({ ownership: { minitel: { owner: A }, 'modem-56k': { owner: A } } })
    const types = legalActions(state).map((a) => a.type)
    expect(types).toContain('rollDice')
    expect(types).toContain('buildBackdoor')
    expect(types).toContain('mortgage')
    expect(types).not.toContain('payQuarantineFine')
    expect(types).not.toContain('endTurn')
  })

  it('offers quarantine exits to a quarantined player', () => {
    const state = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 } }] })
    expect(legalActions(state).map((a) => a.type)).toEqual(['rollDice', 'payQuarantineFine'])
  })

  it('offers ending the turn only without a double to play', () => {
    const types = (mayRollAgain: boolean) =>
      legalActions(makeState({ phase: { kind: 'postRoll', mayRollAgain } })).map((a) => a.type)
    expect(types(false)).toEqual(['endTurn'])
    expect(types(true)).toEqual(['rollDice'])
  })

  it('offers a minimum bid and passing during an auction', () => {
    const state = makeState({ phase: { kind: 'auction', squareId: 'blog', highBid: 40, highBidder: B, bidders: [A, B], nextBidder: A } })
    expect(legalActions(state)).toEqual([
      { type: 'placeBid', playerId: A, amount: 41 },
      { type: 'passBid', playerId: A },
    ])
  })

  it('offers bankruptcy but not payment for an uncovered debt', () => {
    const state = makeState({
      overrides: [{ cash: 10 }],
      ownership: { 'vpn-node': { owner: A } },
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    expect(legalActions(state).map((a) => a.type)).toEqual(['declareBankruptcy', 'mortgage'])
  })
})

describe('square queries', () => {
  const state = makeState({
    overrides: [{ cash: 500 }],
    ownership: {
      minitel: { owner: A, level: 1 },
      'modem-56k': { owner: A },
      'vpn-node': { owner: A },
      blog: { owner: A, mortgaged: true },
      forum: { owner: B },
    },
  })

  it('lists buildable, sellable, mortgageable and reactivable squares', () => {
    expect(buildableSquares(state, A)).toEqual(['modem-56k'])
    expect(sellableSquares(state, A)).toEqual(['minitel'])
    expect(mortgageableSquares(state, A)).toEqual(['vpn-node'])
    expect(unmortgageableSquares(state, A)).toEqual(['blog'])
  })

  it('computes the liquidation value', () => {
    expect(liquidationValue(state, A)).toBe(500 + 25 + 30 + 30 + 100)
  })

  it('computes the rent an opponent would pay', () => {
    expect(rentIfLanded(state, 'minitel')).toBe(20)
    expect(rentIfLanded(state, 'vpn-node')).toBe(25)
    expect(rentIfLanded(state, 'blog')).toBe(0)
    expect(rentIfLanded(makeState({ ownership: { cloud: { owner: B } } }), 'cloud', 10)).toBe(40)
  })
})
