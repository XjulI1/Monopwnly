import { describe, expect, it } from 'vitest'
import { applyAction, cardIdByTitle, type GameState, type Phase } from '../engine'
import { A, B, C, D, act, makeState, roll } from '../engine/testUtils'
import { bidLimits, checkAction, debtSummary, manageableSquares, managementOptions } from './legalActions'

const retro = (levels: [number, number]) => ({
  minitel: { owner: A, level: levels[0] as 0 },
  'modem-56k': { owner: A, level: levels[1] as 0 },
})

function option(state: GameState, squareId: string, type: string) {
  return managementOptions(state, A, squareId).find((o) => o.type === type)
}

describe('checkAction', () => {
  it('accepts an action the engine accepts', () => {
    expect(checkAction(makeState(), { type: 'rollDice', playerId: A })).toEqual({ allowed: true, reason: null })
  })

  it('gives the engine message when the action is rejected', () => {
    const check = checkAction(makeState(), { type: 'endTurn', playerId: A })
    expect(check.allowed).toBe(false)
    expect(check.reason).toBe('Cette action n’est pas possible maintenant.')
  })

  it('never modifies the state', () => {
    const state = makeState({ ownership: retro([0, 0]) })
    const before = structuredClone(state)
    checkAction(state, { type: 'buildBackdoor', playerId: A, squareId: 'minitel' })
    expect(state).toEqual(before)
  })
})

describe('management options', () => {
  it('refuses to build on an incomplete family with the engine reason', () => {
    const state = makeState({ ownership: { forum: { owner: A }, blog: { owner: A } } })
    expect(option(state, 'forum', 'buildBackdoor')).toMatchObject({
      allowed: false,
      reason: 'Il faut posséder toute la famille pour construire.',
      amount: 100,
    })
  })

  it('refuses an uneven construction', () => {
    const state = makeState({ ownership: retro([1, 0]) })
    expect(option(state, 'minitel', 'buildBackdoor')).toMatchObject({
      allowed: false,
      reason: 'Construisez d’abord sur les autres systèmes de la famille.',
    })
    expect(option(state, 'modem-56k', 'buildBackdoor')).toMatchObject({ allowed: true, rootkit: false })
  })

  it('offers a rootkit after 4 backdoors', () => {
    const state = makeState({ ownership: retro([4, 4]) })
    expect(option(state, 'minitel', 'buildBackdoor')).toMatchObject({ allowed: true, rootkit: true, amount: 50 })
  })

  it('offers the sale of a building for half its cost', () => {
    const state = makeState({ ownership: retro([1, 1]) })
    expect(option(state, 'minitel', 'sellBackdoor')).toMatchObject({ allowed: true, rootkit: false, amount: 25 })
  })

  it('refuses to mortgage a square of a built family', () => {
    const state = makeState({ ownership: retro([1, 0]) })
    expect(option(state, 'modem-56k', 'mortgage')).toMatchObject({
      allowed: false,
      reason: 'Revendez d’abord les constructions de la famille.',
      amount: 30,
    })
  })

  it('offers reactivation instead of mortgage on a mortgaged square', () => {
    const state = makeState({ ownership: { blog: { owner: A, mortgaged: true } } })
    const types = managementOptions(state, A, 'blog').map((o) => o.type)
    expect(types).toEqual(['buildBackdoor', 'sellBackdoor', 'unmortgage'])
    expect(option(state, 'blog', 'unmortgage')).toMatchObject({ allowed: true, amount: 99 })
  })

  it('only offers mortgage on nodes and services', () => {
    const state = makeState({ ownership: { 'tor-node': { owner: A }, cloud: { owner: A } } })
    expect(managementOptions(state, A, 'tor-node').map((o) => o.type)).toEqual(['mortgage'])
    expect(managementOptions(state, A, 'cloud').map((o) => o.type)).toEqual(['mortgage'])
  })

  it('only offers sale and mortgage during a debt', () => {
    const phase: Phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const state = makeState({ ownership: { ...retro([1, 1]), blog: { owner: A, mortgaged: true } }, phase })
    expect(managementOptions(state, A, 'minitel').map((o) => o.type)).toEqual(['sellBackdoor', 'mortgage'])
    expect(managementOptions(state, A, 'blog').map((o) => o.type)).toEqual(['sellBackdoor', 'mortgage'])
    expect(option(state, 'blog', 'mortgage')).toMatchObject({ allowed: false, reason: 'Cette case est déjà en veille.' })
  })

  it('offers nothing on a square of another player or a free square', () => {
    const state = makeState({ ownership: { forum: { owner: B } } })
    expect(managementOptions(state, A, 'forum')).toEqual([])
    expect(managementOptions(state, A, 'blog')).toEqual([])
    expect(managementOptions(state, A, 'boot')).toEqual([])
  })

  it('offers nothing outside the phases where management is allowed', () => {
    const state = makeState({ ownership: retro([0, 0]), phase: { kind: 'buyDecision', squareId: 'blog' } })
    expect(managementOptions(state, A, 'minitel')).toEqual([])
  })

  it('every allowed option is accepted by the engine', () => {
    const state = makeState({ ownership: { ...retro([2, 1]), blog: { owner: A, mortgaged: true }, 'tor-node': { owner: A } } })
    for (const squareId of ['minitel', 'modem-56k', 'blog', 'tor-node']) {
      for (const o of managementOptions(state, A, squareId)) {
        expect(applyAction(state, o.action).ok).toBe(o.allowed)
      }
    }
  })
})

