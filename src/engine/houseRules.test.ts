import { describe, expect, it } from 'vitest'
import { rentIfLanded } from './queries'
import { A, B, C, act, makeState, player, rejectCode, roll, withCardOnTop, type StateOptions } from './testUtils'
import type { BuildingLevel, DeckKind, GameEvent, GameSettings, GameState } from './types'

const JACKPOT: Partial<GameSettings> = { dmzJackpot: true }

function game(settings: Partial<GameSettings>, options: StateOptions = {}): GameState {
  return makeState({ ...options, settings: { ...options.settings, ...settings } })
}

function bankPayments(events: GameEvent[]): GameEvent[] {
  return events.filter((e) => e.type === 'paid' && e.to === 'bank')
}

describe('DMZ jackpot', () => {
  it('sends the ransomware tax to the pot instead of the bank', () => {
    const { state, events } = roll(game(JACKPOT, { overrides: [{ position: 0, cash: 500 }] }), [2, 3])
    expect(player(state, A).cash).toBe(300)
    expect(state.dmzPot).toBe(200)
    expect(events).toContainEqual({ type: 'potIncreased', playerId: A, amount: 200, reason: 'tax' })
    expect(bankPayments(events)).toEqual([])
  })

  it('sends the GDPR fine to the pot', () => {
    const { state } = roll(game(JACKPOT, { overrides: [{ position: 35 }] }), [1, 2])
    expect(state.dmzPot).toBe(100)
  })

  const buildings: StateOptions['ownership'] = {
    minitel: { owner: A, level: 2 },
    'modem-56k': { owner: A, level: 5 },
  }
  const cards: { deck: DeckKind; title: string; amount: number }[] = [
    { deck: 'exploit', title: 'Phishing raté', amount: 15 },
    { deck: 'exploit', title: 'Mise à jour forcée', amount: 2 * 25 + 100 },
    { deck: 'patch', title: 'Facture du fournisseur cloud', amount: 100 },
    { deck: 'patch', title: 'Assurance cyber', amount: 50 },
    { deck: 'patch', title: 'Licence expirée', amount: 50 },
    { deck: 'patch', title: 'Formation obligatoire', amount: 20 },
    { deck: 'patch', title: 'Audit de sécurité', amount: 2 * 40 + 115 },
  ]

  it.each(cards)('sends the payment of « $title » to the pot', ({ deck, title, amount }) => {
    const start = game(JACKPOT, { overrides: [{ position: deck === 'exploit' ? 0 : 6, cash: 1000 }], ownership: buildings })
    start.dmzPot = 200
    const { state, events } = roll(withCardOnTop(start, deck, title), [1, 1])
    expect(player(state, A).cash).toBe(1000 - amount)
    expect(state.dmzPot).toBe(200 + amount)
    expect(events).toContainEqual({ type: 'potIncreased', playerId: A, amount, reason: 'card' })
    expect(bankPayments(events)).toEqual([])
  })

  it('leaves the payments between players out of the pot', () => {
    const start = withCardOnTop(game(JACKPOT, { players: 3, overrides: [{ position: 0 }] }), 'exploit', 'Conférence de sécurité')
    const { state } = roll(start, [1, 1])
    expect(player(state, A).cash).toBe(1400)
    expect(player(state, B).cash).toBe(1550)
    expect(player(state, C).cash).toBe(1550)
    expect(state.dmzPot).toBe(0)
  })

  it('leaves purchases, auctions, buildings, reactivations and the quarantine fine out of the pot', () => {
    const bought = act(game(JACKPOT, { overrides: [{ position: 17 }], phase: { kind: 'buyDecision', squareId: 'blog' } }), {
      type: 'buyProperty',
      playerId: A,
    })
    expect(player(bought.state, A).cash).toBe(1320)
    expect(bought.state.dmzPot).toBe(0)

    let auction = act(game(JACKPOT, { overrides: [{ position: 16 }], phase: { kind: 'buyDecision', squareId: 'forum' } }), {
      type: 'declineProperty',
      playerId: A,
    }).state
    const first = auction.phase.kind === 'auction' ? auction.phase.nextBidder : A
    auction = act(auction, { type: 'placeBid', playerId: first, amount: 50 }).state
    const second = auction.phase.kind === 'auction' ? auction.phase.nextBidder : B
    auction = act(auction, { type: 'passBid', playerId: second }).state
    expect(auction.ownership.forum?.owner).toBe(first)
    expect(auction.dmzPot).toBe(0)

    const family = { minitel: { owner: A }, 'modem-56k': { owner: A } }
    const built = act(game(JACKPOT, { ownership: family }), { type: 'buildBackdoor', playerId: A, squareId: 'minitel' })
    expect(built.state.dmzPot).toBe(0)

    const reactivated = act(game(JACKPOT, { ownership: { minitel: { owner: A, mortgaged: true } } }), {
      type: 'unmortgage',
      playerId: A,
      squareId: 'minitel',
    })
    expect(reactivated.state.dmzPot).toBe(0)

    const fined = act(game(JACKPOT, { overrides: [{ position: 10, quarantine: { failedAttempts: 0 } }] }), {
      type: 'payQuarantineFine',
      playerId: A,
    })
    expect(player(fined.state, A).cash).toBe(1450)
    expect(fined.state.dmzPot).toBe(0)
  })

  it('feeds the pot when a tax is paid after a debt', () => {
    const start = game(JACKPOT, {
      overrides: [{ cash: 250 }],
      phase: { kind: 'debt', debtor: A, payments: [{ to: 'bank', amount: 200, reason: 'tax' }], resume: { kind: 'postRoll' } },
    })
    const { state, events } = act(start, { type: 'payDebt', playerId: A })
    expect(state.dmzPot).toBe(200)
    expect(events).toContainEqual({ type: 'potIncreased', playerId: A, amount: 200, reason: 'tax' })
  })

  it('leaves a bankruptcy to the bank out of the pot', () => {
    const start = game(JACKPOT, {
      players: 3,
      overrides: [{ cash: 50 }],
      phase: { kind: 'debt', debtor: A, payments: [{ to: 'bank', amount: 200, reason: 'tax' }], resume: { kind: 'postRoll' } },
    })
    const { state } = act(start, { type: 'declareBankruptcy', playerId: A })
    expect(player(state, A).bankrupt).toBe(true)
    expect(state.dmzPot).toBe(0)
  })

  it('gives the whole pot to the player who stops on the DMZ', () => {
    const start = game(JACKPOT, { overrides: [{ position: 17, cash: 500 }] })
    start.dmzPot = 300
    const { state, events } = roll(start, [1, 2])
    expect(player(state, A).cash).toBe(800)
    expect(state.dmzPot).toBe(0)
    expect(events).toContainEqual({ type: 'potCollected', playerId: A, amount: 300 })
  })

  it('emits nothing on the DMZ when the pot is empty', () => {
    const { state, events } = roll(game(JACKPOT, { overrides: [{ position: 17, cash: 500 }] }), [1, 2])
    expect(player(state, A).cash).toBe(500)
    expect(events.some((e) => e.type === 'potCollected')).toBe(false)
  })

  it('pays the bank and gives nothing on the DMZ without the option', () => {
    const taxed = roll(makeState({ overrides: [{ position: 0, cash: 500 }] }), [2, 3])
    expect(taxed.state.dmzPot).toBe(0)
    expect(taxed.events).toContainEqual({ type: 'paid', from: A, to: 'bank', amount: 200, reason: 'tax' })
    const parked = roll(makeState({ overrides: [{ position: 17, cash: 500 }] }), [1, 2])
    expect(player(parked.state, A).cash).toBe(500)
    expect(parked.events.some((e) => e.type === 'potCollected' || e.type === 'potIncreased')).toBe(false)
  })
})

