import { describe, expect, it } from 'vitest'
import { A, B, act, makeState, player, rejectCode } from './testUtils'
import type { BuildingLevel, GameState, Phase } from './types'

const web = (levels: [number, number, number], extra: Partial<{ mortgaged: string }> = {}) => ({
  forum: { owner: A, level: levels[0] as BuildingLevel, mortgaged: extra.mortgaged === 'forum' },
  blog: { owner: A, level: levels[1] as BuildingLevel, mortgaged: extra.mortgaged === 'blog' },
  'online-shop': { owner: A, level: levels[2] as BuildingLevel },
})

const build = (state: GameState, squareId: string) => act(state, { type: 'buildBackdoor', playerId: A, squareId }).state
const sell = (state: GameState, squareId: string) => act(state, { type: 'sellBackdoor', playerId: A, squareId }).state

describe('building conditions', () => {
  it('builds a first backdoor on a complete family', () => {
    const start = makeState({ overrides: [{ cash: 500 }], ownership: { minitel: { owner: A }, 'modem-56k': { owner: A } } })
    const { state, events } = act(start, { type: 'buildBackdoor', playerId: A, squareId: 'minitel' })
    expect(state.ownership.minitel?.level).toBe(1)
    expect(player(state, A).cash).toBe(450)
    expect(state.bankStock.backdoors).toBe(31)
    expect(events).toContainEqual({ type: 'backdoorBuilt', playerId: A, squareId: 'minitel', level: 1 })
  })

  it('also builds in postRoll', () => {
    const start = makeState({
      ownership: { minitel: { owner: A }, 'modem-56k': { owner: A } },
      phase: { kind: 'postRoll', mayRollAgain: false },
    })
    expect(build(start, 'minitel').ownership.minitel?.level).toBe(1)
  })

  it('refuses an incomplete family', () => {
    const state = makeState({ ownership: { forum: { owner: A }, 'online-shop': { owner: A } } })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('GROUP_INCOMPLETE')
  })

  it('refuses a family with a mortgaged system', () => {
    const state = makeState({ ownership: web([0, 0, 0], { mortgaged: 'blog' }) })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('MORTGAGED')
  })

  it('refuses nodes and services', () => {
    const state = makeState({ ownership: { 'vpn-node': { owner: A }, datacenter: { owner: A }, cloud: { owner: A } } })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'vpn-node' })).toBe('NOT_BUILDABLE')
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'cloud' })).toBe('NOT_BUILDABLE')
  })

  it('refuses a square owned by someone else', () => {
    const state = makeState({ ownership: { forum: { owner: B } } })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('NOT_OWNER')
  })

  it('refuses outside the turn phases', () => {
    const phase: Phase = { kind: 'auction', squareId: 'blog', highBid: 0, highBidder: null, bidders: [A, B], nextBidder: A }
    const state = makeState({ ownership: web([0, 0, 0]), phase })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('WRONG_PHASE')
  })

  it('refuses without enough cash', () => {
    const state = makeState({ overrides: [{ cash: 99 }], ownership: web([0, 0, 0]) })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('INSUFFICIENT_FUNDS')
  })
})

describe('even building', () => {
  it('refuses to build above the lowest level of the family', () => {
    const state = makeState({ ownership: { minitel: { owner: A, level: 1 }, 'modem-56k': { owner: A } } })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'minitel' })).toBe('UNEVEN_BUILDING')
  })

  it('refuses to sell below the highest level of the family', () => {
    const state = makeState({ ownership: { minitel: { owner: A, level: 1 }, 'modem-56k': { owner: A, level: 2 } } })
    expect(rejectCode(state, { type: 'sellBackdoor', playerId: A, squareId: 'minitel' })).toBe('UNEVEN_BUILDING')
  })
})

