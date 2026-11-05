import { describe, expect, it } from 'vitest'
import { cardIdByTitle } from './board/cards'
import { expectedActor } from './queries'
import { A, B, C, act, actAll, makeState, player, rejectCode } from './testUtils'
import { counterProblem, tradeKey, tradeProposalsLeft, turnProposals, validateTrade } from './trading'
import type { Action, GameState, TradeOffer, TradeResume, TradeSide } from './types'

const KEY = cardIdByTitle('patch', 'Clé de déchiffrement')
const OTHER_KEY = cardIdByTitle('exploit', 'Clé de déchiffrement')

function side(partial: Partial<TradeSide> = {}): TradeSide {
  return { squares: [], cash: 0, keys: [], ...partial }
}

function offer(give: Partial<TradeSide>, receive: Partial<TradeSide>, from = A, to = B): TradeOffer {
  return { from, to, give: side(give), receive: side(receive) }
}

describe('validateTrade', () => {
  const state = makeState({
    players: 3,
    overrides: [{ cash: 100, keys: [KEY] }, { cash: 900, keys: [OTHER_KEY] }],
    ownership: { forum: { owner: A }, minitel: { owner: B, mortgaged: true }, satellite: { owner: C } },
  })

  it('accepts squares, PwnCoins and keys on both sides', () => {
    expect(validateTrade(state, offer({ squares: ['forum'], cash: 100, keys: [KEY] }, { squares: ['minitel'], cash: 900, keys: [OTHER_KEY] }))).toBeNull()
  })

  it('rejects an empty offer', () => {
    expect(validateTrade(state, offer({}, {}))?.code).toBe('EMPTY_TRADE')
  })

  it('rejects a trade with oneself or with a bankrupt player', () => {
    expect(validateTrade(state, offer({ cash: 10 }, {}, A, A))?.code).toBe('INVALID_TRADE')
    const ruined = makeState({ players: 3, overrides: [{}, { bankrupt: true }] })
    expect(validateTrade(ruined, offer({ cash: 10 }, {}))?.code).toBe('INVALID_TRADE')
  })

  it('rejects a square that the side handing it over does not own', () => {
    expect(validateTrade(state, offer({ squares: ['satellite'] }, {}))?.code).toBe('NOT_OWNER')
    expect(validateTrade(state, offer({}, { squares: ['forum'] }))?.code).toBe('NOT_OWNER')
  })

  it('rejects a square that cannot be owned and a square listed twice', () => {
    expect(validateTrade(state, offer({ squares: ['boot'] }, {}))?.code).toBe('UNKNOWN_SQUARE')
    expect(validateTrade(state, offer({ squares: ['forum', 'forum'] }, {}))?.code).toBe('INVALID_TRADE')
  })

  it('rejects a system of a family with buildings', () => {
    const built = makeState({ ownership: { forum: { owner: A, level: 1 }, blog: { owner: A }, 'online-shop': { owner: A } } })
    expect(validateTrade(built, offer({ squares: ['blog'] }, { cash: 10 }))?.code).toBe('HAS_BUILDINGS')
  })

  it('rejects a negative or fractional amount', () => {
    expect(validateTrade(state, offer({ cash: -10 }, { squares: ['minitel'] }))?.code).toBe('INVALID_TRADE')
    expect(validateTrade(state, offer({ cash: 12.5 }, { squares: ['minitel'] }))?.code).toBe('INVALID_TRADE')
  })

  it('rejects an amount above the cash of the side that pays', () => {
    expect(validateTrade(state, offer({ cash: 200 }, { squares: ['minitel'] }))?.code).toBe('INSUFFICIENT_FUNDS')
    expect(validateTrade(state, offer({ squares: ['forum'] }, { cash: 901 }))?.code).toBe('INSUFFICIENT_FUNDS')
  })

  it('rejects a key that the side handing it over does not hold', () => {
    expect(validateTrade(state, offer({ keys: [OTHER_KEY] }, {}))?.code).toBe('NO_KEY')
    expect(validateTrade(state, offer({ cash: 10 }, { keys: [KEY] }))?.code).toBe('NO_KEY')
  })
})

function propose(trade: TradeOffer): Action {
  return { type: 'proposeTrade', playerId: trade.from, offer: trade }
}

const forumFor150 = offer({ squares: ['forum'] }, { cash: 150 })

