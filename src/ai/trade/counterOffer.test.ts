import { describe, expect, it } from 'vitest'
import { type Action, type AiLevel, type GameState, type TradeOffer, type TradeResume, type TradeSide } from '../../engine'
import { A, B, C, act, actAll, makeState, type StateOptions } from '../../engine/testUtils'
import { COUNTER_MAX_SHARE, TRADE_CASH_STEP } from '../constants'
import { decide } from '../levels/testUtils'
import { playerView } from '../playerView'
import { reserve } from '../valuation'
import { evaluateOffer } from './evaluateOffer'

const MOST_CASH = 2000

function side(partial: Partial<TradeSide> = {}): TradeSide {
  return { squares: [], cash: 0, keys: [], ...partial }
}

function offer(give: Partial<TradeSide>, receive: Partial<TradeSide>, from = A, to = B): TradeOffer {
  return { from, to, give: side(give), receive: side(receive) }
}

function propose(trade: TradeOffer): Action {
  return { type: 'proposeTrade', playerId: trade.from, offer: trade }
}

function counter(trade: TradeOffer): Action {
  return { type: 'counterTrade', playerId: trade.from, offer: trade }
}

function offeredTo(options: StateOptions, trade: TradeOffer, level: AiLevel = 'normal'): GameState {
  const overrides = [options.overrides?.[0] ?? {}, { controller: { kind: 'ai', level } as const, ...options.overrides?.[1] }]
  return act(makeState({ ...options, overrides }), propose(trade)).state
}

function accepts(state: GameState, trade: TradeOffer, level: AiLevel = 'normal'): boolean {
  return evaluateOffer(playerView(state), trade, level).accept
}

function lowestAcceptedPrice(state: GameState, squareId: string, from: number): number {
  let price = from
  while (price <= MOST_CASH && !accepts(state, offer({ cash: price }, { squares: [squareId] }))) price += TRADE_CASH_STEP
  return price
}

describe('counter-offer of an AI to an offer it does not accept as it is', () => {
  const satellite = { ownership: { satellite: { owner: B } } }

  it('asks the author for the smallest complement, in steps of 10 Ᵽ, that makes it accept', () => {
    const trade = offer({ cash: 300 }, { squares: ['satellite'] })
    const state = offeredTo(satellite, trade)
    expect(accepts(state, trade)).toBe(false)
    const price = lowestAcceptedPrice(state, 'satellite', 310)
    expect(decide(state, B, 'normal')).toEqual(counter(offer({ squares: ['satellite'] }, { cash: price }, B, A)))
  })

  it('refuses without a counter-offer when the complement exceeds half the value exchanged', () => {
    const trade = offer({ cash: 50 }, { squares: ['satellite'] })
    const state = offeredTo(satellite, trade)
    const price = lowestAcceptedPrice(state, 'satellite', 60)
    expect(price - 50).toBeGreaterThan(COUNTER_MAX_SHARE * evaluateOffer(playerView(state), trade, 'normal').exchanged)
    expect(decide(state, B, 'normal')).toEqual({ type: 'rejectTrade', playerId: B })
  })

  it('refuses without a counter-offer when the author could not pay the amount it would ask', () => {
    const trade = offer({ cash: 300 }, { squares: ['satellite'] })
    const state = offeredTo({ ...satellite, overrides: [{ cash: 300 }] }, trade)
    expect(lowestAcceptedPrice(state, 'satellite', 310)).toBeGreaterThan(300)
    expect(decide(state, B, 'normal')).toEqual({ type: 'rejectTrade', playerId: B })
  })

  it('pays less, by the largest amount in steps of 10 Ᵽ that it accepts, when the offer asked it for PwnCoins', () => {
    const trade = offer({ squares: ['forum'] }, { cash: 220 })
    const state = offeredTo({ ownership: { forum: { owner: A } } }, trade)
    expect(accepts(state, trade)).toBe(false)
    let price = 210
    while (price > 0 && !accepts(state, offer({ squares: ['forum'] }, { cash: price }))) price -= TRADE_CASH_STEP
    expect(decide(state, B, 'normal')).toEqual(counter(offer({ cash: price }, { squares: ['forum'] }, B, A)))
  })

  it('takes the game options into account', () => {
    const trade = offer({ squares: ['modem-56k'] }, { cash: 60 })
    const options: StateOptions = { settings: { turnLimit: 20 }, ownership: { minitel: { owner: B }, 'modem-56k': { owner: A } } }
    const state: GameState = { ...offeredTo(options, trade), turnNumber: 19 }
    expect(accepts(state, trade)).toBe(true)
    expect(decide(state, B, 'normal')).toEqual(counter(offer({ cash: 50 }, { squares: ['modem-56k'] }, B, A)))
  })

  it('never makes a counter-offer at the easy level', () => {
    const trade = offer({ cash: 280 }, { squares: ['satellite'] })
    const state = offeredTo(satellite, trade, 'easy')
    expect(decide(offeredTo(satellite, trade), B, 'normal').type).toBe('counterTrade')
    expect(decide(state, B, 'easy')).toEqual({ type: 'rejectTrade', playerId: B })
  })

  it('makes the same counter-offer for the same view', () => {
    const state = offeredTo(satellite, offer({ cash: 300 }, { squares: ['satellite'] }), 'hard')
    const first = decide(state, B, 'hard')
    expect(first.type).toBe('counterTrade')
    expect(decide(state, B, 'hard')).toEqual(first)
  })
})

