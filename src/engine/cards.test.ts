import { describe, expect, it } from 'vitest'
import { cardIdByTitle } from './board/cards'
import { drawCard } from './cards'
import { A, B, C, D, act, forceDice, makeState, player, roll } from './testUtils'
import type { DeckKind } from './types'

function drawing(deck: DeckKind, title: string, options: Parameters<typeof makeState>[0] = {}) {
  const base = makeState(options)
  const id = cardIdByTitle(deck, title)
  base.decks[deck] = [id, ...base.decks[deck].filter((c) => c !== id)]
  return base
}

const fromExploit = (position: number) => {
  const map: Record<number, [number, number]> = { 2: [1, 1], 15: [1, 1], 27: [1, 1] }
  return { start: position - 2, dice: map[position] as [number, number] }
}

describe('drawing', () => {
  it('puts a played card under its deck', () => {
    const start = drawing('exploit', 'Bug bounty', { overrides: [{ position: 0, cash: 500 }] })
    const { state, events } = roll(start, [1, 1])
    expect(player(state, A).cash).toBe(650)
    expect(state.decks.exploit.at(-1)).toBe(cardIdByTitle('exploit', 'Bug bounty'))
    expect(events).toContainEqual({ type: 'cardDrawn', playerId: A, deck: 'exploit', cardId: cardIdByTitle('exploit', 'Bug bounty') })
  })

  it('keeps the decryption key out of the deck', () => {
    const start = drawing('patch', 'Clé de déchiffrement', { overrides: [{ position: 6 }] })
    const { state } = roll(start, [1, 1])
    expect(player(state, A).keys).toEqual([cardIdByTitle('patch', 'Clé de déchiffrement')])
    expect(state.decks.patch).toHaveLength(15)
  })
})

describe('money cards', () => {
  it('credits a gain', () => {
    const { state } = roll(drawing('patch', 'Divulgation responsable', { overrides: [{ position: 6, cash: 500 }] }), [1, 1])
    expect(player(state, A).cash).toBe(700)
  })

  it('charges a payment to the bank', () => {
    const { state } = roll(drawing('patch', 'Facture du fournisseur cloud', { overrides: [{ position: 6, cash: 500 }] }), [1, 1])
    expect(player(state, A).cash).toBe(400)
  })

  it('charges per building for the security audit', () => {
    const start = drawing('patch', 'Audit de sécurité', {
      overrides: [{ position: 6, cash: 1000 }],
      ownership: {
        forum: { owner: A, level: 2 },
        blog: { owner: A, level: 2 },
        'online-shop': { owner: A, level: 1 },
        'ai-kernel': { owner: A, level: 5 },
        'state-mainframe': { owner: A, level: 4 },
        satellite: { owner: B, level: 3 },
      },
    })
    const { state } = roll(start, [1, 1])
    expect(player(state, A).cash).toBe(1000 - (9 * 40 + 115))
  })

  it('pays 315 for 5 backdoors and 1 rootkit', () => {
    const start = drawing('patch', 'Audit de sécurité', {
      overrides: [{ position: 6, cash: 1000 }],
      ownership: { forum: { owner: A, level: 2 }, blog: { owner: A, level: 2 }, 'online-shop': { owner: A, level: 1 }, 'ai-kernel': { owner: A, level: 5 } },
    })
    expect(player(roll(start, [1, 1]).state, A).cash).toBe(685)
  })
})

describe('cards between players', () => {
  it('pays 50 to each other player', () => {
    const start = drawing('exploit', 'Conférence de sécurité', { players: 4, overrides: [{ position: 0, cash: 500 }] })
    const { state } = roll(start, [1, 1])
    expect(player(state, A).cash).toBe(350)
    for (const id of [B, C, D]) expect(player(state, id).cash).toBe(1550)
  })

  it('opens a debt on the remaining creditor when the cash runs out', () => {
    const start = drawing('exploit', 'Conférence de sécurité', { players: 4, overrides: [{ position: 0, cash: 120 }] })
    const { state } = roll(start, [1, 1])
    expect(player(state, B).cash).toBe(1550)
    expect(player(state, C).cash).toBe(1550)
    expect(state.phase).toMatchObject({ kind: 'debt', debtor: A, payments: [{ to: D, amount: 50, reason: 'card' }] })
  })

  it('collects 10 from each other player, each one possibly in debt', () => {
    const start = drawing('patch', 'Serveur de jeu partagé', { players: 3, overrides: [{ position: 6 }, { cash: 5 }] })
    let state = roll(start, [1, 1]).state
    expect(state.phase).toMatchObject({ kind: 'debt', debtor: B, resume: { kind: 'collectFrom', payers: [C] } })
    state = act(state, { type: 'declareBankruptcy', playerId: B }).state
    expect(player(state, A).cash).toBe(1500 + 5 + 10)
    expect(player(state, C).cash).toBe(1490)
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: true })
  })
})