describe('proposeTrade', () => {
  const start = makeState({ players: 3, ownership: { forum: { owner: A }, blog: { owner: A }, satellite: { owner: C } } })

  it('lets the current player propose before the roll and hands the game to the recipient', () => {
    const { state, events } = act(start, propose(forumFor150))
    expect(state.phase).toEqual({ kind: 'tradeOffer', offer: forumFor150, resume: { kind: 'preRoll' }, original: null })
    expect(expectedActor(state)).toBe(B)
    expect(events).toEqual([{ type: 'tradeProposed', offer: forumFor150 }])
  })

  it('keeps the phase after the roll to come back to it', () => {
    const after = makeState({ ownership: { forum: { owner: A } }, phase: { kind: 'postRoll', mayRollAgain: true } })
    expect(act(after, propose(forumFor150)).state.phase).toMatchObject({ resume: { kind: 'postRoll', mayRollAgain: true } })
  })

  it('lets a debtor propose out of their turn', () => {
    const debt: TradeResume = {
      kind: 'debt',
      debtor: B,
      payments: [{ to: A, amount: 200, reason: 'rent' }],
      resume: { kind: 'postRoll' },
    }
    const inDebt = makeState({ players: 3, overrides: [{}, { cash: 50 }], ownership: { minitel: { owner: B } }, phase: debt })
    const sale = offer({ squares: ['minitel'] }, { cash: 100 }, B, C)
    const { state } = act(inDebt, propose(sale))
    expect(state.phase).toEqual({ kind: 'tradeOffer', offer: sale, resume: debt, original: null })
    expect(expectedActor(state)).toBe(C)
  })

  it('refuses a proposal during a purchase decision or an auction', () => {
    const buying = makeState({ ownership: { forum: { owner: A } }, phase: { kind: 'buyDecision', squareId: 'blog' } })
    expect(rejectCode(buying, propose(forumFor150))).toBe('WRONG_PHASE')
    const bidding = makeState({
      ownership: { forum: { owner: A } },
      phase: { kind: 'auction', squareId: 'blog', highBid: 0, highBidder: null, bidders: [A, B], nextBidder: A },
    })
    expect(rejectCode(bidding, propose(forumFor150))).toBe('WRONG_PHASE')
  })

  it('refuses a proposal from a player who does not have the hand, or made in the name of someone else', () => {
    expect(rejectCode(start, propose(offer({ cash: 10 }, {}, B, A)))).toBe('NOT_YOUR_TURN')
    expect(rejectCode(start, { type: 'proposeTrade', playerId: A, offer: offer({ cash: 10 }, {}, B, C) })).toBe('INVALID_TRADE')
  })

  it('refuses an invalid offer without changing anything', () => {
    expect(rejectCode(start, propose(offer({ squares: ['satellite'] }, {})))).toBe('NOT_OWNER')
    expect(rejectCode(start, propose(offer({ cash: 2000 }, { squares: ['satellite'] }, A, C)))).toBe('INSUFFICIENT_FUNDS')
  })
})

