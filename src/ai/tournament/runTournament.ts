import {
  AI_LEVELS,
  BOARD,
  createGame,
  FAMILY_NAMES,
  purchasableById,
  type AiLevel,
  type FamilyId,
  type GameEvent,
  type GameSettings,
  type GameState,
  type PlayerSetup,
  type SquareId,
  type WinReason,
} from '../../engine'
import { playUntilHumanOrEnd } from '../index'
import { backdoorCostOf } from '../levels/strategy'

/** Families of systems, plus the nodes and the services. */
export type SquareGroup = FamilyId | 'nodes' | 'services'

/** Rents collected and amount invested (purchases and buildings) on a group of squares. */
export type GroupYield = { rent: number; invested: number; ratio: number }

/** What a tournament measures. */
export type TournamentReport = {
  games: number
  finished: number
  interrupted: number
  rounds: { mean: number; median: number; p90: number }
  winsByPlace: number[]
  winRateByPlace: number[]
  winsByLevel: Record<AiLevel, number>
  winRateByLevel: Record<AiLevel, number>
  winsByReason: Record<WinReason, number>
  yieldByGroup: Record<SquareGroup, GroupYield>
  trades: TradeCounts & { acceptedPerGame: number }
  resignations: number
}

/** Trades proposed and accepted, counter-offers made and accepted. */
export type TradeCounts = { proposed: number; accepted: number; countered: number; counterAccepted: number }

/** No trade at all. */
export const NO_TRADES: TradeCounts = { proposed: 0, accepted: 0, countered: 0, counterAccepted: 0 }

/** The counts once the events are added; an accepted counter-offer counts among the accepted trades too. */
export function countTrades(counts: TradeCounts, events: readonly GameEvent[]): TradeCounts {
  return events.reduce(
    (total, event) => ({
      proposed: total.proposed + (event.type === 'tradeProposed' ? 1 : 0),
      accepted: total.accepted + (event.type === 'tradeAccepted' ? 1 : 0),
      countered: total.countered + (event.type === 'tradeCountered' ? 1 : 0),
      counterAccepted: total.counterAccepted + (event.type === 'tradeAccepted' && event.original !== null ? 1 : 0),
    }),
    counts,
  )
}

/** The number of players who gave up, once the events are added. */
export function countResignations(count: number, events: readonly GameEvent[]): number {
  return events.reduce((total, event) => total + (event.type === 'bankrupt' && event.voluntary ? 1 : 0), count)
}

/** A tournament: game `i` seats the lineup `i % lineups.length` in play order and uses the seed `seeds[i]`. */
export type TournamentOptions = {
  games: number
  lineups: AiLevel[][]
  seeds: number[]
  settings?: Partial<GameSettings>
  maxRounds?: number
}

/** Safety limit on the rounds of a simulated game; not a rule of the game. */
export const DEFAULT_MAX_ROUNDS = 300

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan']
const GROUPS: SquareGroup[] = [...(Object.keys(FAMILY_NAMES) as FamilyId[]), 'nodes', 'services']

function groupOf(squareId: SquareId): SquareGroup | null {
  const square = purchasableById(squareId)
  if (!square) return null
  if (square.kind === 'system') return square.family
  return square.kind === 'node' ? 'nodes' : 'services'
}

function newGame(lineup: AiLevel[], seed: number, settings: Partial<GameSettings> | undefined): GameState {
  const players: PlayerSetup[] = lineup.map((level, i) => ({
    id: `p${i + 1}`,
    name: `IA ${i + 1}`,
    color: COLORS[i] ?? `color-${i}`,
    controller: { kind: 'ai', level },
  }))
  const created = createGame({ players, seed, settings })
  if (!created.ok) throw new Error(`${created.error.code}: ${created.error.message}`)
  return { ...created.state, currentPlayerIndex: 0, firstPlayerIndex: 0 }
}

function percentile(sorted: number[], share: number): number {
  if (sorted.length === 0) return 0
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0
}

function emptyYields(): Record<SquareGroup, { rent: number; invested: number }> {
  return Object.fromEntries(GROUPS.map((group) => [group, { rent: 0, invested: 0 }])) as Record<SquareGroup, { rent: number; invested: number }>
}

