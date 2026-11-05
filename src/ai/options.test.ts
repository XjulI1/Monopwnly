import { describe, expect, it } from 'vitest'
import { cardIdByTitle, netWorth, type GameSettings, type GameState, type Phase, type TradeOffer } from '../engine'
import { A, B, makeState, type StateOptions } from '../engine/testUtils'
import { decide } from './levels/testUtils'
import { playerView } from './playerView'
import { reserve, squareValue } from './valuation'

const KEY = cardIdByTitle('patch', 'Clé de déchiffrement')
const PRE_ROLL: Phase = { kind: 'preRoll' }

function game(settings: Partial<GameSettings>, turnNumber: number, options: StateOptions = {}): GameState {
  const state = makeState({ ...options, settings })
  state.turnNumber = turnNumber
  return state
}

function offered(offer: TradeOffer): Phase {
  return { kind: 'tradeOffer', offer, resume: { kind: 'preRoll' }, original: null }
}

function auction(squareId: string, highBid: number): Phase {
  return { kind: 'auction', squareId, highBid, highBidder: B, bidders: [A, B], nextBidder: A }
}

const LIMIT_30: Partial<GameSettings> = { turnLimit: 30 }
const TARGET_6K: Partial<GameSettings> = { netWorthTarget: 6000 }

describe('end of a limited game', () => {
  const mortgagedWeb: StateOptions = {
    overrides: [{ cash: 1500 }],
    ownership: { forum: { owner: A, mortgaged: true }, blog: { owner: A }, 'online-shop': { owner: A } },
    phase: PRE_ROLL,
  }

  it('stops reactivating squares in the last 3 rounds', () => {
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(LIMIT_30, 28, mortgagedWeb), A, level).type).not.toBe('unmortgage')
      expect(decide(game(LIMIT_30, 30, mortgagedWeb), A, level).type).not.toBe('unmortgage')
    }
  })

  it('plays as usual before the last 3 rounds', () => {
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(LIMIT_30, 27, mortgagedWeb), A, level)).toEqual({ type: 'unmortgage', playerId: A, squareId: 'forum' })
      expect(decide(game({}, 28, mortgagedWeb), A, level)).toEqual({ type: 'unmortgage', playerId: A, squareId: 'forum' })
    }
  })

  it('never sells a building outside a debt', () => {
    const built: StateOptions = {
      overrides: [{ cash: 20 }],
      ownership: { forum: { owner: A, level: 2 }, blog: { owner: A, level: 2 }, 'online-shop': { owner: A, level: 2 } },
      phase: { kind: 'postRoll', mayRollAgain: false },
    }
    for (const level of ['normal', 'hard'] as const) expect(decide(game(LIMIT_30, 29, built), A, level).type).toBe('endTurn')
  })

  it('bids up to the price of the square, no further', () => {
    const bidding = (highBid: number): StateOptions => ({ overrides: [{ cash: 1000 }], phase: auction('blog', highBid) })
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(LIMIT_30, 29, bidding(150)), A, level)).toEqual({ type: 'placeBid', playerId: A, amount: 160 })
      expect(decide(game(LIMIT_30, 29, bidding(170)), A, level)).toEqual({ type: 'placeBid', playerId: A, amount: 180 })
      expect(decide(game(LIMIT_30, 29, bidding(180)), A, level)).toEqual({ type: 'passBid', playerId: A })
    }
  })

  const minitelFor = (cash: number): StateOptions => ({
    overrides: [{ cash: 1000 }, { cash: 1000 }],
    ownership: { 'modem-56k': { owner: A }, minitel: { owner: B } },
    phase: offered({ from: B, to: A, give: { squares: ['minitel'], cash: 0, keys: [] }, receive: { squares: [], cash, keys: [] } }),
  })

  const minitelAt = (cash: number) => ({
    type: 'counterTrade',
    playerId: A,
    offer: { from: A, to: B, give: { squares: [], cash, keys: [] }, receive: { squares: ['minitel'], cash: 0, keys: [] } },
  })

  it('does not accept a trade that lowers its net worth, and counters at a price that raises it', () => {
    expect(decide(game({}, 28, minitelFor(80)), A, 'normal').type).toBe('acceptTrade')
    expect(decide(game(LIMIT_30, 28, minitelFor(80)), A, 'normal')).toEqual(minitelAt(50))
  })

  it('does not accept a trade that leaves its net worth unchanged, and counters at a price that raises it', () => {
    expect(decide(game({}, 29, minitelFor(60)), A, 'hard').type).toBe('acceptTrade')
    expect(decide(game(LIMIT_30, 29, minitelFor(60)), A, 'hard')).toEqual(minitelAt(50))
  })

  it('accepts a trade that raises its net worth', () => {
    expect(decide(game(LIMIT_30, 29, minitelFor(40)), A, 'normal').type).toBe('acceptTrade')
  })
})

