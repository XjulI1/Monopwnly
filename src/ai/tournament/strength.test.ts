import { describe, expect, it } from 'vitest'
import type { AiLevel } from '../../engine'
import { runTournament } from './runTournament'

const ORDERS: AiLevel[][] = [
  ['easy', 'normal', 'hard'],
  ['easy', 'hard', 'normal'],
  ['normal', 'easy', 'hard'],
  ['normal', 'hard', 'easy'],
  ['hard', 'easy', 'normal'],
  ['hard', 'normal', 'easy'],
]
const SEEDS_PER_ORDER = 30
const HARD_MIN_SHARE = 0.45
const GAMES = ORDERS.length * SEEDS_PER_ORDER
const SEEDS = Array.from({ length: GAMES }, (_, i) => 1 + Math.floor(i / ORDERS.length))

describe('strength of the levels', () => {
  it('ranks easy < normal < hard over the six play orders, the hard level winning at least 45 % of the finished games', () => {
    const report = runTournament({ games: GAMES, lineups: ORDERS, seeds: SEEDS })
    const { easy, normal, hard } = report.winsByLevel
    expect(easy).toBeLessThan(normal)
    expect(normal).toBeLessThan(hard)
    expect(hard / report.finished).toBeGreaterThanOrEqual(HARD_MIN_SHARE)
  }, 60_000)

  it('keeps that ranking with every game option and a 30-turn limit', () => {
    const report = runTournament({
      games: GAMES,
      lineups: ORDERS,
      seeds: SEEDS,
      settings: { dmzJackpot: true, doubleBootBonus: true, freeBuilding: true, noRentInQuarantine: true, turnLimit: 30 },
    })
    expect(report.interrupted).toBe(0)
    expect(report.rounds.p90).toBeLessThanOrEqual(30)
    const { easy, normal, hard } = report.winsByLevel
    expect(easy).toBeLessThan(normal)
    expect(normal).toBeLessThan(hard)
    expect(hard / report.finished).toBeGreaterThanOrEqual(HARD_MIN_SHARE)
  }, 60_000)
})
