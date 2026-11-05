import { describe, expect, it } from 'vitest'
import { netWorth, type Action, type GameEvent, type GameState } from '../../engine'
import { A, B, C, act, forceDice, makeState, type StateOptions } from '../../engine/testUtils'
import { recordStatistics, startStatistics, type GameStatistics } from './statistics'

function game(options: StateOptions = {}, turnNumber = 1): GameState {
  const state = makeState(options)
  state.turnNumber = turnNumber
  return state
}

function after(stats: GameStatistics, before: GameState, action: Action): { stats: GameStatistics; state: GameState } {
  const { state, events } = act(before, action)
  return { stats: recordStatistics(stats, before, events, state), state }
}

function withEvents(before: GameState, events: GameEvent[], stats = startStatistics(before)): GameStatistics {
  return recordStatistics(stats, before, events, before)
}

const endOfTurn = { kind: 'postRoll', mayRollAgain: false } as const

describe('readings', () => {
  it('starts with a reading of the cash and net worth of every player', () => {
    const start = game({ overrides: [{ cash: 1200 }], ownership: { forum: { owner: A } } })
    expect(startStatistics(start).rounds).toEqual([
      {
        turn: 1,
        players: [
          { playerId: A, cash: 1200, netWorth: 1380 },
          { playerId: B, cash: 1500, netWorth: 1500 },
        ],
      },
    ])
  })

  it('takes a reading through the net worth query of the engine when a round starts', () => {
    const start = game({ current: 1, phase: endOfTurn, overrides: [{ cash: 900 }], ownership: { blog: { owner: A, level: 3 } } })
    const { stats, state } = after(startStatistics(start), start, { type: 'endTurn', playerId: B })
    expect(stats.rounds.map((round) => round.turn)).toEqual([1, 2])
    expect(stats.rounds[1]?.players).toEqual(state.players.map((p) => ({ playerId: p.id, cash: p.cash, netWorth: netWorth(state, p.id) })))
  })

  it('takes no reading when a turn starts inside the same round', () => {
    const start = game({ phase: endOfTurn })
    expect(after(startStatistics(start), start, { type: 'endTurn', playerId: A }).stats.rounds).toHaveLength(1)
  })

  it('leaves a bankrupt player out of the next readings', () => {
    const start = game({ players: 3, current: 2, phase: endOfTurn, overrides: [{}, { bankrupt: true }] }, 12)
    const { stats } = after(startStatistics(start), start, { type: 'endTurn', playerId: C })
    expect(stats.rounds.at(-1)).toMatchObject({ turn: 13 })
    expect(stats.rounds.at(-1)?.players.map((p) => p.playerId)).toEqual([A, C])
  })
})

describe('counters', () => {
  it('counts a rent on both sides', () => {
    const before = game({ overrides: [{}, { position: 17 }] })
    const stats = withEvents(before, [{ type: 'paid', from: B, to: A, amount: 250, reason: 'rent' }])
    expect(stats.players[A]?.rentCollected).toBe(250)
    expect(stats.players[B]?.rentPaid).toBe(250)
  })

  it('counts the taxes and fines, the salaries and the cards drawn', () => {
    const before = game()
    const stats = withEvents(before, [
      { type: 'paid', from: A, to: 'bank', amount: 200, reason: 'tax' },
      { type: 'paid', from: A, to: 'bank', amount: 50, reason: 'quarantineFine' },
      { type: 'paid', from: 'bank', to: A, amount: 200, reason: 'salary' },
      { type: 'cardDrawn', playerId: A, deck: 'patch', cardId: 'patch-06' },
    ])
    expect(stats.players[A]).toMatchObject({ taxesPaid: 250, salaries: 200, cardsDrawn: 1 })
  })

  it('counts a tax paid into the DMZ pot as a tax, and a card paid into it as nothing more', () => {
    const before = game({ settings: { dmzJackpot: true } })
    const stats = withEvents(before, [
      { type: 'potIncreased', playerId: A, amount: 200, reason: 'tax' },
      { type: 'potIncreased', playerId: A, amount: 100, reason: 'card' },
    ])
    expect(stats.players[A]?.taxesPaid).toBe(200)
  })

  it('counts the double bonus of Boot as a salary', () => {
    const before = game({ settings: { doubleBootBonus: true } })
    const stats = withEvents(before, [
      { type: 'paid', from: 'bank', to: A, amount: 200, reason: 'salary' },
      { type: 'bootBonus', playerId: A },
      { type: 'paid', from: 'bank', to: A, amount: 200, reason: 'salary' },
    ])
    expect(stats.players[A]?.salaries).toBe(400)
  })

  it('counts the purchases, the auctions won and what they cost', () => {
    const before = game()
    const stats = withEvents(before, [
      { type: 'paid', from: A, to: 'bank', amount: 180, reason: 'purchase' },
      { type: 'propertyBought', playerId: A, squareId: 'forum', price: 180 },
      { type: 'paid', from: A, to: 'bank', amount: 75, reason: 'auction' },
      { type: 'auctionWon', playerId: A, squareId: 'blog', amount: 75 },
    ])
    expect(stats.players[A]).toMatchObject({ purchases: 2, purchaseSpending: 255, auctionsWon: 1 })
  })

  it('counts the backdoors and the rootkits built', () => {
    const before = game()
    const stats = withEvents(before, [
      { type: 'backdoorBuilt', playerId: A, squareId: 'forum', level: 1 },
      { type: 'backdoorBuilt', playerId: A, squareId: 'blog', level: 4 },
      { type: 'backdoorBuilt', playerId: A, squareId: 'blog', level: 5 },
    ])
    expect(stats.players[A]).toMatchObject({ backdoorsBuilt: 2, rootkitsBuilt: 1 })
  })

  it('counts the stays in quarantine and the doubles of the moves and of the quarantine', () => {
    const before = game()
    const stats = withEvents(before, [
      { type: 'diceRolled', playerId: A, dice: [3, 3], purpose: 'move' },
      { type: 'diceRolled', playerId: A, dice: [2, 5], purpose: 'move' },
      { type: 'diceRolled', playerId: A, dice: [4, 4], purpose: 'quarantine' },
      { type: 'diceRolled', playerId: A, dice: [6, 6], purpose: 'serviceRent' },
      { type: 'sentToQuarantine', playerId: A, reason: 'detected' },
    ])
    expect(stats.players[A]).toMatchObject({ doubles: 2, quarantines: 1 })
  })

  it('counts a whole roll played by the engine', () => {
    const start = forceDice(game({ overrides: [{ position: 36 }], ownership: { 'modem-56k': { owner: B } } }), [[3, 4]])
    const { stats } = after(startStatistics(start), start, { type: 'rollDice', playerId: A })
    expect(stats.players[A]).toMatchObject({ salaries: 200, rentPaid: 4 })
    expect(stats.players[B]).toMatchObject({ rentCollected: 4 })
    expect(stats.squareRents['modem-56k']).toBe(4)
  })
})

