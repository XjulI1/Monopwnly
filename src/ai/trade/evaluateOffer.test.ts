import { describe, expect, it } from 'vitest'
import { type GameState, type TradeOffer, type TradeSide } from '../../engine'
import { A, B, act, makeState, type StateOptions } from '../../engine/testUtils'
import { decide } from '../levels/testUtils'
import { playerView } from '../playerView'
import { evaluateOffer } from './evaluateOffer'

const ai = { kind: 'ai', level: 'normal' } as const

function side(partial: Partial<TradeSide> = {}): TradeSide {
  return { squares: [], cash: 0, keys: [], ...partial }
}

function offer(give: Partial<TradeSide>, receive: Partial<TradeSide>): TradeOffer {
  return { from: A, to: B, give: side(give), receive: side(receive) }
}

function evaluate(options: StateOptions, trade: TradeOffer, level: 'easy' | 'normal' | 'hard') {
  return evaluateOffer(playerView(makeState(options)), trade, level)
}

function offeredTo(options: StateOptions, trade: TradeOffer): GameState {
  const overrides = [options.overrides?.[0] ?? {}, { controller: ai, ...options.overrides?.[1] }]
  return act(makeState({ ...options, overrides }), { type: 'proposeTrade', playerId: A, offer: trade }).state
}

describe('evaluateOffer', () => {
  it('accepts a generous offer for an isolated system', () => {
    expect(evaluate({ ownership: { minitel: { owner: B } } }, offer({ cash: 300 }, { squares: ['minitel'] }), 'normal').accept).toBe(true)
  })

  it('refuses an unbalanced offer', () => {
    expect(evaluate({ ownership: { satellite: { owner: B } } }, offer({ cash: 50 }, { squares: ['satellite'] }), 'normal').accept).toBe(false)
  })

  it('refuses to complete a family of the author when the danger outweighs the gain, unless it is easy', () => {
    const options = { ownership: { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: B } } }
    const trade = offer({ cash: 250 }, { squares: ['online-shop'] })
    const normal = evaluate(options, trade, 'normal')
    expect(normal.danger).toBeGreaterThan(0)
    expect(normal.accept).toBe(false)
    const easy = evaluate(options, trade, 'easy')
    expect(easy.danger).toBe(0)
    expect(easy.accept).toBe(true)
  })

  it('accepts a square that completes its own family', () => {
    const trade = offer({ squares: ['modem-56k'] }, { cash: 60 })
    expect(evaluate({ ownership: { minitel: { owner: B }, 'modem-56k': { owner: A } } }, trade, 'normal').accept).toBe(true)
  })

  it('values the squares received on the state after the trade', () => {
    const both = offer({ squares: ['minitel', 'modem-56k'] }, { cash: 200 })
    const options = { ownership: { minitel: { owner: A }, 'modem-56k': { owner: A } } }
    expect(evaluate(options, both, 'normal').gain).toBeGreaterThan(evaluate(options, both, 'easy').gain)
  })

  it('weighs, at the hard level, the lead the trade gives to the author', () => {
    const trade = offer({ cash: 150 }, { squares: ['satellite'] })
    const ownership = { satellite: { owner: B } }
    const behind = evaluate({ overrides: [{ cash: 1000 }, { cash: 1500 }], ownership }, trade, 'hard')
    expect(behind.penalty).toBe(0)
    const passing = evaluate({ overrides: [{ cash: 1600 }, { cash: 1500 }], ownership }, trade, 'hard')
    expect(passing.penalty).toBe(100)
    expect(evaluate({ overrides: [{ cash: 1600 }, { cash: 1500 }], ownership }, trade, 'normal').penalty).toBe(0)
  })

  it('asks a larger share of the exchanged value at the higher levels', () => {
    const options = { ownership: { satellite: { owner: B } } }
    const trade = offer({ cash: 330 }, { squares: ['satellite'] })
    expect(evaluate(options, trade, 'easy').accept).toBe(true)
    expect(evaluate(options, trade, 'hard').accept).toBe(false)
  })
})

describe('answer of an AI to an offer', () => {
  it('accepts or refuses according to its evaluation', () => {
    expect(decide(offeredTo({ ownership: { minitel: { owner: B } } }, offer({ cash: 300 }, { squares: ['minitel'] })), B, 'normal')).toEqual({
      type: 'acceptTrade',
      playerId: B,
    })
    expect(decide(offeredTo({ ownership: { satellite: { owner: B } } }, offer({ cash: 50 }, { squares: ['satellite'] })), B, 'normal')).toEqual({
      type: 'rejectTrade',
      playerId: B,
    })
  })
})
