import { describe, expect, it } from 'vitest'
import { BANK_BACKDOORS, BANK_ROOTKITS } from './board/squares'
import { applyAction, legalActions } from './index'
import { randomInt } from './rng'
import { createGame } from './setup'
import type { Action, GameEvent, GameSettings, GameState } from './types'

const MAX_TURNS = 1000
const MAX_ACTIONS = 30_000
const SLOW_TEST_TIMEOUT_MS = 120_000

function bankFlow(events: GameEvent[]): number {
  let flow = 0
  for (const e of events) {
    if (e.type !== 'paid') continue
    if (e.from === 'bank') flow += e.amount
    if (e.to === 'bank') flow -= e.amount
  }
  return flow
}

function cashInPlay(state: GameState): number {
  return state.players.reduce((sum, p) => sum + p.cash, state.dmzPot)
}

function checkBuildings(state: GameState): void {
  let backdoors = state.bankStock.backdoors
  let rootkits = state.bankStock.rootkits
  for (const own of Object.values(state.ownership)) {
    if (own.level === 5) rootkits += 1
    else backdoors += own.level
  }
  expect(backdoors).toBe(BANK_BACKDOORS)
  expect(rootkits).toBe(BANK_ROOTKITS)
}

function pick(script: { rngState: number }, actions: Action[]): Action {
  const buy = actions.find((a) => a.type === 'buyProperty')
  if (buy) return buy
  const builds = actions.filter((a) => a.type === 'buildBackdoor')
  if (builds.length > 0 && randomInt(script, 2) === 0) return builds[randomInt(script, builds.length)] as Action
  const flow = actions.filter((a) => a.type === 'rollDice' || a.type === 'endTurn')
  if (flow.length > 0 && randomInt(script, 4) !== 0) return flow[randomInt(script, flow.length)] as Action
  return actions[randomInt(script, actions.length)] as Action
}

function playFullGame(seed: number, settings?: Partial<GameSettings>): { state: GameState; actions: number } {
  const created = createGame({
    players: [
      { id: 'p1', name: 'Alice', color: 'red' },
      { id: 'p2', name: 'Bob', color: 'blue' },
      { id: 'p3', name: 'Chloé', color: 'green' },
      { id: 'p4', name: 'David', color: 'yellow' },
    ],
    seed,
    settings,
  })
  if (!created.ok) throw new Error(created.error.code)
  let state = created.state
  const script = { rngState: seed * 31 + 7 }
  let actions = 0
  while (state.phase.kind !== 'gameOver' && state.turnNumber <= MAX_TURNS && actions < MAX_ACTIONS) {
    const candidates = legalActions(state)
    expect(candidates.length).toBeGreaterThan(0)
    const action = pick(script, candidates)
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(`${action.type}: ${result.error.code}`)
    expect(cashInPlay(result.state) - cashInPlay(state)).toBe(bankFlow(result.events))
    for (const p of result.state.players) expect(p.cash).toBeGreaterThanOrEqual(0)
    checkBuildings(result.state)
    state = result.state
    actions++
  }
  return { state, actions }
}

describe('full simulated game', () => {
  it('plays a 4-player game while keeping money and buildings consistent', () => {
    const { state, actions } = playFullGame(2026)
    expect(actions).toBeGreaterThan(100)
    if (state.phase.kind === 'gameOver') {
      expect(state.winner).not.toBeNull()
      expect(state.players.filter((p) => !p.bankrupt)).toHaveLength(1)
    }
  }, SLOW_TEST_TIMEOUT_MS)

  it('reaches the same final state on two runs', () => {
    expect(playFullGame(42).state).toEqual(playFullGame(42).state)
  }, SLOW_TEST_TIMEOUT_MS)

  it('keeps money and buildings consistent with every game option', () => {
    const { state, actions } = playFullGame(2026, {
      dmzJackpot: true,
      doubleBootBonus: true,
      freeBuilding: true,
      noRentInQuarantine: true,
      turnLimit: 20,
      netWorthTarget: 6000,
    })
    expect(actions).toBeGreaterThan(100)
    if (state.phase.kind === 'gameOver') expect(state.winner).not.toBeNull()
  }, SLOW_TEST_TIMEOUT_MS)

  it('finishes some games with a winner', () => {
    const finished = [7, 8, 10].map((seed) => playFullGame(seed).state).filter((s) => s.phase.kind === 'gameOver')
    expect(finished.length).toBeGreaterThan(0)
  }, SLOW_TEST_TIMEOUT_MS)
})