function investmentOf(event: GameEvent): { squareId: SquareId; amount: number } | null {
  if (event.type === 'propertyBought') return { squareId: event.squareId, amount: event.price }
  if (event.type === 'auctionWon') return { squareId: event.squareId, amount: event.amount }
  if (event.type === 'backdoorBuilt') return { squareId: event.squareId, amount: backdoorCostOf(event.squareId) }
  return null
}

function rentSquareOf(event: GameEvent, state: GameState): SquareId | null {
  if (event.type !== 'paid' || event.reason !== 'rent' || event.from === 'bank') return null
  const payer = state.players.find((p) => p.id === event.from)
  return payer ? (BOARD[payer.position]?.id ?? null) : null
}

function record(yields: Record<SquareGroup, { rent: number; invested: number }>, events: GameEvent[], state: GameState): void {
  for (const event of events) {
    const rentSquare = rentSquareOf(event, state)
    const rentGroup = rentSquare ? groupOf(rentSquare) : null
    if (rentGroup && event.type === 'paid') yields[rentGroup].rent += event.amount
    const investment = investmentOf(event)
    const investedGroup = investment ? groupOf(investment.squareId) : null
    if (investment && investedGroup) yields[investedGroup].invested += investment.amount
  }
}

/** Plays simulated games between AIs, without interface, and aggregates their measures. */
export function runTournament(options: TournamentOptions): TournamentReport {
  const maxRounds = options.maxRounds ?? DEFAULT_MAX_ROUNDS
  const seats = Math.max(...options.lineups.map((lineup) => lineup.length))
  const winsByPlace = new Array<number>(seats).fill(0)
  const winsByLevel = Object.fromEntries(AI_LEVELS.map((level) => [level, 0])) as Record<AiLevel, number>
  const winsByReason: Record<WinReason, number> = { lastStanding: 0, turnLimit: 0, netWorthTarget: 0 }
  const rounds: number[] = []
  const yields = emptyYields()
  let interrupted = 0
  let trades = NO_TRADES
  let resignations = 0
  for (let index = 0; index < options.games; index++) {
    const lineup = options.lineups[index % options.lineups.length] ?? []
    const seed = options.seeds[index]
    if (seed === undefined) throw new Error(`No seed for game ${index}`)
    const { state, stop } = playUntilHumanOrEnd(newGame(lineup, seed, options.settings), {
      maxRounds,
      onAction: (_action, events, after) => {
        record(yields, events, after)
        trades = countTrades(trades, events)
        resignations = countResignations(resignations, events)
      },
    })
    if (stop !== 'gameOver') {
      interrupted += 1
      continue
    }
    rounds.push(state.turnNumber)
    const place = state.players.findIndex((p) => p.id === state.winner)
    winsByPlace[place] = (winsByPlace[place] ?? 0) + 1
    const level = lineup[place]
    if (level) winsByLevel[level] += 1
    if (state.winReason) winsByReason[state.winReason] += 1
  }
  const finished = rounds.length
  const sorted = [...rounds].sort((a, b) => a - b)
  const rate = (wins: number) => (finished === 0 ? 0 : wins / finished)
  return {
    games: options.games,
    finished,
    interrupted,
    rounds: {
      mean: finished === 0 ? 0 : rounds.reduce((sum, r) => sum + r, 0) / finished,
      median: percentile(sorted, 0.5),
      p90: percentile(sorted, 0.9),
    },
    winsByPlace,
    winRateByPlace: winsByPlace.map(rate),
    winsByLevel,
    winRateByLevel: Object.fromEntries(AI_LEVELS.map((level) => [level, rate(winsByLevel[level])])) as Record<AiLevel, number>,
    winsByReason,
    yieldByGroup: Object.fromEntries(
      GROUPS.map((group) => {
        const { rent, invested } = yields[group]
        return [group, { rent, invested, ratio: invested === 0 ? 0 : rent / invested }]
      }),
    ) as Record<SquareGroup, GroupYield>,
    trades: { ...trades, acceptedPerGame: options.games === 0 ? 0 : trades.accepted / options.games },
    resignations,
  }
}