describe('answer of an AI to a counter-offer', () => {
  const ai = (level: AiLevel, cash: number) => ({ controller: { kind: 'ai', level } as const, cash })
  const web = { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: B } }
  const asked = offer({ cash: 200 }, { squares: ['online-shop'] })

  function countered(level: AiLevel, cash: number, price: number): GameState {
    const start = makeState({ overrides: [ai(level, cash)], ownership: web })
    return actAll(start, [propose(asked), counter(offer({ squares: ['online-shop'] }, { cash: price }, B, A))]).state
  }

  function reserveOf(level: AiLevel): number {
    return reserve(playerView(makeState({ overrides: [ai(level, 1000)], ownership: web })), A, level)
  }

  it('accepts a counter-offer it would accept as an offer received, when it keeps its reserve', () => {
    const state = countered('normal', 1000, 260)
    expect(accepts(state, offer({ squares: ['online-shop'] }, { cash: 260 }, B, A))).toBe(true)
    expect(1000 - 260).toBeGreaterThanOrEqual(reserveOf('normal'))
    expect(decide(state, A, 'normal')).toEqual({ type: 'acceptTrade', playerId: A })
  })

  it('refuses a counter-offer that would take it below its reserve', () => {
    const cash = 260 + reserveOf('normal') - TRADE_CASH_STEP
    expect(decide(countered('normal', cash, 260), A, 'normal')).toEqual({ type: 'rejectTrade', playerId: A })
  })

  it('keeps, at the hard level, enough above its reserve for a backdoor on each system of the family it completes', () => {
    const webBackdoors = 300
    const enough = countered('hard', 220 + reserveOf('hard') + webBackdoors, 220)
    expect(accepts(enough, offer({ squares: ['online-shop'] }, { cash: 220 }, B, A), 'hard')).toBe(true)
    expect(decide(enough, A, 'hard')).toEqual({ type: 'acceptTrade', playerId: A })
    const short = countered('hard', 220 + reserveOf('hard') + webBackdoors - TRADE_CASH_STEP, 220)
    expect(decide(short, A, 'hard')).toEqual({ type: 'rejectTrade', playerId: A })
  })

  it('accepts, during its own debt, a counter-offer to its sale that brings at least the mortgage value of the square', () => {
    const debt: TradeResume = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 400, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const start = makeState({ players: 3, overrides: [ai('normal', 50)], ownership: { satellite: { owner: A } }, phase: debt })
    const sale = offer({ squares: ['satellite'] }, { cash: 225 }, A, C)
    const answered = (price: number) => actAll(start, [propose(sale), counter(offer({ cash: price }, { squares: ['satellite'] }, C, A))]).state
    expect(decide(answered(160), A, 'normal')).toEqual({ type: 'acceptTrade', playerId: A })
    expect(decide(answered(140), A, 'normal')).toEqual({ type: 'rejectTrade', playerId: A })
  })

  it('counts its purchase offer that received a counter-offer as refused, and offers more in the next turn', () => {
    const start = makeState({ overrides: [ai('normal', 1000)], ownership: web })
    expect(decide(start, A, 'normal')).toEqual(propose(asked))
    const { state } = actAll(start, [propose(asked), counter(offer({ squares: ['online-shop'] }, { cash: 600 }, B, A))])
    expect(decide(state, A, 'normal')).toEqual({ type: 'rejectTrade', playerId: A })
    const refused = act(state, { type: 'rejectTrade', playerId: A }).state
    const nextTurn: GameState = { ...refused, tradeLimits: { ...refused.tradeLimits, thisTurn: {} } }
    expect(decide(nextTurn, A, 'normal')).toEqual(propose(offer({ cash: 300 }, { squares: ['online-shop'] })))
  })
})