describe('bankruptcies', () => {
  it('dates the bankruptcy and names the creditor', () => {
    const start = game(
      {
        overrides: [{}, { cash: 10 }],
        phase: { kind: 'debt', debtor: B, payments: [{ to: A, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
      },
      23,
    )
    const { stats } = after(startStatistics(start), start, { type: 'declareBankruptcy', playerId: B })
    expect(stats.players[B]?.bankruptcy).toEqual({ turn: 23, creditor: A, rank: 1, voluntary: false })
    expect(stats.players[A]?.bankruptcy).toBeNull()
  })

  it('dates a bankruptcy towards the bank with the round in which it happened, not the next one', () => {
    const start = game(
      {
        players: 3,
        current: 2,
        overrides: [{}, {}, { cash: 10 }],
        phase: { kind: 'debt', debtor: C, payments: [{ to: 'bank', amount: 200, reason: 'tax' }], resume: { kind: 'postRoll' } },
      },
      9,
    )
    const { stats, state } = after(startStatistics(start), start, { type: 'declareBankruptcy', playerId: C })
    expect(state.turnNumber).toBe(10)
    expect(stats.players[C]?.bankruptcy).toEqual({ turn: 9, creditor: 'bank', rank: 1, voluntary: false })
    expect(stats.rounds.at(-1)?.players.map((p) => p.playerId)).toEqual([A, B])
  })

  it('records a player giving up as a voluntary bankruptcy towards the bank', () => {
    const start = game({ players: 3 }, 15)
    const { stats } = after(startStatistics(start), start, { type: 'declareBankruptcy', playerId: A })
    expect(stats.players[A]?.bankruptcy).toEqual({ turn: 15, creditor: 'bank', rank: 1, voluntary: true })
  })

  it('ranks the bankruptcies in the order they happen', () => {
    const before = game({ players: 3 })
    const stats = withEvents(before, [
      { type: 'bankrupt', playerId: C, creditor: A, voluntary: false },
      { type: 'bankrupt', playerId: B, creditor: A, voluntary: false },
    ])
    expect(stats.players[C]?.bankruptcy?.rank).toBe(1)
    expect(stats.players[B]?.bankruptcy?.rank).toBe(2)
  })
})

describe('rent per square', () => {
  it('adds up the rents of a square whoever its owner was', () => {
    const before = game({ overrides: [{ position: 17 }, { position: 17 }] })
    const first = withEvents(before, [{ type: 'paid', from: B, to: A, amount: 70, reason: 'rent' }])
    const second = withEvents(before, [{ type: 'paid', from: A, to: B, amount: 195, reason: 'rent' }], first)
    expect(second.squareRents).toEqual({ blog: 265 })
  })
})
