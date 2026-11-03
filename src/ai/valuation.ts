import {
  BOARD,
  FAMILY_SQUARES,
  NODE_RENTS,
  purchasableById,
  rentIfLanded,
  SERVICE_MULTIPLIERS,
  type AiLevel,
  type Player,
  type PlayerId,
  type SquareId,
  type SystemSquare,
} from '../engine'
import {
  EASY_RESERVE,
  FAMILY_BLOCK_BONUS,
  FAMILY_COMPLETION_BONUS,
  FAMILY_PROGRESS_BONUS,
  STARTED_BY_OPPONENT_DISCOUNT,
  HORIZON,
  MIN_RESERVE,
  PRUDENCE,
  REACHABLE_LEVEL,
  WORST_RENT_WEIGHT,
  YIELD_ADJUSTMENT,
  YIELD_WEIGHT,
} from './constants'
import { diceTotalOdds, landingOdds } from './landingOdds'
import type { PlayerView } from './playerView'

const AVERAGE_DICE_TOTAL = 7
const DICE_TOTALS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

/** How a square relates to the families of the player and of the opponents. */
export type FamilyOutlook = { completes: boolean; approaches: boolean; blocks: boolean; contested: boolean }

/** Players still in the game other than the given one. */
export function opponents(view: PlayerView, playerId: PlayerId): Player[] {
  return view.players.filter((p) => p.id !== playerId && !p.bankrupt)
}

/** The player with the given identifier. */
export function playerOf(view: PlayerView, playerId: PlayerId): Player {
  const player = view.players.find((p) => p.id === playerId)
  if (!player) throw new Error(`Unknown player ${playerId}`)
  return player
}

function otherFamilySquares(square: SystemSquare): SquareId[] {
  return FAMILY_SQUARES[square.family].filter((id) => id !== square.id)
}

/** Whether the square completes, approaches (the player holds part of its family, no opponent does) or blocks (one opponent holds the rest of its family) a family. */
export function familyOutlook(view: PlayerView, squareId: SquareId, playerId: PlayerId): FamilyOutlook {
  const square = purchasableById(squareId)
  if (!square || square.kind !== 'system') return { completes: false, approaches: false, blocks: false, contested: false }
  const owners = otherFamilySquares(square).map((id) => view.ownership[id]?.owner ?? null)
  const mine = owners.filter((owner) => owner === playerId).length
  const theirs = owners.filter((owner) => owner !== null && owner !== playerId)
  const blocker = theirs[0]
  return {
    completes: mine === owners.length,
    approaches: mine > 0 && theirs.length === 0,
    blocks: blocker !== undefined && theirs.length === owners.length && theirs.every((owner) => owner === blocker),
    contested: theirs.length > 0,
  }
}

function ownsAllOthers(view: PlayerView, square: SystemSquare, owner: PlayerId): boolean {
  return otherFamilySquares(square).every((id) => view.ownership[id]?.owner === owner)
}

function countOfKind(view: PlayerView, owner: PlayerId, kind: 'node' | 'service', including: SquareId): number {
  const owned = BOARD.filter((s) => s.kind === kind && (s.id === including || view.ownership[s.id]?.owner === owner))
  return owned.length
}

/** Rent the square would bring to the owner at a building level, the square counted as theirs (services at an average dice total). */
export function rentAt(view: PlayerView, squareId: SquareId, owner: PlayerId, level: number = view.ownership[squareId]?.level ?? 0): number {
  const square = purchasableById(squareId)
  if (!square) return 0
  if (square.kind === 'system') {
    if (level > 0) return square.rents[level] ?? 0
    return ownsAllOthers(view, square, owner) ? square.rents[0] * 2 : square.rents[0]
  }
  if (square.kind === 'node') return NODE_RENTS[countOfKind(view, owner, 'node', squareId) - 1] ?? 0
  return AVERAGE_DICE_TOTAL * (SERVICE_MULTIPLIERS[countOfKind(view, owner, 'service', squareId) - 1] ?? 0)
}

/** Rent the owner can expect from the square per opponent roll round, at a building level. */
export function expectedRent(view: PlayerView, squareId: SquareId, owner: PlayerId, level?: number): number {
  const square = purchasableById(squareId)
  if (!square) return 0
  return (landingOdds()[square.index] ?? 0) * rentAt(view, squareId, owner, level) * opponents(view, owner).length
}

/** Estimated number of rounds left, from the cash still in play. */
export function horizon(view: PlayerView): number {
  const active = view.players.filter((p) => !p.bankrupt)
  const cash = active.reduce((sum, p) => sum + p.cash, 0)
  const rounds = cash / (Math.max(1, active.length) * HORIZON.cashPerPlayerRound)
  return Math.min(HORIZON.max, Math.max(HORIZON.min, rounds))
}

function familyPremium(price: number, outlook: FamilyOutlook): number {
  if (outlook.completes) return price * FAMILY_COMPLETION_BONUS
  if (outlook.approaches) return price * FAMILY_PROGRESS_BONUS
  if (outlook.contested) return -price * STARTED_BY_OPPONENT_DISCOUNT
  return 0
}

function yieldAdjustment(view: PlayerView, squareId: SquareId, playerId: PlayerId, price: number, outlook: FamilyOutlook): number {
  const level = outlook.completes || outlook.approaches ? REACHABLE_LEVEL : 0
  const expected = expectedRent(view, squareId, playerId, level) * horizon(view)
  const adjustment = (expected - price) * YIELD_WEIGHT
  return Math.min(price * YIELD_ADJUSTMENT.ceiling, Math.max(price * YIELD_ADJUSTMENT.floor, adjustment))
}

/** Expected yield of the square over the remaining game, as a share of its price. */
export function yieldRatio(view: PlayerView, squareId: SquareId, playerId: PlayerId): number {
  const square = purchasableById(squareId)
  if (!square) return 0
  return (expectedRent(view, squareId, playerId, 0) * horizon(view)) / square.price
}

/** What a square is worth to the player, in PwnCoins, as estimated at each level. */
export function squareValue(view: PlayerView, squareId: SquareId, playerId: PlayerId, level: AiLevel): number {
  const square = purchasableById(squareId)
  if (!square) return 0
  if (level === 'easy') return square.price
  const outlook = familyOutlook(view, squareId, playerId)
  const normal = square.price + familyPremium(square.price, outlook)
  if (level === 'normal') return normal
  const block = outlook.blocks ? square.price * FAMILY_BLOCK_BONUS : 0
  return Math.round(normal + block + yieldAdjustment(view, squareId, playerId, square.price, outlook))
}

/** Rent the player may have to pay on the next roll: expected rent of the opponent squares 2 to 12 squares ahead, plus part of the worst one. */
export function rentRisk(view: PlayerView, playerId: PlayerId, from = playerOf(view, playerId).position): number {
  let expected = 0
  let worst = 0
  for (const total of DICE_TOTALS) {
    const square = BOARD[(from + total) % BOARD.length]
    const own = square ? view.ownership[square.id] : undefined
    if (!square || !own || own.owner === playerId || own.mortgaged) continue
    const rent = rentIfLanded(view, square.id, total)
    expected += diceTotalOdds(total) * rent
    worst = Math.max(worst, rent)
  }
  return expected + WORST_RENT_WEIGHT * worst
}

/** Cash the AI keeps for the rents of the next roll; spending stays above it except where its level allows otherwise. */
export function reserve(view: PlayerView, playerId: PlayerId, level: AiLevel): number {
  if (level === 'easy') return EASY_RESERVE
  return Math.round(MIN_RESERVE + PRUDENCE[level] * rentRisk(view, playerId))
}
