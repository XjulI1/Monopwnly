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
const SEEDS_PER_ORDER = 10
const HARD_MIN_SHARE = 0.45

describe('strength of the levels', () => {
  it('ranks easy < normal < hard over the six play orders, the hard level winning at least 45 % of the finished games', () => {
    const games = ORDERS.length * SEEDS_PER_ORDER
    const report = runTournament({
      games,
      lineups: ORDERS,
      seeds: Array.from({ length: games }, (_, i) => 1 + Math.floor(i / ORDERS.length)),
    })
    const { easy, normal, hard } = report.winsByLevel
    expect(easy).toBeLessThan(normal)
    expect(normal).toBeLessThan(hard)
    expect(hard / report.finished).toBeGreaterThanOrEqual(HARD_MIN_SHARE)
  }, 60_000)
})
