import { describe, expect, it } from 'vitest'
import { AI_LEVELS, applyAction, createGame, expectedActor, type AiLevel, type GameState, type PlayerSetup } from '../engine'
import { MANAGEMENT_LIMIT } from './constants'
import { chooseAction, isManagement, playUntilHumanOrEnd } from './index'
import { landingOdds } from './landingOdds'
import { playerView, type PlayerView } from './playerView'

const GAMES = 100
const MAX_ROUNDS = 300
const MAX_DECISION_MS = 20
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan']
const SLOWEST_KEPT = 5
const RETIMINGS = 5

type Decision = { view: PlayerView; playerId: string; level: AiLevel; managementLeft: number; ms: number }

function game(index: number): GameState {
  const count = 2 + (index % 5)
  const players: PlayerSetup[] = Array.from({ length: count }, (_, p) => ({
    id: `p${p + 1}`,
    name: `IA ${p + 1}`,
    color: COLORS[p] ?? 'grey',
    controller: { kind: 'ai', level: AI_LEVELS[(index + p) % AI_LEVELS.length] ?? 'normal' },
  }))
  const created = createGame({ players, seed: 7919 * (index + 1), settings: { auctions: index % 3 !== 2 } })
  if (!created.ok) throw new Error(created.error.code)
  return created.state
}

function keepSlowest(slowest: Decision[], decision: Decision): Decision[] {
  return [...slowest, decision].sort((a, b) => b.ms - a.ms).slice(0, SLOWEST_KEPT)
}

function intrinsicMs(decision: Decision): number {
  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < RETIMINGS; i++) {
    const begin = performance.now()
    chooseAction(decision.view, decision.playerId, decision.level, decision.managementLeft)
    best = Math.min(best, performance.now() - begin)
  }
  return best
}

function playTimed(start: GameState, slowestSoFar: Decision[]): { state: GameState; slowest: Decision[] } {
  let state = start
  let management = 0
  let slowest = slowestSoFar
  while (state.phase.kind !== 'gameOver' && state.turnNumber <= MAX_ROUNDS) {
    const actor = expectedActor(state)
    const controller = state.players.find((p) => p.id === actor)?.controller
    if (!actor || controller?.kind !== 'ai') throw new Error('A human is expected to act')
    const view = playerView(state)
    const managementLeft = MANAGEMENT_LIMIT - management
    const begin = performance.now()
    const action = chooseAction(view, actor, controller.level, managementLeft)
    slowest = keepSlowest(slowest, { view, playerId: actor, level: controller.level, managementLeft, ms: performance.now() - begin })
    const result = applyAction(state, action)
    if (!result.ok) throw new Error(`AI action rejected: ${action.type} (${result.error.code})`)
    management = isManagement(action) ? management + 1 : 0
    state = result.state
  }
  return { state, slowest }
}

describe('AI robustness', () => {
  it(`plays ${GAMES} varied games without any rejected action and decides in under ${MAX_DECISION_MS} ms`, () => {
    landingOdds()
    let slowest: Decision[] = []
    let finished = 0
    for (let index = 0; index < GAMES; index++) {
      const result = playTimed(game(index), slowest)
      slowest = result.slowest
      if (result.state.phase.kind === 'gameOver') finished++
    }
    expect(Math.max(...slowest.map(intrinsicMs))).toBeLessThan(MAX_DECISION_MS)
    expect(finished).toBeGreaterThan(GAMES / 2)
  }, 120_000)

  it('replays the same game from the same seed', () => {
    for (const index of [0, 1, 2, 3, 4]) {
      const first = playUntilHumanOrEnd(game(index), { maxRounds: MAX_ROUNDS })
      const second = playUntilHumanOrEnd(game(index), { maxRounds: MAX_ROUNDS })
      expect(second).toEqual(first)
    }
  }, 60_000)
})
