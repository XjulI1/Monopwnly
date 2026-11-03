import { describe, expect, it } from 'vitest'
import { rentFor } from './rent'
import { A, B, makeState, player, roll } from './testUtils'

describe('system rent', () => {
  it('charges the base rent when the family is incomplete', () => {
    expect(rentFor(makeState({ ownership: { forum: { owner: B } } }), 'forum', 7)).toBe(14)
  })

  it('doubles the base rent for a complete family', () => {
    const state = makeState({ ownership: { forum: { owner: B }, blog: { owner: B }, 'online-shop': { owner: B } } })
    expect(rentFor(state, 'forum', 7)).toBe(28)
  })

  it('doubles even when another system of the family is mortgaged', () => {
    const state = makeState({
      ownership: { forum: { owner: B }, blog: { owner: B, mortgaged: true }, 'online-shop': { owner: B } },
    })
    expect(rentFor(state, 'forum', 7)).toBe(28)
  })

  it('charges the rent of each building level', () => {
    const levels = [80, 225, 610, 800, 990]
    levels.forEach((rent, i) => {
      const state = makeState({ ownership: { 'online-shop': { owner: B, level: (i + 1) as 1 | 2 | 3 | 4 | 5 } } })
      expect(rentFor(state, 'online-shop', 7)).toBe(rent)
    })
    expect(rentFor(makeState({ ownership: { 'ai-kernel': { owner: B, level: 5 } } }), 'ai-kernel', 7)).toBe(4215)
  })
})

describe('node rent', () => {
  it('depends on the number of nodes owned, mortgaged included', () => {
    const nodes = ['vpn-node', 'tor-node', 'proxy-node', 'mesh-node']
    ;[25, 50, 100, 200].forEach((rent, i) => {
      const ownership = Object.fromEntries(nodes.slice(0, i + 1).map((id) => [id, { owner: B, mortgaged: id !== 'vpn-node' }]))
      expect(rentFor(makeState({ ownership }), 'vpn-node', 7)).toBe(rent)
    })
  })

  it('doubles with the double modifier', () => {
    const state = makeState({ ownership: { 'tor-node': { owner: B }, 'vpn-node': { owner: B } } })
    expect(rentFor(state, 'tor-node', 7, 'double')).toBe(100)
  })
})

describe('service rent', () => {
  it('charges 4 times the dice with one service', () => {
    expect(rentFor(makeState({ ownership: { datacenter: { owner: B } } }), 'datacenter', 8)).toBe(32)
  })

  it('charges 10 times the dice with both services', () => {
    const state = makeState({ ownership: { datacenter: { owner: B }, cloud: { owner: B } } })
    expect(rentFor(state, 'cloud', 10)).toBe(100)
  })
})

describe('no rent', () => {
  it('is zero on a mortgaged or free square', () => {
    expect(rentFor(makeState({ ownership: { forum: { owner: B, mortgaged: true } } }), 'forum', 7)).toBe(0)
    expect(rentFor(makeState(), 'forum', 7)).toBe(0)
  })

  it('charges nothing on an own square', () => {
    const { state, events } = roll(makeState({ overrides: [{ position: 12 }], ownership: { forum: { owner: A } } }), [1, 3])
    expect(player(state, A).cash).toBe(1500)
    expect(events.some((e) => e.type === 'paid')).toBe(false)
  })
})

describe('rent payment', () => {
  it('pays the rent to the owner using the dice of the roll for services', () => {
    const { state } = roll(makeState({ overrides: [{ position: 5 }], ownership: { datacenter: { owner: B } } }), [3, 5])
    expect(player(state, A).cash).toBe(1500 - 32)
    expect(player(state, B).cash).toBe(1500 + 32)
  })

  it('opens a debt when the rent is not covered', () => {
    const start = makeState({ overrides: [{ position: 15, cash: 100 }], ownership: { 'online-shop': { owner: B, level: 3 } } })
    const { state } = roll(start, [1, 3])
    expect(state.phase).toMatchObject({ kind: 'debt', debtor: A, payments: [{ to: B, amount: 610, reason: 'rent' }] })
  })
})
