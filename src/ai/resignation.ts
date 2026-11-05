import { BOARD_SIZE, liquidationValue, netWorth, SALARY, squareById, type PlayerId, type SquareId } from '../engine'
import { RESIGN_NET_WORTH_SHARE, RESIGN_RUIN_ROUNDS } from './constants'
import { landingOdds } from './landingOdds'
import type { PlayerView } from './playerView'
import { AVERAGE_DICE_TOTAL, expectedRent, opponents, rentAt } from './valuation'

const SALARY_PER_ROLL = (SALARY * AVERAGE_DICE_TOTAL) / BOARD_SIZE

function activeSquaresOf(view: PlayerView, playerId: PlayerId): SquareId[] {
  return Object.entries(view.ownership)
    .filter(([, own]) => own.owner === playerId && !own.mortgaged)
    .map(([squareId]) => squareId)
}

function rentToPay(view: PlayerView, playerId: PlayerId): number {
  return opponents(view, playerId)
    .flatMap((rival) => activeSquaresOf(view, rival.id).map((id) => (landingOdds()[squareById(id).index] ?? 0) * rentAt(view, id, rival.id)))
    .reduce((total, rent) => total + rent, 0)
}

function rentToCollect(view: PlayerView, playerId: PlayerId): number {
  return activeSquaresOf(view, playerId).reduce((total, id) => total + expectedRent(view, id, playerId), 0)
}

/** Rent the player expects to pay on a roll, minus the rents it expects to collect over a round of its opponents and its average share of the salary per roll. */
export function expectedLossPerRound(view: PlayerView, playerId: PlayerId): number {
  return rentToPay(view, playerId) - rentToCollect(view, playerId) - SALARY_PER_ROLL
}

/** Whether the player lags far behind the richest opponent while the rents to expect would take all it can raise within a few rounds. */
export function gameLost(view: PlayerView, playerId: PlayerId): boolean {
  const richest = Math.max(...opponents(view, playerId).map((rival) => netWorth(view, rival.id)))
  if (netWorth(view, playerId) > RESIGN_NET_WORTH_SHARE * richest) return false
  const loss = expectedLossPerRound(view, playerId)
  return loss > 0 && liquidationValue(view, playerId) < RESIGN_RUIN_ROUNDS * loss
}
