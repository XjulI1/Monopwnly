import { describe, expect, it } from 'vitest'
import { BOARD, cardIdByTitle, type GameState, type Phase } from '../../engine'
import { A, B, makeState, player } from '../../engine/testUtils'
import { playerView } from '../playerView'
import { reserve } from '../valuation'
import { decide, playWhile } from './testUtils'

const KEY = cardIdByTitle('patch', 'Clé de déchiffrement')
const WEB = { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: A } }

function modemAuction(highBid: number, ownsMinitel: boolean): GameState {
  const phase: Phase = { kind: 'auction', squareId: 'modem-56k', highBid, highBidder: B, bidders: [A, B], nextBidder: A }
  return makeState({ phase, ownership: ownsMinitel ? { minitel: { owner: A } } : {} })
}

function allOwnedBy(owner: string): GameState['ownership'] {
  return Object.fromEntries(BOARD.filter((s) => 'price' in s).map((s) => [s.id, { owner, mortgaged: false, level: 0 as const }]))
}

describe('normal AI', () => {
  it('buys Modem 56k to complete Rétro even if that breaks into its reserve', () => {
    const state = makeState({ overrides: [{ cash: 80, position: 3 }], ownership: { minitel: { owner: A } }, phase: { kind: 'buyDecision', squareId: 'modem-56k' } })
    expect(80 - 60).toBeLessThan(reserve(playerView(state), A, 'normal'))
    expect(decide(state, A, 'normal')).toEqual({ type: 'buyProperty', playerId: A })
  })

  it('leaves to the auction a system of a family an opponent has started', () => {
    const state = makeState({ overrides: [{ cash: 1500, position: 12 }], ownership: { intranet: { owner: B } }, phase: { kind: 'buyDecision', squareId: 'work-mail' } })
    expect(decide(state, A, 'normal')).toEqual({ type: 'declineProperty', playerId: A })
  })

  it('refuses a square it cannot afford, even one that completes a family', () => {
    const state = makeState({ overrides: [{ cash: 50, position: 3 }], ownership: { minitel: { owner: A } }, phase: { kind: 'buyDecision', squareId: 'modem-56k' } })
    expect(decide(state, A, 'normal')).toEqual({ type: 'declineProperty', playerId: A })
  })

  it('bids higher for a square of a family it has started', () => {
    expect(decide(modemAuction(60, true), A, 'normal')).toEqual({ type: 'placeBid', playerId: A, amount: 70 })
    expect(decide(modemAuction(60, false), A, 'normal')).toEqual({ type: 'passBid', playerId: A })
  })

  it('builds one backdoor at a time, evenly, until the next one would take it under its reserve', () => {
    const start = makeState({ overrides: [{ cash: 1000 }], ownership: WEB })
    const { actions, state } = playWhile(start, A, 'normal', (a) => a.type === 'buildBackdoor')
    const levels = ['forum', 'blog', 'online-shop'].map((id) => state.ownership[id]?.level ?? 0)
    expect(actions.length).toBeGreaterThan(0)
    expect(Math.max(...levels) - Math.min(...levels)).toBeLessThanOrEqual(1)
    const cash = player(state, A).cash
    expect(cash).toBeGreaterThanOrEqual(reserve(playerView(state), A, 'normal'))
    expect(cash - 100).toBeLessThan(reserve(playerView(state), A, 'normal'))
  })

  it('reactivates a mortgaged square of a complete family before building on it', () => {
    const state = makeState({ overrides: [{ cash: 1000 }], ownership: { ...WEB, blog: { owner: A, mortgaged: true } } })
    expect(decide(state, A, 'normal')).toEqual({ type: 'unmortgage', playerId: A, squareId: 'blog' })
  })

  it('mortgages its squares rather than going bankrupt, then pays', () => {
    const phase: Phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 250, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const start = makeState({ overrides: [{ cash: 100 }], ownership: { forum: { owner: A }, 'tor-node': { owner: A } }, phase })
    const { actions, next } = playWhile(start, A, 'normal', (a) => a.type === 'mortgage')
    expect(actions.length).toBeGreaterThanOrEqual(1)
    expect(next).toEqual({ type: 'payDebt', playerId: A })
  })

  it('uses its key to leave the quarantine early in the game', () => {
    const state = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 }, keys: [KEY] }] })
    expect(decide(state, A, 'normal')).toEqual({ type: 'useDecryptionKey', playerId: A })
  })

  it('pays the fine early in the game when it has no key', () => {
    const state = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 } }] })
    expect(decide(state, A, 'normal')).toEqual({ type: 'payQuarantineFine', playerId: A })
  })

  it('tries a double when no purchasable square is left', () => {
    const state = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 }, keys: [KEY] }], ownership: allOwnedBy(B) })
    expect(decide(state, A, 'normal')).toEqual({ type: 'rollDice', playerId: A })
  })
})