describe('double bonus on Boot', () => {
  const BONUS: Partial<GameSettings> = { doubleBootBonus: true }
  const types = (events: GameEvent[]) => events.map((e) => e.type)

  it('pays 400 to a player who stops on Boot', () => {
    const { state, events } = roll(game(BONUS, { overrides: [{ position: 35 }] }), [2, 3])
    expect(player(state, A)).toMatchObject({ position: 0, cash: 1900 })
    expect(types(events).filter((t) => t === 'passedBoot' || t === 'bootBonus')).toEqual(['passedBoot', 'bootBonus'])
    expect(events.filter((e) => e.type === 'paid' && e.reason === 'salary')).toEqual([
      { type: 'paid', from: 'bank', to: A, amount: 200, reason: 'salary' },
      { type: 'paid', from: 'bank', to: A, amount: 200, reason: 'salary' },
    ])
  })

  it('still pays 200 to a player who only passes Boot', () => {
    const { state, events } = roll(game(BONUS, { overrides: [{ position: 35 }] }), [5, 3])
    expect(player(state, A)).toMatchObject({ position: 3, cash: 1700 })
    expect(types(events)).not.toContain('bootBonus')
  })

  it.each([
    { deck: 'exploit' as const, title: 'Redémarrage à chaud', position: 0 },
    { deck: 'patch' as const, title: 'Réinitialisation d’usine', position: 6 },
  ])('pays 400 to a player sent to Boot by « $title »', ({ deck, title, position }) => {
    const start = withCardOnTop(game(BONUS, { overrides: [{ position }] }), deck, title)
    const { state, events } = roll(start, [1, 1])
    expect(player(state, A)).toMatchObject({ position: 0, cash: 1900 })
    expect(types(events)).toContain('bootBonus')
  })

  it('pays nothing to a player sent to quarantine', () => {
    const { state, events } = roll(game(BONUS, { overrides: [{ position: 28 }] }), [1, 1])
    expect(player(state, A)).toMatchObject({ position: 10, cash: 1500 })
    expect(types(events)).not.toContain('bootBonus')
  })

  it('pays 200 on Boot without the option', () => {
    const { state, events } = roll(makeState({ overrides: [{ position: 35 }] }), [2, 3])
    expect(player(state, A).cash).toBe(1700)
    expect(types(events)).not.toContain('bootBonus')
  })
})

