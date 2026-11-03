import { describe, expect, it } from 'vitest'
import { cardIdByTitle, type Phase } from '../../engine'
import { A, B, makeState, player } from '../../engine/testUtils'
import { decide, playWhile } from './testUtils'

const forumAuction = (highBid: number): Phase => ({ kind: 'auction', squareId: 'forum', highBid, highBidder: B, bidders: [A, B], nextBidder: A })
const debtOf = (amount: number): Phase => ({ kind: 'debt', debtor: A, payments: [{ to: B, amount, reason: 'rent' }], resume: { kind: 'postRoll' } })

describe('easy AI', () => {
  it('refuses Intranet when buying it would leave less than its 100 Ᵽ reserve', () => {
    const state = makeState({ overrides: [{ cash: 200, position: 14 }], phase: { kind: 'buyDecision', squareId: 'intranet' } })
    expect(decide(state, A, 'easy')).toEqual({ type: 'declineProperty', playerId: A })
  })

  it('buys a square that leaves its reserve intact', () => {
    const state = makeState({ overrides: [{ cash: 300, position: 14 }], phase: { kind: 'buyDecision', squareId: 'intranet' } })
    expect(decide(state, A, 'easy')).toEqual({ type: 'buyProperty', playerId: A })
  })

  it('bids 10 Ᵽ above the highest bid on Forum while under 80 % of its price, then passes', () => {
    expect(decide(makeState({ overrides: [{ cash: 1000 }], phase: forumAuction(120) }), A, 'easy')).toEqual({ type: 'placeBid', playerId: A, amount: 130 })
    expect(decide(makeState({ overrides: [{ cash: 1000 }], phase: forumAuction(150) }), A, 'easy')).toEqual({ type: 'passBid', playerId: A })
  })

  it('opens an auction at 10 Ᵽ', () => {
    const phase: Phase = { kind: 'auction', squareId: 'forum', highBid: 0, highBidder: null, bidders: [A, B], nextBidder: A }
    expect(decide(makeState({ phase }), A, 'easy')).toEqual({ type: 'placeBid', playerId: A, amount: 10 })
  })

  it('does not build when a backdoor would leave it under its reserve', () => {
    const state = makeState({ overrides: [{ cash: 150 }], ownership: { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: A } } })
    expect(decide(state, A, 'easy')).toEqual({ type: 'rollDice', playerId: A })
  })

  it('builds on the first complete family in board order', () => {
    const state = makeState({
      overrides: [{ cash: 2000 }],
      ownership: { minitel: { owner: A }, 'modem-56k': { owner: A }, 'state-mainframe': { owner: A }, 'ai-kernel': { owner: A } },
    })
    expect(decide(state, A, 'easy')).toEqual({ type: 'buildBackdoor', playerId: A, squareId: 'minitel' })
  })

  it('raises cash in board order during a debt, then pays', () => {
    const start = makeState({ overrides: [{ cash: 0 }], ownership: { 'vpn-node': { owner: A }, blog: { owner: A } }, phase: debtOf(80) })
    const { actions, next } = playWhile(start, A, 'easy', (a) => a.type === 'mortgage')
    expect(actions).toEqual([{ type: 'mortgage', playerId: A, squareId: 'vpn-node' }])
    expect(next).toEqual({ type: 'payDebt', playerId: A })
  })

  it('always tries a double in quarantine, even with a key early in the game', () => {
    const state = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 }, keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }] })
    expect(decide(state, A, 'easy')).toEqual({ type: 'rollDice', playerId: A })
  })

  it('rolls again after a double and ends its turn otherwise', () => {
    expect(decide(makeState({ phase: { kind: 'postRoll', mayRollAgain: true } }), A, 'easy')).toEqual({ type: 'rollDice', playerId: A })
    expect(decide(makeState({ phase: { kind: 'postRoll', mayRollAgain: false } }), A, 'easy')).toEqual({ type: 'endTurn', playerId: A })
  })

  it('declares bankruptcy only when its assets cannot cover the debt', () => {
    const state = makeState({ overrides: [{ cash: 100 }], ownership: { blog: { owner: A } }, phase: debtOf(2000) })
    expect(decide(state, A, 'easy')).toEqual({ type: 'declareBankruptcy', playerId: A })
    expect(player(state, A).cash).toBe(100)
  })
})
