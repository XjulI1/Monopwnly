import { describe, expect, it } from 'vitest'
import { netWorth, standings } from './queries'
import { A, B, C, act, forceDice, makeState, player, type StateOptions } from './testUtils'
import type { GameSettings, GameState } from './types'

function endingTurn(settings: Partial<GameSettings>, turnNumber: number, options: StateOptions = {}): GameState {
  const state = makeState({ players: 3, ...options, settings, phase: options.phase ?? { kind: 'postRoll', mayRollAgain: false } })
  state.turnNumber = turnNumber
  return state
}

function endTurn(state: GameState) {
  const current = state.players[state.currentPlayerIndex]?.id as string
  return act(state, { type: 'endTurn', playerId: current })
}

describe('net worth', () => {
  it('adds the cash, the active squares, the mortgage values and the buildings', () => {
    const state = makeState({
      overrides: [{ cash: 500 }],
      ownership: { forum: { owner: A, level: 2 }, blog: { owner: A }, 'vpn-node': { owner: A, mortgaged: true } },
    })
    expect(netWorth(state, A)).toBe(500 + 180 + 200 + 180 + 100)
  })

  it('counts a rootkit as five backdoors', () => {
    const state = makeState({ overrides: [{}, { cash: 0 }], ownership: { 'online-exchange': { owner: B, level: 5 } } })
    expect(netWorth(state, B)).toBe(280 + 5 * 150)
  })

  it('leaves the DMZ pot out', () => {
    const state = makeState({ settings: { dmzJackpot: true }, overrides: [{ cash: 500 }] })
    state.dmzPot = 1000
    expect(netWorth(state, A)).toBe(500)
  })

  it('is zero for a bankrupt player', () => {
    const start = makeState({
      players: 3,
      overrides: [{ cash: 50 }],
      ownership: { forum: { owner: A, level: 1 } },
      phase: { kind: 'debt', debtor: A, payments: [{ to: C, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const { state } = act(start, { type: 'declareBankruptcy', playerId: A })
    expect(player(state, A).bankrupt).toBe(true)
    expect(netWorth(state, A)).toBe(0)
  })
})

describe('standings', () => {
  it('ranks the players still in the game by net worth, leaving the bankrupt ones out', () => {
    const state = makeState({ players: 3, overrides: [{ cash: 4000 }, { cash: 0, bankrupt: true }, { cash: 7000 }] })
    expect(standings(state).map((s) => s.playerId)).toEqual([C, A])
    expect(standings(state)[0]).toEqual({ playerId: C, netWorth: 7000, cash: 7000 })
  })

  it('breaks a net worth tie with the cash', () => {
    const state = makeState({
      overrides: [{ cash: 800 }, { cash: 1200 }],
      ownership: { 'online-shop': { owner: A }, 'state-mainframe': { owner: A }, datacenter: { owner: B } },
    })
    expect(netWorth(state, A)).toBe(netWorth(state, B))
    expect(standings(state).map((s) => s.playerId)).toEqual([B, A])
  })

  it('breaks a perfect tie with the play order from the first player of the game', () => {
    expect(standings(makeState({ players: 3, firstPlayer: 0 })).map((s) => s.playerId)).toEqual([A, B, C])
    expect(standings(makeState({ players: 3, firstPlayer: 1 })).map((s) => s.playerId)).toEqual([B, C, A])
  })
})

describe('turn limit', () => {
  const LIMIT: Partial<GameSettings> = { turnLimit: 20 }

  it('ends the game when the last player of the last round ends their turn', () => {
    const { state, events } = endTurn(endingTurn(LIMIT, 20, { current: 2, overrides: [{ cash: 900 }, { cash: 2000 }, { cash: 1000 }] }))
    expect(state.phase).toEqual({ kind: 'gameOver' })
    expect(state.winner).toBe(B)
    expect(state.winReason).toBe('turnLimit')
    expect(state.turnNumber).toBe(20)
    expect(events).toContainEqual({ type: 'gameWon', playerId: B, reason: 'turnLimit' })
    expect(events.some((e) => e.type === 'turnStarted')).toBe(false)
  })

  it('goes on before the last player of the last round', () => {
    const { state } = endTurn(endingTurn(LIMIT, 20, { current: 0 }))
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(state.currentPlayerIndex).toBe(1)
  })

  it('goes on after the last player of the round before the limit', () => {
    const { state } = endTurn(endingTurn(LIMIT, 19, { current: 2 }))
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(state.turnNumber).toBe(20)
  })

  it('skips the bankrupt players to find the last player of the round', () => {
    const { state } = endTurn(endingTurn(LIMIT, 20, { current: 1, overrides: [{}, {}, { bankrupt: true, cash: 0 }] }))
    expect(state.winReason).toBe('turnLimit')
  })

  it('ends the game without a new round when the last player of the last round goes bankrupt during their turn', () => {
    const start = endingTurn(LIMIT, 20, {
      current: 2,
      overrides: [{ cash: 3000 }, { cash: 1000 }, { cash: 10 }],
      phase: { kind: 'debt', debtor: C, payments: [{ to: A, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const { state } = act(start, { type: 'declareBankruptcy', playerId: C })
    expect(state.phase).toEqual({ kind: 'gameOver' })
    expect(state.turnNumber).toBe(20)
    expect(state.winner).toBe(A)
    expect(state.winReason).toBe('turnLimit')
  })

  it('gives every player the same number of turns when another player started the game', () => {
    const before = endTurn(endingTurn(LIMIT, 20, { players: 4, firstPlayer: 2, current: 3 }))
    expect(before.state.phase).toEqual({ kind: 'preRoll' })
    expect(before.state.currentPlayerIndex).toBe(0)
    const last = endTurn(endingTurn(LIMIT, 20, { players: 4, firstPlayer: 2, current: 1 }))
    expect(last.state.winReason).toBe('turnLimit')
  })

  it('never ends a game without a turn limit', () => {
    const { state } = endTurn(endingTurn({}, 60, { current: 2 }))
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(state.turnNumber).toBe(61)
  })
})

describe('net worth target', () => {
  const TARGET: Partial<GameSettings> = { netWorthTarget: 5000 }

  it('makes the current player win when they end their turn above the target', () => {
    const { state, events } = endTurn(endingTurn(TARGET, 5, { current: 0, overrides: [{ cash: 5120 }] }))
    expect(state.winner).toBe(A)
    expect(state.winReason).toBe('netWorthTarget')
    expect(events).toContainEqual({ type: 'gameWon', playerId: A, reason: 'netWorthTarget' })
  })

  it('makes another player win at the end of the turn that brought them above the target', () => {
    const { state } = endTurn(endingTurn(TARGET, 5, { current: 1, overrides: [{ cash: 5050 }] }))
    expect(state.winner).toBe(A)
    expect(state.winReason).toBe('netWorthTarget')
  })

  it('never checks the target in the middle of a turn', () => {
    const start = makeState({
      players: 3,
      settings: { ...TARGET, dmzJackpot: true },
      overrides: [{ cash: 4700, position: 15 }],
      ownership: { minitel: { owner: A, level: 2 }, 'modem-56k': { owner: A } },
    })
    start.dmzPot = 90
    const landed = act(forceDice(start, [[2, 3]]), { type: 'rollDice', playerId: A }).state
    expect(netWorth(landed, A)).toBe(5010)
    expect(landed.phase.kind).toBe('postRoll')
    let state = act(landed, { type: 'sellBackdoor', playerId: A, squareId: 'minitel' }).state
    state = act(state, { type: 'sellBackdoor', playerId: A, squareId: 'minitel' }).state
    expect(netWorth(state, A)).toBe(4960)
    const ended = endTurn(state).state
    expect(ended.phase).toEqual({ kind: 'preRoll' })
    expect(ended.winner).toBeNull()
  })

  it('takes over the turn limit when both are reached at the end of the same turn', () => {
    const { state } = endTurn(endingTurn({ ...TARGET, turnLimit: 20 }, 20, { current: 2, overrides: [{}, { cash: 6000 }] }))
    expect(state.winner).toBe(B)
    expect(state.winReason).toBe('netWorthTarget')
  })
})

describe('tie-break and reason of the victory', () => {
  it('lets the richer in cash win a net worth tie at the turn limit', () => {
    const { state } = endTurn(
      endingTurn({ turnLimit: 20 }, 20, {
        players: 2,
        current: 1,
        overrides: [{ cash: 800 }, { cash: 1200 }],
        ownership: { 'online-shop': { owner: A }, 'state-mainframe': { owner: A }, datacenter: { owner: B } },
      }),
    )
    expect(state.winner).toBe(B)
  })

  it('lets the earlier player in play order win a perfect tie at the turn limit', () => {
    const fromAlice = endTurn(endingTurn({ turnLimit: 20 }, 20, { players: 2, current: 1, firstPlayer: 0 })).state
    expect(fromAlice.winner).toBe(A)
    const fromBob = endTurn(endingTurn({ turnLimit: 20 }, 20, { players: 2, current: 0, firstPlayer: 1 })).state
    expect(fromBob.winner).toBe(B)
  })

  it('still ends the game at once when every opponent is bankrupt', () => {
    const start = endingTurn({ turnLimit: 40, netWorthTarget: 6000 }, 12, {
      players: 2,
      current: 1,
      overrides: [{}, { cash: 10 }],
      phase: { kind: 'debt', debtor: B, payments: [{ to: A, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const { state, events } = act(start, { type: 'declareBankruptcy', playerId: B })
    expect(state.winner).toBe(A)
    expect(state.winReason).toBe('lastStanding')
    expect(events).toContainEqual({ type: 'gameWon', playerId: A, reason: 'lastStanding' })
  })

  it('keeps the game going after the bankruptcy of a player who is not the current one', () => {
    const start = endingTurn({ netWorthTarget: 5000 }, 5, {
      current: 0,
      overrides: [{ cash: 6000 }, { cash: 5 }],
      phase: { kind: 'debt', debtor: B, payments: [{ to: A, amount: 10, reason: 'card' }], resume: { kind: 'postRoll' } },
    })
    const { state } = act(start, { type: 'declareBankruptcy', playerId: B })
    expect(state.phase.kind).toBe('postRoll')
    expect(state.winner).toBeNull()
  })
})
