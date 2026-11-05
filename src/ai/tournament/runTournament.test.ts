import { describe, expect, it } from 'vitest'
import type { GameEvent, TradeOffer } from '../../engine'
import { countResignations, countTrades, NO_TRADES, runTournament, type TournamentOptions } from './runTournament'

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
    expect(report.trades.accepted).toBeLessThanOrEqual(report.trades.proposed)
    expect(report.trades.acceptedPerGame).toBe(report.trades.accepted / report.games)
    expect(report.trades.counterAccepted).toBeLessThanOrEqual(report.trades.countered)
    expect(report.resignations).toBeGreaterThanOrEqual(0)
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

describe('countResignations', () => {
  it('counts the players who gave up, not the other bankruptcies', () => {
    const events: GameEvent[] = [
      { type: 'bankrupt', playerId: 'p1', creditor: 'bank', voluntary: true },
      { type: 'bankrupt', playerId: 'p2', creditor: 'p3', voluntary: false },
      { type: 'bankrupt', playerId: 'p4', creditor: 'bank', voluntary: false },
    ]
    expect(countResignations(0, events)).toBe(1)
    expect(countResignations(2, [])).toBe(2)
  })
})

describe('countTrades', () => {
  const offer: TradeOffer = { from: 'p1', to: 'p2', give: { squares: ['forum'], cash: 0, keys: [] }, receive: { squares: [], cash: 150, keys: [] } }
  const counter: TradeOffer = { from: 'p2', to: 'p1', give: { squares: [], cash: 120, keys: [] }, receive: { squares: ['forum'], cash: 0, keys: [] } }

  it('counts the counter-offers made and accepted, the trade of an accepted counter-offer among the accepted trades', () => {
    const events: GameEvent[] = [
      { type: 'tradeProposed', offer },
      { type: 'tradeCountered', offer: counter, original: offer },
      { type: 'tradeAccepted', offer: counter, original: offer },
      { type: 'tradeProposed', offer },
      { type: 'tradeCountered', offer: counter, original: offer },
      { type: 'tradeRejected', offer: counter, original: offer },
      { type: 'tradeProposed', offer },
      { type: 'tradeAccepted', offer, original: null },
    ]
    expect(countTrades(NO_TRADES, events)).toEqual({ proposed: 3, accepted: 2, countered: 2, counterAccepted: 1 })
  })
})
