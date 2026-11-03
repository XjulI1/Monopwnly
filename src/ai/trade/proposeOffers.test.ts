import { describe, expect, it } from 'vitest'
import { applyAction, type Action, type GameState, type TradeLimits } from '../../engine'
import { A, B, C, makeState, type StateOptions } from '../../engine/testUtils'
import { decide } from '../levels/testUtils'

function game(options: StateOptions, tradeLimits?: TradeLimits): GameState {
  const state = makeState(options)
  if (tradeLimits) state.tradeLimits = tradeLimits
  return state
}

function proposal(action: Action) {
  if (action.type !== 'proposeTrade') throw new Error(`Expected a proposal, got ${action.type}`)
  return action.offer
}

const WEB_MISSING_SHOP = { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: B } }

describe('proposals of the AI', () => {
  it('never proposes at the easy level', () => {
    const state = game({ ownership: { minitel: { owner: A }, 'modem-56k': { owner: B } } })
    expect(decide(state, A, 'easy')).toEqual({ type: 'rollDice', playerId: A })
  })

  it('offers, at the normal level, to buy the square that completes its family', () => {
    const state = game({ overrides: [{ cash: 1000 }], ownership: WEB_MISSING_SHOP })
    expect(proposal(decide(state, A, 'normal'))).toEqual({
      from: A,
      to: B,
      give: { squares: [], cash: 200, keys: [] },
      receive: { squares: ['online-shop'], cash: 0, keys: [] },
    })
  })

  it('raises its price from one proposal to the next, then gives up', () => {
    const asked = (count: number) => game({ overrides: [{ cash: 1000 }], ownership: WEB_MISSING_SHOP }, {
      thisTurn: {},
      refusedAsks: { [A]: { 'online-shop': { holder: B, count } } },
    })
    expect(proposal(decide(asked(1), A, 'normal')).give.cash).toBe(300)
    expect(proposal(decide(asked(2), A, 'normal')).give.cash).toBe(400)
    expect(decide(asked(3), A, 'normal')).toEqual({ type: 'rollDice', playerId: A })
  })

  it('starts again from the price when the square has changed hands since the refusals', () => {
    const state = game({ overrides: [{ cash: 1000 }], ownership: WEB_MISSING_SHOP }, {
      thisTurn: {},
      refusedAsks: { [A]: { 'online-shop': { holder: C, count: 2 } } },
    })
    expect(proposal(decide(state, A, 'normal')).give.cash).toBe(200)
  })

  it('stays within its cash above its reserve', () => {
    const state = game({ overrides: [{ cash: 150 }], ownership: WEB_MISSING_SHOP })
    expect(decide(state, A, 'normal').type).not.toBe('proposeTrade')
  })

  it('proposes at most once to each player in a turn and never repeats a refused offer', () => {
    const state = game({ overrides: [{ cash: 1000 }], ownership: WEB_MISSING_SHOP })
    const refused = applyAction(state, decide(state, A, 'normal'))
    if (!refused.ok) throw new Error(refused.error.code)
    const back = applyAction(refused.state, { type: 'rejectTrade', playerId: B })
    if (!back.ok) throw new Error(back.error.code)
    expect(decide(back.state, A, 'normal')).toEqual({ type: 'rollDice', playerId: A })
  })

  it('offers, at the hard level, a cross trade where each side completes a family worth less to the other', () => {
    const state = game({
      ownership: {
        'power-grid': { owner: A },
        satellite: { owner: A },
        forum: { owner: A },
        'submarine-cable': { owner: B },
        blog: { owner: B },
        'online-shop': { owner: B },
      },
    })
    const offer = proposal(decide(state, A, 'hard'))
    expect(offer).toMatchObject({ from: A, to: B, receive: { squares: ['submarine-cable'], cash: 0, keys: [] } })
    expect(offer.give.squares).toEqual(['forum'])
  })

  it('offers the same trade for the same view', () => {
    const state = game({ overrides: [{ cash: 1000 }], ownership: WEB_MISSING_SHOP })
    expect(decide(state, A, 'hard')).toEqual(decide(structuredClone(state), A, 'hard'))
  })

  it('offers, in debt, an isolated square for at least one and a half times its mortgage value to the richest player but the creditor', () => {
    const state = game({
      players: 3,
      overrides: [{ cash: 50 }, { cash: 2000 }, { cash: 900 }],
      ownership: { satellite: { owner: A } },
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 200, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const offer = proposal(decide(state, A, 'normal'))
    expect(offer).toMatchObject({ from: A, to: C, give: { squares: ['satellite'], cash: 0, keys: [] }, receive: { squares: [] } })
    expect(offer.receive.cash).toBeGreaterThanOrEqual(225)
  })

  it('goes on settling its debt once the sale is refused', () => {
    const state = game({
      players: 3,
      overrides: [{ cash: 50 }, { cash: 2000 }, { cash: 900 }],
      ownership: { satellite: { owner: A } },
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 200, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const proposed = applyAction(state, decide(state, A, 'normal'))
    if (!proposed.ok) throw new Error(proposed.error.code)
    const refused = applyAction(proposed.state, { type: 'rejectTrade', playerId: C })
    if (!refused.ok) throw new Error(refused.error.code)
    expect(decide(refused.state, A, 'normal')).toEqual({ type: 'mortgage', playerId: A, squareId: 'satellite' })
  })
})