describe('movement cards', () => {
  it('moves forward to the target with salary when passing Boot', () => {
    const { start, dice } = fromExploit(27)
    const base = drawing('exploit', 'Pivot latéral', { overrides: [{ position: start, cash: 300 }] })
    const { state } = roll(base, dice)
    expect(player(state, A)).toMatchObject({ position: 19, cash: 500 })
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'online-shop' })
  })

  it('moves back 3 squares from square 2 to square 39 without salary', () => {
    const base = drawing('exploit', 'Rollback', { overrides: [{ position: 0, cash: 300 }] })
    const { state, events } = roll(base, [1, 1])
    expect(player(state, A)).toMatchObject({ position: 39, cash: 300 })
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'ai-kernel' })
    expect(events).toContainEqual({ type: 'moved', playerId: A, path: [1, 0, 39], backward: true })
  })

  it('moves back to the Minitel without salary', () => {
    const base = drawing('patch', 'Cache vidé', { overrides: [{ position: 20, cash: 300 }] })
    const { state } = roll(base, [1, 1])
    expect(player(state, A)).toMatchObject({ position: 1, cash: 300 })
  })

  it('sends to quarantine', () => {
    const base = drawing('exploit', 'Repéré par l’antivirus', { overrides: [{ position: 0 }] })
    const { state } = roll(base, [1, 1])
    expect(player(state, A)).toMatchObject({ position: 10, quarantine: { failedAttempts: 0 } })
  })
})

describe('Tunnel chiffré and Ping', () => {
  it('pays double rent on an owned node', () => {
    const id = cardIdByTitle('exploit', 'Tunnel chiffré')
    const start = makeState({
      overrides: [{ position: 13 }],
      ownership: { 'tor-node': { owner: B }, 'vpn-node': { owner: B } },
      decks: { exploit: [id] },
    })
    const { state } = roll(start, [1, 1])
    expect(player(state, A).position).toBe(18)
    expect(player(state, A).cash).toBe(1400)
    expect(player(state, B).cash).toBe(1600)
  })

  it('reaches square 36 from square 35', () => {
    const id = cardIdByTitle('exploit', 'Tunnel chiffré')
    const state = makeState({ overrides: [{ position: 35 }], decks: { exploit: [id] } })
    const ctx = { state, events: [] }
    drawCard(ctx, 'exploit')
    expect(player(state, A).position).toBe(36)
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'mesh-node' })
  })

  it('moves from square 35 to the next node', () => {
    const id = cardIdByTitle('exploit', 'Tunnel chiffré')
    const start = makeState({ overrides: [{ position: 25 }], decks: { exploit: [id] } })
    const { state } = roll(start, [1, 1])
    expect(player(state, A).position).toBe(36)
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'mesh-node' })
  })

  it('rolls and pays 10 times the dice on an owned service', () => {
    const id = cardIdByTitle('exploit', 'Ping')
    const start = forceDice(makeState({ overrides: [{ position: 25 }], ownership: { cloud: { owner: B } }, decks: { exploit: [id] } }), [[1, 1], [2, 3]])
    const { state, events } = act(start, { type: 'rollDice', playerId: A })
    expect(player(state, A).position).toBe(33)
    expect(player(state, A).cash).toBe(1450)
    expect(events.filter((e) => e.type === 'diceRolled').at(-1)).toMatchObject({ dice: [2, 3], purpose: 'serviceRent' })
  })

  it('offers to buy a free service', () => {
    const id = cardIdByTitle('exploit', 'Ping')
    const start = makeState({ overrides: [{ position: 0 }], decks: { exploit: [id] } })
    const { state } = roll(start, [1, 1])
    expect(player(state, A).position).toBe(13)
    expect(state.phase).toEqual({ kind: 'buyDecision', squareId: 'datacenter' })
  })
})
