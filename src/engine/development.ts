import { FAMILY_SQUARES, UNMORTGAGE_INTEREST, purchasableById } from './board/squares'
import { emit, fail, getPlayer, transfer, type Ctx } from './context'
import type { BuildingLevel, GameState, PlayerId, RuleError, SquareId, SystemSquare } from './types'

function error(code: RuleError['code'], message: string): RuleError {
  return { code, message }
}

function familyLevels(state: GameState, square: SystemSquare): number[] {
  return FAMILY_SQUARES[square.family].map((id) => state.ownership[id]?.level ?? 0)
}

function ownedSquare(state: GameState, playerId: PlayerId, squareId: SquareId) {
  const square = purchasableById(squareId)
  if (!square) return { problem: error('UNKNOWN_SQUARE', 'Cette case ne peut pas être possédée.') }
  const own = state.ownership[squareId]
  if (!own || own.owner !== playerId) return { problem: error('NOT_OWNER', 'Ce système ne vous appartient pas.') }
  return { square, own }
}

/** Cost to reactivate a mortgaged square: its mortgage value plus 10 %, rounded up. */
export function unmortgageCost(squareId: SquareId): number {
  const square = purchasableById(squareId)
  if (!square) return 0
  return Math.ceil((square.mortgageValue * (100 + UNMORTGAGE_INTEREST * 100)) / 100)
}

/** Explains why the player cannot add a backdoor (or a rootkit) on the square, or null if allowed. */
export function buildProblem(state: GameState, playerId: PlayerId, squareId: SquareId): RuleError | null {
  const found = ownedSquare(state, playerId, squareId)
  if ('problem' in found) return found.problem ?? null
  const { square, own } = found
  if (square.kind !== 'system') return error('NOT_BUILDABLE', 'On ne construit que sur les systèmes.')
  const family = FAMILY_SQUARES[square.family]
  if (!family.every((id) => state.ownership[id]?.owner === playerId)) {
    return error('GROUP_INCOMPLETE', 'Il faut posséder toute la famille pour construire.')
  }
  if (family.some((id) => state.ownership[id]?.mortgaged)) {
    return error('MORTGAGED', 'Un système de la famille est en veille.')
  }
  if (own.level === 5) return error('MAX_LEVEL', 'Ce système porte déjà un rootkit.')
  if (own.level > Math.min(...familyLevels(state, square))) {
    return error('UNEVEN_BUILDING', 'Construisez d’abord sur les autres systèmes de la famille.')
  }
  const stockEmpty = own.level === 4 ? state.bankStock.rootkits < 1 : state.bankStock.backdoors < 1
  if (stockEmpty) return error('NO_STOCK', 'La banque n’a plus de pièce disponible.')
  if (getPlayer(state, playerId).cash < square.backdoorCost) {
    return error('INSUFFICIENT_FUNDS', `Il vous faut ${square.backdoorCost} Ᵽ pour construire.`)
  }
  return null
}

/** Explains why the player cannot sell a building level on the square, or null if allowed. */
export function sellProblem(state: GameState, playerId: PlayerId, squareId: SquareId): RuleError | null {
  const found = ownedSquare(state, playerId, squareId)
  if ('problem' in found) return found.problem ?? null
  const { square, own } = found
  if (square.kind !== 'system') return error('NOT_BUILDABLE', 'Il n’y a pas de construction sur cette case.')
  if (own.level === 0) return error('NO_BUILDING', 'Ce système n’a pas de construction.')
  if (own.level < Math.max(...familyLevels(state, square))) {
    return error('UNEVEN_BUILDING', 'Revendez d’abord sur les systèmes les plus construits de la famille.')
  }
  if (own.level === 5 && state.bankStock.backdoors < 4) {
    return error('NO_STOCK', 'La banque n’a pas 4 backdoors pour remplacer le rootkit.')
  }
  return null
}

/** Explains why the player cannot mortgage the square, or null if allowed. */
export function mortgageProblem(state: GameState, playerId: PlayerId, squareId: SquareId): RuleError | null {
  const found = ownedSquare(state, playerId, squareId)
  if ('problem' in found) return found.problem ?? null
  const { square, own } = found
  if (own.mortgaged) return error('MORTGAGED', 'Cette case est déjà en veille.')
  if (square.kind === 'system' && familyLevels(state, square).some((level) => level > 0)) {
    return error('HAS_BUILDINGS', 'Revendez d’abord les constructions de la famille.')
  }
  return null
}

/** Explains why the player cannot reactivate the square, or null if allowed. */
export function unmortgageProblem(state: GameState, playerId: PlayerId, squareId: SquareId): RuleError | null {
  const found = ownedSquare(state, playerId, squareId)
  if ('problem' in found) return found.problem ?? null
  if (!found.own.mortgaged) return error('NOT_MORTGAGED', 'Cette case n’est pas en veille.')
  const cost = unmortgageCost(squareId)
  if (getPlayer(state, playerId).cash < cost) return error('INSUFFICIENT_FUNDS', `Il vous faut ${cost} Ᵽ pour la réactiver.`)
  return null
}

function ensure(problem: RuleError | null): void {
  if (problem) fail(problem.code, problem.message)
}

export function buildBackdoor(ctx: Ctx, playerId: PlayerId, squareId: SquareId): void {
  ensure(buildProblem(ctx.state, playerId, squareId))
  const own = ctx.state.ownership[squareId]
  const square = purchasableById(squareId)
  if (!own || !square || square.kind !== 'system') return
  if (own.level === 4) {
    ctx.state.bankStock.rootkits -= 1
    ctx.state.bankStock.backdoors += 4
  } else ctx.state.bankStock.backdoors -= 1
  own.level = (own.level + 1) as BuildingLevel
  transfer(ctx, playerId, 'bank', square.backdoorCost, 'build')
  emit(ctx, { type: 'backdoorBuilt', playerId, squareId, level: own.level })
}

export function sellBackdoor(ctx: Ctx, playerId: PlayerId, squareId: SquareId): void {
  ensure(sellProblem(ctx.state, playerId, squareId))
  const own = ctx.state.ownership[squareId]
  const square = purchasableById(squareId)
  if (!own || !square || square.kind !== 'system') return
  if (own.level === 5) {
    ctx.state.bankStock.rootkits += 1
    ctx.state.bankStock.backdoors -= 4
  } else ctx.state.bankStock.backdoors += 1
  own.level = (own.level - 1) as BuildingLevel
  transfer(ctx, 'bank', playerId, square.backdoorCost / 2, 'sellBuilding')
  emit(ctx, { type: 'backdoorSold', playerId, squareId, level: own.level })
}

export function mortgage(ctx: Ctx, playerId: PlayerId, squareId: SquareId): void {
  ensure(mortgageProblem(ctx.state, playerId, squareId))
  const own = ctx.state.ownership[squareId]
  const square = purchasableById(squareId)
  if (!own || !square) return
  own.mortgaged = true
  transfer(ctx, 'bank', playerId, square.mortgageValue, 'mortgage')
  emit(ctx, { type: 'mortgaged', playerId, squareId })
}

export function unmortgage(ctx: Ctx, playerId: PlayerId, squareId: SquareId): void {
  ensure(unmortgageProblem(ctx.state, playerId, squareId))
  const own = ctx.state.ownership[squareId]
  if (!own) return
  own.mortgaged = false
  transfer(ctx, playerId, 'bank', unmortgageCost(squareId), 'unmortgage')
  emit(ctx, { type: 'unmortgaged', playerId, squareId })
}
