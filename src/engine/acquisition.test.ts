import { describe, expect, it } from 'vitest'
import { A, B, C, act, actAll, makeState, player, rejectCode } from './testUtils'
import type { GameState } from './types'

function deciding(squareId: string, options: Parameters<typeof makeState>[0] = {}): GameState {
  return makeState({ ...options, phase: { kind: 'buyDecision', squareId } })
}

describe('buying', () => {
  it('buys a free square', () => {
    const { state, events } = act(deciding('forum', { overrides: [{ position: 16 }] }), { type: 'buyProperty', playerId: A })
    expect(player(state, A).cash).toBe(1320)
    expect(state.ownership.forum).toEqual({ owner: A, mortgaged: false, level: 0 })
    expect(state.phase.kind).toBe('postRoll')
    expect(events).toContainEqual({ type: 'propertyBought', playerId: A, squareId: 'forum', price: 180 })
  })

  it('refuses without enough cash', () => {
    const state = deciding('ai-kernel', { overrides: [{ cash: 100 }] })
    expect(rejectCode(state, { type: 'buyProperty', playerId: A })).toBe('INSUFFICIENT_FUNDS')
    expect(act(state, { type: 'declineProperty', playerId: A }).state.phase.kind).toBe('auction')
  })

  it('leaves the square to the bank when auctions are disabled', () => {
    const { state } = act(deciding('blog', { settings: { auctions: false } }), { type: 'declineProperty', playerId: A })
    expect(state.ownership.blog).toBeUndefined()
    expect(state.phase.kind).toBe('postRoll')
  })
})

describe('auction', () => {
  const started = () => act(deciding('forum', { players: 3, current: 1 }), { type: 'declineProperty', playerId: B }).state

  it('opens with the decliner first and every solvent player', () => {
    expect(started().phase).toEqual({
      kind: 'auction',
      squareId: 'forum',
      highBid: 0,
      highBidder: null,
      bidders: [B, C, A],
      nextBidder: B,
    })
  })

  it('requires a first bid of at least 10', () => {
    expect(rejectCode(started(), { type: 'placeBid', playerId: B, amount: 5 })).toBe('INVALID_BID')
  })

  it('requires a strictly higher bid', () => {
    const state = act(started(), { type: 'placeBid', playerId: B, amount: 120 }).state
    expect(rejectCode(state, { type: 'placeBid', playerId: C, amount: 120 })).toBe('INVALID_BID')
  })

  it('refuses a bid above the cash', () => {
    const state = started()
    const c = state.players[2]
    if (c) c.cash = 90
    const afterB = act(state, { type: 'placeBid', playerId: B, amount: 50 }).state
    expect(rejectCode(afterB, { type: 'placeBid', playerId: C, amount: 100 })).toBe('INSUFFICIENT_FUNDS')
  })

  it('refuses a bid from a player who is not expected', () => {
    expect(rejectCode(started(), { type: 'placeBid', playerId: C, amount: 50 })).toBe('NOT_YOUR_TURN')
  })

  it('goes around the table', () => {
    const { phase } = act(started(), { type: 'placeBid', playerId: B, amount: 50 }).state
    expect(phase).toMatchObject({ highBid: 50, highBidder: B, nextBidder: C })
  })

  it('awards the square to the last bidder and resumes the current player', () => {
    const { state, events } = actAll(started(), [
      { type: 'placeBid', playerId: B, amount: 50 },
      { type: 'placeBid', playerId: C, amount: 80 },
      { type: 'passBid', playerId: A },
      { type: 'passBid', playerId: B },
    ])
    expect(player(state, C).cash).toBe(1420)
    expect(state.ownership.forum?.owner).toBe(C)
    expect(state.phase.kind).toBe('postRoll')
    expect(state.players[state.currentPlayerIndex]?.id).toBe(B)
    expect(events).toContainEqual({ type: 'auctionWon', playerId: C, squareId: 'forum', amount: 80 })
  })

  it('leaves the square to the bank when nobody bids', () => {
    const { state, events } = actAll(started(), [
      { type: 'passBid', playerId: B },
      { type: 'passBid', playerId: C },
      { type: 'passBid', playerId: A },
    ])
    expect(state.ownership.forum).toBeUndefined()
    expect(state.phase.kind).toBe('postRoll')
    expect(events).toContainEqual({ type: 'auctionUnsold', squareId: 'forum' })
  })

  it('lets the last remaining player bid alone', () => {
    const { state } = actAll(started(), [
      { type: 'passBid', playerId: B },
      { type: 'passBid', playerId: C },
      { type: 'placeBid', playerId: A, amount: 10 },
    ])
    expect(state.ownership.forum?.owner).toBe(A)
  })
})
