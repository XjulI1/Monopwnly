import { describe, expect, it } from 'vitest'
import { A, B, makeState } from '../engine/testUtils'
import { playerView } from './playerView'
import { expectedRent, familyOutlook, reserve, squareValue } from './valuation'

describe('familyOutlook', () => {
  it('tells when a square completes, approaches, blocks or lies in a family an opponent has started', () => {
    const view = playerView(makeState({ ownership: { minitel: { owner: A }, forum: { owner: B }, blog: { owner: B }, intranet: { owner: B } } }))
    expect(familyOutlook(view, 'modem-56k', A)).toEqual({ completes: true, approaches: true, blocks: false, contested: false })
    expect(familyOutlook(view, 'online-shop', A)).toEqual({ completes: false, approaches: false, blocks: true, contested: true })
    expect(familyOutlook(view, 'work-mail', A)).toEqual({ completes: false, approaches: false, blocks: false, contested: true })
    expect(familyOutlook(view, 'wifi-bulb', A)).toEqual({ completes: false, approaches: false, blocks: false, contested: false })
  })
})

describe('squareValue', () => {
  it('is the price at the easy level', () => {
    const view = playerView(makeState({ ownership: { minitel: { owner: A } } }))
    expect(squareValue(view, 'modem-56k', A, 'easy')).toBe(60)
  })

  it('adds a family premium at the normal level when the square completes a family', () => {
    const view = playerView(makeState({ ownership: { minitel: { owner: A } } }))
    const alone = playerView(makeState())
    expect(squareValue(view, 'modem-56k', A, 'normal')).toBeGreaterThan(squareValue(alone, 'modem-56k', A, 'normal'))
    expect(squareValue(alone, 'modem-56k', A, 'normal')).toBe(60)
  })

  it('discounts a system of a family an opponent has started, which cannot be completed without trading', () => {
    const view = playerView(makeState({ ownership: { intranet: { owner: B } } }))
    expect(squareValue(view, 'work-mail', A, 'normal')).toBe(140 * 0.85)
    expect(squareValue(view, 'work-mail', A, 'easy')).toBe(140)
  })

  it('adds a blocking premium at the hard level only', () => {
    const view = playerView(makeState({ ownership: { forum: { owner: B }, blog: { owner: B } } }))
    const free = playerView(makeState())
    expect(squareValue(view, 'online-shop', A, 'normal')).toBe(200 * 0.85)
    expect(squareValue(view, 'online-shop', A, 'hard')).toBeGreaterThan(squareValue(free, 'online-shop', A, 'hard'))
  })
})

describe('expectedRent', () => {
  it('grows with the building level', () => {
    const view = playerView(makeState({ players: 3, ownership: { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: A } } }))
    const rents = [0, 1, 2, 3, 4, 5].map((level) => expectedRent(view, 'blog', A, level))
    for (let level = 1; level <= 5; level++) expect(rents[level]).toBeGreaterThan(rents[level - 1] ?? 0)
  })

  it('counts every opponent who may land on the square', () => {
    const two = playerView(makeState({ players: 2, ownership: { blog: { owner: A } } }))
    const four = playerView(makeState({ players: 4, ownership: { blog: { owner: A } } }))
    expect(expectedRent(four, 'blog', A)).toBeCloseTo(expectedRent(two, 'blog', A) * 3)
  })
})

describe('reserve', () => {
  it('rises when an opponent rootkit is within reach of the dice', () => {
    const exposed = playerView(makeState({ overrides: [{ position: 33 }], ownership: { 'ai-kernel': { owner: B, level: 5 } } }))
    const safe = playerView(makeState({ overrides: [{ position: 33 }] }))
    expect(reserve(exposed, A, 'normal')).toBeGreaterThan(reserve(safe, A, 'normal'))
  })

  it('weighs the rent risk with a prudence factor of its own at the hard level', () => {
    const exposed = playerView(makeState({ overrides: [{ position: 33 }], ownership: { 'ai-kernel': { owner: B, level: 5 } } }))
    expect(reserve(exposed, A, 'hard')).not.toBe(reserve(exposed, A, 'normal'))
    expect(reserve(exposed, A, 'hard')).toBeGreaterThan(reserve(playerView(makeState({ overrides: [{ position: 33 }] })), A, 'hard'))
  })

  it('is a fixed 100 Ᵽ at the easy level', () => {
    const exposed = playerView(makeState({ overrides: [{ position: 33 }], ownership: { 'ai-kernel': { owner: B, level: 5 } } }))
    expect(reserve(exposed, A, 'easy')).toBe(100)
    expect(reserve(playerView(makeState()), A, 'easy')).toBe(100)
  })
})