describe('free building', () => {
  const FREE: Partial<GameSettings> = { freeBuilding: true }
  const retro = (minitel: BuildingLevel, modem: BuildingLevel): StateOptions['ownership'] => ({
    minitel: { owner: A, level: minitel },
    'modem-56k': { owner: A, level: modem },
  })
  const build = { type: 'buildBackdoor', playerId: A, squareId: 'minitel' } as const
  const sell = { type: 'sellBackdoor', playerId: A, squareId: 'minitel' } as const

  it('lets a player build unevenly within a family', () => {
    const { state } = act(game(FREE, { ownership: retro(2, 0) }), build)
    expect(state.ownership.minitel?.level).toBe(3)
  })

  it('installs a rootkit on a system with 4 backdoors whatever the rest of the family', () => {
    const { state, events } = act(game(FREE, { ownership: retro(4, 0) }), build)
    expect(state.ownership.minitel?.level).toBe(5)
    expect(events).toContainEqual({ type: 'backdoorBuilt', playerId: A, squareId: 'minitel', level: 5 })
  })

  it('still needs 4 backdoors on the system itself before a rootkit', () => {
    const { state } = act(game(FREE, { ownership: retro(3, 4) }), build)
    expect(state.ownership.minitel?.level).toBe(4)
  })

  it('lets a player sell unevenly within a family', () => {
    const { state } = act(game(FREE, { ownership: retro(1, 3) }), sell)
    expect(state.ownership.minitel?.level).toBe(0)
  })

  it('still requires the whole family, no mortgaged system, bank stock and cash', () => {
    expect(rejectCode(game(FREE, { ownership: { minitel: { owner: A } } }), build)).toBe('GROUP_INCOMPLETE')
    const mortgaged = { minitel: { owner: A }, 'modem-56k': { owner: A, mortgaged: true } }
    expect(rejectCode(game(FREE, { ownership: mortgaged }), build)).toBe('MORTGAGED')
    expect(rejectCode(game(FREE, { ownership: retro(2, 0), bankStock: { backdoors: 0, rootkits: 12 } }), build)).toBe('NO_STOCK')
    expect(rejectCode(game(FREE, { ownership: retro(2, 0), overrides: [{ cash: 10 }] }), build)).toBe('INSUFFICIENT_FUNDS')
  })

  it('keeps building and selling even without the option', () => {
    expect(rejectCode(makeState({ ownership: retro(1, 0) }), build)).toBe('UNEVEN_BUILDING')
    expect(rejectCode(makeState({ ownership: retro(1, 3) }), sell)).toBe('UNEVEN_BUILDING')
  })
})

