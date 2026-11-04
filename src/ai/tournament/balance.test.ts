import { describe, expect, it } from 'vitest'
import { FAMILY_NAMES, NET_WORTH_TARGETS, type FamilyId } from '../../engine'
import { runTournament, type TournamentReport } from './runTournament'

const GAMES = 400
const MAX_INTERRUPTED_SHARE = 0.05
const MEDIAN_ROUNDS = { min: 25, max: 80 } as const
const PLACE_WIN_RATE = { min: 0.18, max: 0.32 } as const
const MAX_FAMILY_YIELD_SPREAD = 3
const TARGET_GAMES = 200
const MIN_TARGET_ENDINGS = 0.9

const percent = (share: number) => `${(share * 100).toFixed(1)} %`
const families = Object.keys(FAMILY_NAMES) as FamilyId[]
const enabled = Boolean(process.env.MONOPWNLY_BALANCE)

function groupName(group: string): string {
  return group in FAMILY_NAMES ? FAMILY_NAMES[group as FamilyId] : group === 'nodes' ? 'Nœuds' : 'Services'
}

function printReport(report: TournamentReport): void {
  const lines = [
    `Tournoi d’équilibrage : ${report.games} parties à 4 IA normales, enchères et échanges activés`,
    `Terminées : ${report.finished}, interrompues : ${report.interrupted} (${percent(report.interrupted / report.games)})`,
    `Tours de table : moyenne ${report.rounds.mean.toFixed(1)}, médiane ${report.rounds.median}, 90e centile ${report.rounds.p90}`,
    `Victoires par place : ${report.winRateByPlace.map((rate, i) => `${i + 1}e ${percent(rate)}`).join(', ')}`,
    `Échanges : ${report.trades.proposed} proposés, ${report.trades.accepted} acceptés, ${report.trades.acceptedPerGame.toFixed(2)} acceptés par partie`,
    'Rendement (loyers encaissés / coût investi) :',
    ...Object.entries(report.yieldByGroup).map(
      ([group, y]) => `  ${groupName(group).padEnd(18)} ${y.ratio.toFixed(2)}  (loyers ${y.rent} Ᵽ, investi ${y.invested} Ᵽ)`,
    ),
  ]
  process.stdout.write(`${lines.join('\n')}\n`)
}

describe.skipIf(!enabled)('balance of the board', () => {
  it(`holds the balance criteria over ${GAMES} games between four normal AIs`, () => {
    const report = runTournament({
      games: GAMES,
      lineups: [['normal', 'normal', 'normal', 'normal']],
      seeds: Array.from({ length: GAMES }, (_, i) => i + 1),
      settings: { auctions: true },
    })
    printReport(report)

    expect(report.trades.acceptedPerGame, 'Aucun échange accepté').toBeGreaterThan(0)
    const interrupted = report.interrupted / report.games
    expect(interrupted, `Parties interrompues : ${percent(interrupted)}, au plus ${percent(MAX_INTERRUPTED_SHARE)}`).toBeLessThanOrEqual(
      MAX_INTERRUPTED_SHARE,
    )
    const duration = `Durée médiane : ${report.rounds.median} tours, attendue entre ${MEDIAN_ROUNDS.min} et ${MEDIAN_ROUNDS.max}`
    expect(report.rounds.median, duration).toBeGreaterThanOrEqual(MEDIAN_ROUNDS.min)
    expect(report.rounds.median, duration).toBeLessThanOrEqual(MEDIAN_ROUNDS.max)
    report.winRateByPlace.forEach((rate, i) => {
      const message = `Victoires de la place ${i + 1} : ${percent(rate)}, attendues entre ${percent(PLACE_WIN_RATE.min)} et ${percent(PLACE_WIN_RATE.max)}`
      expect(rate, message).toBeGreaterThanOrEqual(PLACE_WIN_RATE.min)
      expect(rate, message).toBeLessThanOrEqual(PLACE_WIN_RATE.max)
    })
    const yields = families.map((family) => ({ family, ratio: report.yieldByGroup[family].ratio }))
    const lowest = yields.reduce((min, y) => (y.ratio < min.ratio ? y : min))
    const highest = yields.reduce((max, y) => (y.ratio > max.ratio ? y : max))
    expect(
      highest.ratio,
      `Rendement de ${FAMILY_NAMES[highest.family]} : ${highest.ratio.toFixed(2)}, plus de ${MAX_FAMILY_YIELD_SPREAD} fois celui de ${FAMILY_NAMES[lowest.family]} (${lowest.ratio.toFixed(2)})`,
    ).toBeLessThanOrEqual(lowest.ratio * MAX_FAMILY_YIELD_SPREAD)
  }, 600_000)
})

describe.skipIf(!enabled)('net worth targets', () => {
  it.each(NET_WORTH_TARGETS)(`ends most games between four normal AIs on a target of %i Ᵽ`, (netWorthTarget) => {
    const report = runTournament({
      games: TARGET_GAMES,
      lineups: [['normal', 'normal', 'normal', 'normal']],
      seeds: Array.from({ length: TARGET_GAMES }, (_, i) => i + 1),
      settings: { auctions: true, netWorthTarget },
    })
    const byTarget = report.winsByReason.netWorthTarget / report.finished
    process.stdout.write(
      `Objectif ${netWorthTarget} Ᵽ : médiane ${report.rounds.median} tours, 90e centile ${report.rounds.p90}, fin par l’objectif ${percent(byTarget)}\n`,
    )
    expect(report.interrupted / report.games).toBeLessThanOrEqual(MAX_INTERRUPTED_SHARE)
    expect(byTarget, `Fin par l’objectif : ${percent(byTarget)}, au moins ${percent(MIN_TARGET_ENDINGS)} attendus`).toBeGreaterThanOrEqual(
      MIN_TARGET_ENDINGS,
    )
  }, 600_000)
})