describe('rootkit and stock', () => {
  it('turns 4 backdoors into a rootkit', () => {
    const start = makeState({ ownership: web([4, 4, 4]), bankStock: { backdoors: 20, rootkits: 12 } })
    const state = build(start, 'forum')
    expect(state.ownership.forum?.level).toBe(5)
    expect(player(state, A).cash).toBe(1400)
    expect(state.bankStock).toEqual({ backdoors: 24, rootkits: 11 })
  })

  it('refuses a fifth level on a rootkit', () => {
    const state = makeState({ ownership: web([5, 5, 5]) })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('MAX_LEVEL')
  })

  it('refuses when the bank has no backdoor left', () => {
    const state = makeState({ ownership: web([0, 0, 0]), bankStock: { backdoors: 0, rootkits: 12 } })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('NO_STOCK')
  })

  it('refuses a rootkit when the bank has none left', () => {
    const state = makeState({ ownership: web([4, 4, 4]), bankStock: { backdoors: 20, rootkits: 0 } })
    expect(rejectCode(state, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toBe('NO_STOCK')
  })
})

describe('selling', () => {
  it('sells a backdoor for half its cost', () => {
    const start = makeState({ ownership: web([1, 1, 1]), bankStock: { backdoors: 29, rootkits: 12 } })
    const state = sell(start, 'online-shop')
    expect(player(state, A).cash).toBe(1550)
    expect(state.ownership['online-shop']?.level).toBe(0)
    expect(state.bankStock.backdoors).toBe(30)
  })

  it('turns a sold rootkit back into 4 backdoors', () => {
    const start = makeState({
      ownership: { 'state-mainframe': { owner: A, level: 5 }, 'ai-kernel': { owner: A, level: 5 } },
      bankStock: { backdoors: 10, rootkits: 10 },
    })
    const state = sell(start, 'ai-kernel')
    expect(player(state, A).cash).toBe(1600)
    expect(state.ownership['ai-kernel']?.level).toBe(4)
    expect(state.bankStock).toEqual({ backdoors: 6, rootkits: 11 })
  })

  it('refuses to sell a rootkit when the bank has fewer than 4 backdoors', () => {
    const state = makeState({
      ownership: { 'state-mainframe': { owner: A, level: 5 }, 'ai-kernel': { owner: A, level: 5 } },
      bankStock: { backdoors: 3, rootkits: 10 },
    })
    expect(rejectCode(state, { type: 'sellBackdoor', playerId: A, squareId: 'ai-kernel' })).toBe('NO_STOCK')
  })

  it('allows selling during a debt', () => {
    const start = makeState({
      ownership: web([1, 1, 1]),
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 5000, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    expect(sell(start, 'forum').ownership.forum?.level).toBe(0)
  })

  it('refuses to sell where there is no building', () => {
    const state = makeState({ ownership: web([0, 0, 0]) })
    expect(rejectCode(state, { type: 'sellBackdoor', playerId: A, squareId: 'forum' })).toBe('NO_BUILDING')
  })
})

describe('mortgage', () => {
  it('mortgages a node for its mortgage value', () => {
    const { state, events } = act(makeState({ ownership: { 'vpn-node': { owner: A } } }), {
      type: 'mortgage',
      playerId: A,
      squareId: 'vpn-node',
    })
    expect(player(state, A).cash).toBe(1600)
    expect(state.ownership['vpn-node']?.mortgaged).toBe(true)
    expect(events).toContainEqual({ type: 'mortgaged', playerId: A, squareId: 'vpn-node' })
  })

  it('refuses when the family has buildings', () => {
    const state = makeState({ ownership: web([1, 0, 0]) })
    expect(rejectCode(state, { type: 'mortgage', playerId: A, squareId: 'blog' })).toBe('HAS_BUILDINGS')
  })

  it('refuses an already mortgaged square', () => {
    const state = makeState({ ownership: { 'vpn-node': { owner: A, mortgaged: true } } })
    expect(rejectCode(state, { type: 'mortgage', playerId: A, squareId: 'vpn-node' })).toBe('MORTGAGED')
  })

  it('reactivates for the mortgage value plus 10 % rounded up', () => {
    const start = makeState({ ownership: { minitel: { owner: A, mortgaged: true }, datacenter: { owner: A, mortgaged: true } } })
    const state = act(start, { type: 'unmortgage', playerId: A, squareId: 'minitel' }).state
    expect(player(state, A).cash).toBe(1467)
    expect(state.ownership.minitel?.mortgaged).toBe(false)
    const after = act(state, { type: 'unmortgage', playerId: A, squareId: 'datacenter' }).state
    expect(player(after, A).cash).toBe(1467 - 83)
  })

  it('refuses to reactivate during a debt', () => {
    const state = makeState({
      ownership: { minitel: { owner: A, mortgaged: true } },
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 5000, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    expect(rejectCode(state, { type: 'unmortgage', playerId: A, squareId: 'minitel' })).toBe('WRONG_PHASE')
  })

  it('refuses to reactivate an active square', () => {
    const state = makeState({ ownership: { minitel: { owner: A } } })
    expect(rejectCode(state, { type: 'unmortgage', playerId: A, squareId: 'minitel' })).toBe('NOT_MORTGAGED')
  })
})