describe('no rent in quarantine', () => {
  const NO_RENT: Partial<GameSettings> = { noRentInQuarantine: true }
  const aliceInQuarantine = { position: 10, quarantine: { failedAttempts: 0 } }
  const owned = (squareId: string): StateOptions => ({
    current: 1,
    overrides: [aliceInQuarantine, { position: 0 }],
    ownership: { [squareId]: { owner: A } },
  })
  const bobAt = (state: GameState, position: number) => {
    player(state, B).position = position
    return state
  }

  it.each([
    { squareId: 'forum', from: 14, dice: [1, 1] as [number, number] },
    { squareId: 'tor-node', from: 15, dice: [1, 2] as [number, number] },
    { squareId: 'datacenter', from: 10, dice: [1, 2] as [number, number] },
  ])('waives the rent of $squareId while its owner is in quarantine', ({ squareId, from, dice }) => {
    const { state, events } = roll(bobAt(game(NO_RENT, owned(squareId)), from), dice)
    expect(player(state, B).cash).toBe(1500)
    expect(player(state, A).cash).toBe(1500)
    expect(events).toContainEqual({ type: 'rentWaived', playerId: B, ownerId: A, squareId })
    expect(events.some((e) => e.type === 'paid' && e.reason === 'rent')).toBe(false)
  })

  it('waives the double rent of « Tunnel chiffré »', () => {
    const start = withCardOnTop(bobAt(game(NO_RENT, owned('tor-node')), 13), 'exploit', 'Tunnel chiffré')
    const { state, events } = roll(start, [1, 1])
    expect(player(state, B)).toMatchObject({ position: 18, cash: 1500 })
    expect(events).toContainEqual({ type: 'rentWaived', playerId: B, ownerId: A, squareId: 'tor-node' })
  })

  it('waives the rent of « Ping » without rolling the dice', () => {
    const start = withCardOnTop(bobAt(game(NO_RENT, owned('datacenter')), 0), 'exploit', 'Ping')
    const { state, events } = roll(start, [1, 1])
    expect(player(state, B)).toMatchObject({ position: 13, cash: 1500 })
    expect(events.some((e) => e.type === 'diceRolled' && e.purpose === 'serviceRent')).toBe(false)
    expect(events).toContainEqual({ type: 'rentWaived', playerId: B, ownerId: A, squareId: 'datacenter' })
  })

  it('keeps the payments of the cards between players', () => {
    const start = withCardOnTop(bobAt(game(NO_RENT, owned('forum')), 0), 'exploit', 'Conférence de sécurité')
    const { state } = roll(start, [1, 1])
    expect(player(state, B).cash).toBe(1450)
    expect(player(state, A).cash).toBe(1550)
  })

  it('collects the rent of an owner who is not in quarantine', () => {
    const free = { ...owned('forum'), overrides: [{ position: 5 }, { position: 14 }] }
    const { state } = roll(game(NO_RENT, free), [1, 1])
    expect(player(state, B).cash).toBe(1486)
  })

  it('collects the rent of an owner in quarantine without the option', () => {
    const { state, events } = roll(bobAt(makeState(owned('forum')), 14), [1, 1])
    expect(player(state, B).cash).toBe(1486)
    expect(player(state, A).cash).toBe(1514)
    expect(events.some((e) => e.type === 'rentWaived')).toBe(false)
  })

  it('keeps the nominal rent of the square while its owner is in quarantine', () => {
    expect(rentIfLanded(game(NO_RENT, owned('forum')), 'forum')).toBe(14)
  })
})