describe('acceptTrade and rejectTrade', () => {
  const start = makeState({
    players: 3,
    overrides: [{ keys: [KEY] }, {}],
    ownership: { forum: { owner: A }, minitel: { owner: A, mortgaged: true }, satellite: { owner: B } },
  })

  function offered(trade: TradeOffer, from: GameState = start): GameState {
    return act(from, propose(trade)).state
  }

  it('hands over the squares, the PwnCoins and the keys at once and goes back to the phase of origin', () => {
    const { state, events } = act(offered(forumFor150), { type: 'acceptTrade', playerId: B })
    expect(state.ownership.forum).toEqual({ owner: B, mortgaged: false, level: 0 })
    expect(player(state, A).cash).toBe(1650)
    expect(player(state, B).cash).toBe(1350)
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(events).toEqual([{ type: 'tradeAccepted', offer: forumFor150, original: null }])
  })

  it('keeps a mortgaged square mortgaged without any interest, and moves the keys', () => {
    const trade = offer({ squares: ['minitel'], keys: [KEY] }, { squares: ['satellite'] })
    const { state } = act(offered(trade), { type: 'acceptTrade', playerId: B })
    expect(state.ownership.minitel).toEqual({ owner: B, mortgaged: true, level: 0 })
    expect(state.ownership.satellite?.owner).toBe(A)
    expect(player(state, B).keys).toEqual([KEY])
    expect(player(state, A).keys).toEqual([])
    expect(state.players.map((p) => p.cash)).toEqual(start.players.map((p) => p.cash))
  })

  it('goes back to the debt with the same remaining payments, which the debtor can now pay', () => {
    const debt: TradeResume = {
      kind: 'debt',
      debtor: B,
      payments: [{ to: A, amount: 200, reason: 'rent' }, { to: C, amount: 50, reason: 'card' }],
      resume: { kind: 'postRoll' },
    }
    const inDebt = makeState({ players: 3, overrides: [{}, { cash: 50 }], ownership: { satellite: { owner: B } }, phase: debt })
    const sale = offer({ squares: ['satellite'] }, { cash: 300 }, B, C)
    const { state } = actAll(inDebt, [propose(sale), { type: 'acceptTrade', playerId: C }])
    expect(state.phase).toEqual(debt)
    expect(player(state, B).cash).toBe(350)
    expect(act(state, { type: 'payDebt', playerId: B }).state.phase.kind).toBe('postRoll')
  })

  it('changes nothing on a refusal and goes back to the phase of origin', () => {
    const before = offered(forumFor150)
    const { state, events } = act(before, { type: 'rejectTrade', playerId: B })
    expect(state.ownership).toEqual(start.ownership)
    expect(state.players).toEqual(start.players)
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(events).toEqual([{ type: 'tradeRejected', offer: forumFor150, original: null }])
  })

  it('refuses an answer from the author of the offer', () => {
    expect(rejectCode(offered(forumFor150), { type: 'acceptTrade', playerId: A })).toBe('NOT_YOUR_TURN')
    expect(rejectCode(offered(forumFor150), { type: 'rejectTrade', playerId: A })).toBe('NOT_YOUR_TURN')
  })

  it('checks the offer again when it is accepted', () => {
    const altered = structuredClone(offered(forumFor150))
    altered.ownership.forum = { owner: C, mortgaged: false, level: 0 }
    expect(rejectCode(altered, { type: 'acceptTrade', playerId: B })).toBe('NOT_OWNER')
  })
})

