import { describe, expect, it } from 'vitest'
import { runTournament, type TournamentOptions } from './runTournament'

const SHORT: TournamentOptions = {
  games: 20,
  lineups: [['normal', 'normal', 'normal', 'normal']],
  seeds: Array.from({ length: 20 }, (_, i) => 101 + i),
}

describe('runTournament', () => {
  const report = runTournament(SHORT)

  it('reports every measure', () => {
    expect(report.games).toBe(20)
    expect(report.finished + report.interrupted).toBe(20)
    expect(report.rounds.median).toBeGreaterThan(0)
    expect(report.rounds.p90).toBeGreaterThanOrEqual(report.rounds.median)
    expect(report.rounds.mean).toBeGreaterThan(0)
    expect(report.winsByPlace).toHaveLength(4)
    expect(Object.keys(report.yieldByGroup)).toEqual(['retro', 'iot', 'office', 'web', 'social', 'finance', 'infrastructure', 'core', 'nodes', 'services'])
    expect(Object.values(report.yieldByGroup).some((group) => group.rent > 0 && group.invested > 0)).toBe(true)
  })

  it('counts every finished game once among the places', () => {
    expect(report.winsByPlace.reduce((sum, wins) => sum + wins, 0)).toBe(report.finished)
    expect(report.winRateByPlace.reduce((sum, rate) => sum + rate, 0)).toBeCloseTo(1)
    expect(report.winsByLevel.normal).toBe(report.finished)
  })

  it('stops a game at the safety limit and counts it as interrupted', () => {
    const limited = runTournament({ ...SHORT, games: 3, maxRounds: 4 })
    expect(limited.interrupted).toBe(3)
    expect(limited.finished).toBe(0)
    expect(limited.winRateByPlace).toEqual([0, 0, 0, 0])
  })

  it('gives the same report for the same seeds', () => {
    expect(runTournament(SHORT)).toEqual(report)
  })
})