describe('opponent close to the net worth target', () => {
  const bobLeads = (phase: Phase, ownership: StateOptions['ownership'], bobCash: number): StateOptions => ({
    overrides: [{ cash: 1500 }, { cash: bobCash }],
    ownership,
    phase,
  })

  const shopForBob = bobLeads(
    offered({ from: B, to: A, give: { squares: ['online-shop'], cash: 0, keys: [] }, receive: { squares: [], cash: 220, keys: [] } }),
    { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: B } },
    4900,
  )

  it('makes the hard AI counter a trade that raises the net worth of the leader, at a price that does not', () => {
    expect(netWorth(game(TARGET_6K, 5, shopForBob), B)).toBe(5100)
    expect(decide(game({}, 5, shopForBob), A, 'hard').type).toBe('acceptTrade')
    expect(decide(game(TARGET_6K, 5, shopForBob), A, 'hard')).toEqual({
      type: 'counterTrade',
      playerId: A,
      offer: { from: A, to: B, give: { squares: [], cash: 200, keys: [] }, receive: { squares: ['online-shop'], cash: 0, keys: [] } },
    })
  })

  const shopToBob = bobLeads(
    offered({ from: B, to: A, give: { squares: [], cash: 2000, keys: [] }, receive: { squares: ['online-shop'], cash: 0, keys: [] } }),
    { forum: { owner: B }, blog: { owner: B }, 'online-shop': { owner: A } },
    4740,
  )

  it('makes the normal AI refuse a trade that completes a family of the leader', () => {
    expect(netWorth(game(TARGET_6K, 5, shopToBob), B)).toBe(5100)
    expect(decide(game({}, 5, shopToBob), A, 'normal').type).toBe('acceptTrade')
    expect(decide(game(TARGET_6K, 5, shopToBob), A, 'normal').type).toBe('rejectTrade')
  })

  const shopAuction = (highBid: number) =>
    bobLeads(auction('online-shop', highBid), { forum: { owner: B }, blog: { owner: B } }, 4740)

  it('makes the hard AI outbid the leader beyond the price to keep a family from them', () => {
    expect(decide(game({}, 5, shopAuction(600)), A, 'hard')).toEqual({ type: 'passBid', playerId: A })
    expect(decide(game(TARGET_6K, 5, shopAuction(600)), A, 'hard')).toEqual({ type: 'placeBid', playerId: A, amount: 610 })
  })

  it('keeps blocking the leader in the last rounds of a limited game', () => {
    expect(decide(game({ ...TARGET_6K, ...LIMIT_30 }, 29, shopAuction(600)), A, 'hard')).toEqual({
      type: 'placeBid',
      playerId: A,
      amount: 610,
    })
  })

  it('stops blocking at its reserve', () => {
    const poor = { ...shopAuction(600), overrides: [{ cash: 620 }, { cash: 4740 }] }
    expect(decide(game(TARGET_6K, 5, poor), A, 'hard')).toEqual({ type: 'passBid', playerId: A })
  })

  it('ignores opponents under 80 % of the target', () => {
    const farther = { ...shopAuction(600), overrides: [{ cash: 1500 }, { cash: 4000 }] }
    expect(decide(game(TARGET_6K, 5, farther), A, 'hard')).toEqual({ type: 'passBid', playerId: A })
  })
})