describe('limits of the proposals', () => {
  const start = makeState({
    players: 3,
    ownership: { forum: { owner: A }, blog: { owner: A }, minitel: { owner: A } },
    phase: { kind: 'postRoll', mayRollAgain: false },
  })

  function refused(from: GameState, trade: TradeOffer): GameState {
    return actAll(from, [propose(trade), { type: 'rejectTrade', playerId: trade.to }]).state
  }

  const offers = [
    offer({ squares: ['forum'] }, { cash: 100 }),
    offer({ squares: ['blog'] }, { cash: 100 }),
    offer({ squares: ['minitel'] }, { cash: 100 }, A, C),
  ]

  it('refuses a fourth proposal in the same turn', () => {
    const three = offers.reduce(refused, start)
    const fourth = offer({ cash: 10 }, {}, A, C)
    expect(validateTrade(three, fourth)?.code).toBe('TRADE_LIMIT_REACHED')
    expect(rejectCode(three, propose(fourth))).toBe('TRADE_LIMIT_REACHED')
  })

  it('refuses a refused proposal again, whatever the order of its elements', () => {
    const forumAndBlog = offer({ squares: ['forum', 'blog'] }, { cash: 400 })
    const after = refused(start, forumAndBlog)
    expect(rejectCode(after, propose(offer({ squares: ['blog', 'forum'] }, { cash: 400 })))).toBe('TRADE_ALREADY_REJECTED')
    expect(act(after, propose(offer({ squares: ['blog', 'forum'] }, { cash: 450 }))).state.phase.kind).toBe('tradeOffer')
  })

  it('counts the proposals of the turn and remembers the partners', () => {
    const after = refused(refused(start, offers[0] as TradeOffer), offers[2] as TradeOffer)
    expect(after.tradeLimits.thisTurn[A]).toEqual({
      count: 2,
      partners: [B, C],
      rejected: expect.any(Array),
    })
  })

  it('starts again from zero in the next turn of the player', () => {
    const three = offers.reduce(refused, start)
    const { state } = act(three, { type: 'endTurn', playerId: A })
    expect(state.tradeLimits.thisTurn).toEqual({})
    const back: GameState = { ...state, currentPlayerIndex: 0, phase: { kind: 'preRoll' } }
    expect(act(back, propose(offers[0] as TradeOffer)).state.phase.kind).toBe('tradeOffer')
  })

  it('keeps separate counters for a debtor out of their turn', () => {
    const three = offers.reduce(refused, start)
    const debt: TradeResume = { kind: 'debt', debtor: B, payments: [{ to: A, amount: 2000, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const inDebt: GameState = { ...structuredClone(three), phase: debt }
    expect(act(inDebt, propose(offer({ cash: 10 }, {}, B, C))).state.tradeLimits.thisTurn[B]?.count).toBe(1)
  })

  it('remembers over the game how many times a request for a square was refused, and by whom', () => {
    const ask = offer({ cash: 200 }, { squares: ['satellite'] }, A, C)
    const owned = makeState({ players: 3, ownership: { satellite: { owner: C } } })
    const once = refused(owned, ask)
    expect(once.tradeLimits.refusedAsks[A]).toEqual({ satellite: { holder: C, count: 1 } })
    const nextTurn = { ...structuredClone(once), tradeLimits: { ...once.tradeLimits, thisTurn: {} } }
    const twice = refused(nextTurn, offer({ cash: 300 }, { squares: ['satellite'] }, A, C))
    expect(twice.tradeLimits.refusedAsks[A]).toEqual({ satellite: { holder: C, count: 2 } })
    const sold = { ...structuredClone(twice), tradeLimits: { ...twice.tradeLimits, thisTurn: {} } }
    sold.ownership.satellite = { owner: B, mortgaged: false, level: 0 }
    const otherHolder = refused(sold, offer({ cash: 300 }, { squares: ['satellite'] }))
    expect(otherHolder.tradeLimits.refusedAsks[A]).toEqual({ satellite: { holder: B, count: 1 } })
  })
})

function counter(trade: TradeOffer): Action {
  return { type: 'counterTrade', playerId: trade.from, offer: trade }
}

describe('counterProblem', () => {
  const start = makeState({ players: 3, overrides: [{}, { cash: 180 }], ownership: { forum: { owner: A }, blog: { owner: A } } })
  const offered = act(start, propose(forumFor150)).state

  it('accepts a different offer sent back by the recipient to the author', () => {
    expect(counterProblem(offered, offer({ cash: 120 }, { squares: ['forum'] }, B, A))).toBeNull()
  })

  it('refuses a counter-offer when no offer waits for an answer', () => {
    expect(counterProblem(start, offer({ cash: 120 }, { squares: ['forum'] }, B, A))?.code).toBe('WRONG_PHASE')
  })

  it('refuses a counter-offer to a counter-offer', () => {
    const countered = act(offered, counter(offer({ cash: 120 }, { squares: ['forum'] }, B, A))).state
    expect(counterProblem(countered, offer({ squares: ['forum'] }, { cash: 140 }))?.code).toBe('COUNTER_NOT_ALLOWED')
  })

  it('refuses a counter-offer sent to another player than the author, or sent by another player than the recipient', () => {
    expect(counterProblem(offered, offer({ cash: 120 }, { squares: ['forum'] }, B, C))?.code).toBe('INVALID_TRADE')
    expect(counterProblem(offered, offer({ cash: 120 }, { squares: ['forum'] }, C, A))?.code).toBe('INVALID_TRADE')
  })

  it('refuses the offer received sent back unchanged, whatever the order of its elements', () => {
    expect(counterProblem(offered, offer({ cash: 150 }, { squares: ['forum'] }, B, A))?.code).toBe('COUNTER_UNCHANGED')
    const forumAndBlog = act(start, propose(offer({ squares: ['forum', 'blog'] }, { cash: 150 }))).state
    expect(counterProblem(forumAndBlog, offer({ cash: 150 }, { squares: ['blog', 'forum'] }, B, A))?.code).toBe('COUNTER_UNCHANGED')
  })

  it('checks the content of the counter-offer like any offer', () => {
    expect(counterProblem(offered, offer({ cash: 200 }, { squares: ['forum'] }, B, A))?.code).toBe('INSUFFICIENT_FUNDS')
  })
})

describe('counterTrade', () => {
  const start = makeState({ players: 3, ownership: { forum: { owner: A }, satellite: { owner: C } } })
  const offered = act(start, propose(forumFor150)).state
  const forumFor200 = offer({ cash: 200 }, { squares: ['forum'] }, B, A)
  const countered = act(offered, counter(forumFor200)).state

  it('keeps the game on the counter-offer, which the author of the offer must answer', () => {
    const { state, events } = act(offered, counter(forumFor200))
    expect(state.phase).toEqual({ kind: 'tradeOffer', offer: forumFor200, resume: { kind: 'preRoll' }, original: forumFor150 })
    expect(expectedActor(state)).toBe(A)
    expect(events).toEqual([{ type: 'tradeCountered', offer: forumFor200, original: forumFor150 }])
  })

  it('refuses a counter-offer from a third player, outside an offer or to a counter-offer', () => {
    expect(rejectCode(offered, counter(offer({ cash: 200 }, { squares: ['forum'] }, C, A)))).toBe('NOT_YOUR_TURN')
    expect(rejectCode(start, counter(forumFor200))).toBe('WRONG_PHASE')
    expect(rejectCode(countered, counter(offer({ squares: ['forum'] }, { cash: 180 })))).toBe('COUNTER_NOT_ALLOWED')
  })

  it('refuses a counter-offer sent to another player or unchanged', () => {
    expect(rejectCode(offered, counter(offer({ cash: 200 }, { squares: ['forum'] }, B, C)))).toBe('INVALID_TRADE')
    expect(rejectCode(offered, counter(offer({ cash: 150 }, { squares: ['forum'] }, B, A)))).toBe('COUNTER_UNCHANGED')
  })

  it('hands over the content of an accepted counter-offer and goes back to the phase before the offer', () => {
    const { state, events } = act(countered, { type: 'acceptTrade', playerId: A })
    expect(state.ownership.forum?.owner).toBe(B)
    expect(player(state, A).cash).toBe(1700)
    expect(player(state, B).cash).toBe(1300)
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(events).toEqual([{ type: 'tradeAccepted', offer: forumFor200, original: forumFor150 }])
  })

  it('changes nothing on a refused counter-offer and goes back to the phase before the offer', () => {
    const { state, events } = act(countered, { type: 'rejectTrade', playerId: A })
    expect(state.ownership).toEqual(start.ownership)
    expect(state.players).toEqual(start.players)
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(events).toEqual([{ type: 'tradeRejected', offer: forumFor200, original: forumFor150 }])
  })

  it('goes back to the debt with the same remaining payments after a counter-offer accepted by the debtor', () => {
    const debt: TradeResume = { kind: 'debt', debtor: B, payments: [{ to: A, amount: 200, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const inDebt = makeState({ players: 3, overrides: [{}, { cash: 50 }], ownership: { satellite: { owner: B } }, phase: debt })
    const sale = offer({ squares: ['satellite'] }, { cash: 225 }, B, C)
    const { state } = actAll(inDebt, [
      propose(sale),
      counter(offer({ cash: 180 }, { squares: ['satellite'] }, C, B)),
      { type: 'acceptTrade', playerId: B },
    ])
    expect(state.ownership.satellite?.owner).toBe(C)
    expect(player(state, B).cash).toBe(230)
    expect(state.phase).toEqual(debt)
  })

  it('does not count the counter-offer among the proposals of its author', () => {
    expect(tradeProposalsLeft(countered, B)).toBe(3)
    expect(turnProposals(countered, A).count).toBe(1)
  })

  it('counts the offer that received a counter-offer as refused', () => {
    const back = act(countered, { type: 'rejectTrade', playerId: A }).state
    expect(rejectCode(back, propose(forumFor150))).toBe('TRADE_ALREADY_REJECTED')
    const traded = act(countered, { type: 'acceptTrade', playerId: A }).state
    expect(traded.tradeLimits.thisTurn[A]?.rejected).toContain(tradeKey(forumFor150))
  })

  it('counts a refusal of each square the offer asked for', () => {
    const ask = offer({ cash: 200 }, { squares: ['satellite'] }, A, C)
    const asked = act(start, propose(ask)).state
    const { state } = act(asked, counter(offer({ squares: ['satellite'] }, { cash: 300 }, C, A)))
    expect(state.tradeLimits.refusedAsks[A]).toEqual({ satellite: { holder: C, count: 1 } })
  })
})