describe('manageable squares', () => {
  it('lists the squares of the player where at least one action is legal', () => {
    const state = makeState({ ownership: { ...retro([0, 0]), blog: { owner: A }, forum: { owner: B } } })
    expect(manageableSquares(state, A).sort()).toEqual(['blog', 'minitel', 'modem-56k'])
  })

  it('leaves out a square where nothing is possible', () => {
    const state = makeState({ overrides: [{ cash: 10 }], ownership: { blog: { owner: A, mortgaged: true } } })
    expect(manageableSquares(state, A)).toEqual([])
  })

  it('is empty for a player the game is not waiting for', () => {
    const state = makeState({ ownership: { forum: { owner: B } } })
    expect(manageableSquares(state, B)).toEqual([])
  })

  it('only keeps sales and mortgages during a debt', () => {
    const phase: Phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const state = makeState({ ownership: { ...retro([1, 1]), blog: { owner: A, mortgaged: true } }, phase })
    expect(manageableSquares(state, A).sort()).toEqual(['minitel', 'modem-56k'])
  })
})

describe('bid limits', () => {
  const auction = (highBid: number, highBidder: string | null): Phase => ({
    kind: 'auction',
    squareId: 'forum',
    highBid,
    highBidder,
    bidders: [A, B],
    nextBidder: A,
  })

  it('starts at the engine minimum and stops at the cash of the bidder', () => {
    const state = makeState({ overrides: [{ cash: 300 }], phase: auction(0, null) })
    expect(bidLimits(state)).toEqual({ min: 10, max: 300 })
  })

  it('requires more than the best bid', () => {
    const state = makeState({ phase: auction(120, B) })
    expect(bidLimits(state)?.min).toBe(121)
    expect(applyAction(state, { type: 'placeBid', playerId: A, amount: 121 }).ok).toBe(true)
    expect(applyAction(state, { type: 'placeBid', playerId: A, amount: 120 }).ok).toBe(false)
  })

  it('is null outside an auction', () => {
    expect(bidLimits(makeState())).toBeNull()
  })
})

describe('debt summary', () => {
  function rentDebt() {
    const start = makeState({
      overrides: [{ position: 3, cash: 300 }],
      ownership: {
        'smart-fridge': { owner: B, level: 5 },
        'wifi-bulb': { owner: B, level: 5 },
        'ip-camera': { owner: B, level: 5 },
        minitel: { owner: A, level: 1 },
        'modem-56k': { owner: A, level: 1 },
      },
    })
    return roll(start, [2, 2]).state
  }

  it('describes the payment, its creditor, the cash and what can still be raised', () => {
    expect(debtSummary(rentDebt())).toEqual({
      debtor: A,
      payment: { to: B, amount: 370, reason: 'rent' },
      remaining: [],
      cash: 300,
      raisable: 110,
      covered: false,
      unavoidable: false,
    })
  })

  it('flags an unavoidable bankruptcy', () => {
    const state = rentDebt()
    const poor = structuredClone(state)
    const debtor = poor.players.find((p) => p.id === A)
    if (debtor) debtor.cash = 100
    expect(debtSummary(poor)).toMatchObject({ covered: false, unavoidable: true })
  })

  it('becomes covered once the cash reaches the amount due', () => {
    let state = rentDebt()
    state = act(state, { type: 'sellBackdoor', playerId: A, squareId: 'minitel' }).state
    expect(debtSummary(state)).toMatchObject({ cash: 325, raisable: 85, covered: false })
    state = act(state, { type: 'sellBackdoor', playerId: A, squareId: 'modem-56k' }).state
    state = act(state, { type: 'mortgage', playerId: A, squareId: 'minitel' }).state
    state = act(state, { type: 'mortgage', playerId: A, squareId: 'modem-56k' }).state
    expect(debtSummary(state)).toMatchObject({ cash: 410, raisable: 0, covered: true, unavoidable: false })
  })

  it('lists the payments left after the current one', () => {
    const start = makeState({
      players: 4,
      overrides: [{ position: 25, cash: 40 }],
      decks: { exploit: [cardIdByTitle('exploit', 'Conférence de sécurité')] },
    })
    const summary = debtSummary(roll(start, [1, 1]).state)
    expect(summary?.payment).toEqual({ to: B, amount: 50, reason: 'card' })
    expect(summary?.remaining).toEqual([
      { to: C, amount: 50, reason: 'card' },
      { to: D, amount: 50, reason: 'card' },
    ])
  })

  it('is null outside a debt', () => {
    expect(debtSummary(makeState())).toBeNull()
  })
})