describe('free building', () => {
  const FREE: Partial<GameSettings> = { freeBuilding: true }
  const web = (forum: 0 | 1, shop: 0 | 1): StateOptions => ({
    overrides: [{ cash: 1500 }],
    ownership: { forum: { owner: A, level: forum }, blog: { owner: A }, 'online-shop': { owner: A, level: shop } },
    phase: PRE_ROLL,
  })

  it('makes normal and hard AIs start with the online shop', () => {
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(FREE, 5, web(0, 0)), A, level)).toEqual({ type: 'buildBackdoor', playerId: A, squareId: 'online-shop' })
    }
  })

  it('makes normal and hard AIs keep building on the online shop', () => {
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(FREE, 5, web(0, 1)), A, level)).toEqual({ type: 'buildBackdoor', playerId: A, squareId: 'online-shop' })
      expect(decide(game({}, 5, web(0, 1)), A, level)).not.toEqual({ type: 'buildBackdoor', playerId: A, squareId: 'online-shop' })
    }
  })

  it('makes the hard AI value a square without the yield of a family built evenly', () => {
    const approaching: StateOptions = { ownership: { forum: { owner: A } } }
    const free = playerView(game(FREE, 5, approaching))
    const even = playerView(game({}, 5, approaching))
    expect(squareValue(free, 'blog', A, 'hard')).toBe(squareValue(free, 'blog', A, 'normal'))
    expect(squareValue(even, 'blog', A, 'hard')).not.toBe(squareValue(even, 'blog', A, 'normal'))
  })

  it('makes the hard AI keep a larger reserve against rents gathered on a few systems', () => {
    const threatened: StateOptions = { overrides: [{ position: 12 }], ownership: { forum: { owner: B, level: 5 } } }
    const free = reserve(playerView(game(FREE, 5, threatened)), A, 'hard')
    const even = reserve(playerView(game({}, 5, threatened)), A, 'hard')
    expect(free).toBeGreaterThan(even)
    expect(reserve(playerView(game(FREE, 5, threatened)), A, 'normal')).toBe(reserve(playerView(game({}, 5, threatened)), A, 'normal'))
  })

  it('makes the easy AI spread its backdoors as without the option', () => {
    expect(decide(game(FREE, 5, web(1, 0)), A, 'easy')).toEqual({ type: 'buildBackdoor', playerId: A, squareId: 'blog' })
    expect(decide(game({}, 5, web(1, 0)), A, 'easy')).toEqual({ type: 'buildBackdoor', playerId: A, squareId: 'blog' })
  })
})

describe('quarantine without rent', () => {
  const NO_RENT: Partial<GameSettings> = { noRentInQuarantine: true }
  const quarantined = (keys: string[], ownership: StateOptions['ownership']): StateOptions => ({
    players: 3,
    overrides: [{ cash: 1000, position: 10, quarantine: { failedAttempts: 0 }, keys }],
    ownership,
    phase: PRE_ROLL,
  })
  const builtWeb = { forum: { owner: A, level: 3 as const }, blog: { owner: A, level: 3 as const }, 'online-shop': { owner: A, level: 3 as const } }

  it('makes the AI use its key at once when its squares bring more than the fine', () => {
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(NO_RENT, 20, quarantined([KEY], builtWeb)), A, level)).toEqual({ type: 'useDecryptionKey', playerId: A })
    }
  })

  it('makes the AI pay the fine at once without a key', () => {
    expect(decide(game(NO_RENT, 20, quarantined([], builtWeb)), A, 'hard')).toEqual({ type: 'payQuarantineFine', playerId: A })
  })

  it('decides as without the option when its squares bring little', () => {
    const minitel = quarantined([KEY], { minitel: { owner: A } })
    for (const level of ['normal', 'hard'] as const) {
      expect(decide(game(NO_RENT, 20, minitel), A, level)).toEqual(decide(game({}, 20, minitel), A, level))
    }
  })

  it('leaves the easy AI as it is', () => {
    const state = quarantined([KEY], builtWeb)
    expect(decide(game(NO_RENT, 20, state), A, 'easy')).toEqual(decide(game({}, 20, state), A, 'easy'))
  })
})

describe('DMZ pot', () => {
  it('leaves the pot out of the value of a purchase', () => {
    const deciding: StateOptions = { overrides: [{ cash: 1500, position: 19 }], phase: { kind: 'buyDecision', squareId: 'online-shop' } }
    const empty = game({ dmzJackpot: true }, 5, deciding)
    const full = game({ dmzJackpot: true }, 5, deciding)
    full.dmzPot = 1000
    expect(decide(full, A, 'normal')).toEqual(decide(empty, A, 'normal'))
    expect(squareValue(playerView(full), 'online-shop', A, 'normal')).toBe(squareValue(playerView(empty), 'online-shop', A, 'normal'))
  })
})

describe('easy level', () => {
  it('keeps its usual decisions near the end of a limited game', () => {
    const bidding: StateOptions = { overrides: [{ cash: 1000 }], phase: auction('blog', 150), players: 3 }
    expect(decide(game(LIMIT_30, 29, bidding), A, 'easy')).toEqual(decide(game({}, 29, bidding), A, 'easy'))
  })
})
