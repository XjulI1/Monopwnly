import { netWorth, squareAt, type GameEvent, type GameState, type PlayerId, type SquareId } from '../../engine'
import { trackPositions } from './positions'

/** When a player went bankrupt, to whom, and how many players had gone bankrupt before plus one. */
export type Bankruptcy = { turn: number; creditor: PlayerId | 'bank'; rank: number }

/** What a player did during the game. */
export type PlayerStatistics = {
  rentCollected: number
  rentPaid: number
  taxesPaid: number
  salaries: number
  cardsDrawn: number
  purchases: number
  purchaseSpending: number
  auctionsWon: number
  backdoorsBuilt: number
  rootkitsBuilt: number
  quarantines: number
  doubles: number
  bankruptcy: Bankruptcy | null
}

/** Cash and net worth of a player at the start of a round. */
export type WealthReading = { playerId: PlayerId; cash: number; netWorth: number }

/** Wealth of the players still in the game at the start of a round. */
export type RoundReading = { turn: number; players: WealthReading[] }

/** Statistics gathered during a game: one reading per round, the counters of each player and the rents earned by each square. */
export type GameStatistics = {
  rounds: RoundReading[]
  players: Record<PlayerId, PlayerStatistics>
  squareRents: Record<SquareId, number>
}

type Counter = Exclude<keyof PlayerStatistics, 'bankruptcy'>

const EMPTY_COUNTERS: PlayerStatistics = {
  rentCollected: 0,
  rentPaid: 0,
  taxesPaid: 0,
  salaries: 0,
  cardsDrawn: 0,
  purchases: 0,
  purchaseSpending: 0,
  auctionsWon: 0,
  backdoorsBuilt: 0,
  rootkitsBuilt: 0,
  quarantines: 0,
  doubles: 0,
  bankruptcy: null,
}

function reading(state: GameState): RoundReading {
  return {
    turn: state.turnNumber,
    players: state.players.filter((p) => !p.bankrupt).map((p) => ({ playerId: p.id, cash: p.cash, netWorth: netWorth(state, p.id) })),
  }
}

/** Statistics of a new game: empty counters and the reading of the first round. */
export function startStatistics(state: GameState): GameStatistics {
  return {
    rounds: [reading(state)],
    players: Object.fromEntries(state.players.map((p) => [p.id, { ...EMPTY_COUNTERS }])),
    squareRents: {},
  }
}

/** Adds to the statistics the events of one engine action, played from `before` and leading to `after`. */
export function recordStatistics(stats: GameStatistics, before: GameState, events: readonly GameEvent[], after: GameState): GameStatistics {
  const players: Record<PlayerId, PlayerStatistics> = Object.fromEntries(Object.entries(stats.players).map(([id, counters]) => [id, { ...counters }]))
  const squareRents = { ...stats.squareRents }
  const rounds = [...stats.rounds]
  const positions = trackPositions(before)
  let turn = before.turnNumber
  let bankruptcies = Object.values(players).filter((counters) => counters.bankruptcy !== null).length

  const add = (playerId: PlayerId | 'bank', counter: Counter, amount = 1) => {
    const counters = playerId === 'bank' ? undefined : players[playerId]
    if (counters) counters[counter] += amount
  }

  function onPayment(event: Extract<GameEvent, { type: 'paid' }>) {
    switch (event.reason) {
      case 'rent': {
        add(event.to, 'rentCollected', event.amount)
        add(event.from, 'rentPaid', event.amount)
        const squareId = squareAt(positions.at(event.from)).id
        squareRents[squareId] = (squareRents[squareId] ?? 0) + event.amount
        return
      }
      case 'tax':
      case 'quarantineFine':
        add(event.from, 'taxesPaid', event.amount)
        return
      case 'salary':
        add(event.to, 'salaries', event.amount)
        return
      case 'purchase':
      case 'auction':
        add(event.from, 'purchaseSpending', event.amount)
        return
      default:
        return
    }
  }

  function onEvent(event: GameEvent) {
    switch (event.type) {
      case 'turnStarted':
        turn = event.turnNumber
        if ((rounds.at(-1)?.turn ?? 0) < event.turnNumber) rounds.push(reading(after))
        return
      case 'paid':
        onPayment(event)
        return
      case 'potIncreased':
        if (event.reason === 'tax') add(event.playerId, 'taxesPaid', event.amount)
        return
      case 'diceRolled':
        if (event.purpose !== 'serviceRent' && event.dice[0] === event.dice[1]) add(event.playerId, 'doubles')
        return
      case 'cardDrawn':
        add(event.playerId, 'cardsDrawn')
        return
      case 'propertyBought':
        add(event.playerId, 'purchases')
        return
      case 'auctionWon':
        add(event.playerId, 'purchases')
        add(event.playerId, 'auctionsWon')
        return
      case 'backdoorBuilt':
        add(event.playerId, event.level === 5 ? 'rootkitsBuilt' : 'backdoorsBuilt')
        return
      case 'sentToQuarantine':
        add(event.playerId, 'quarantines')
        return
      case 'bankrupt': {
        const counters = players[event.playerId]
        bankruptcies += 1
        if (counters) counters.bankruptcy = { turn, creditor: event.creditor, rank: bankruptcies }
        return
      }
      default:
        return
    }
  }

  for (const event of events) {
    onEvent(event)
    positions.follow(event)
  }
  return { rounds, players, squareRents }
}
