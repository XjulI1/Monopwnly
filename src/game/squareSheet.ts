import {
  FAMILY_NAMES,
  NODE_RENTS,
  ownsWholeFamily,
  purchasableById,
  QUARANTINE_FINE,
  SALARY,
  SERVICE_MULTIPLIERS,
  squareById,
  unmortgageCost,
  type BuildingLevel,
  type FamilyId,
  type GameState,
  type PlayerId,
  type Square,
  type SquareId,
} from '../engine'
import { formatPwn } from './format'

/** One line of a rent table; the current one applies to the square right now. */
export type RentRow = { label: string; amount: number; current: boolean }

type Holding = { owner: PlayerId | null; mortgaged: boolean; price: number; mortgageValue: number; unmortgageCost: number }

/** What the sheet of a square shows. */
export type SquareSheet =
  | ({ kind: 'system'; name: string; family: FamilyId; familyName: string; backdoorCost: number; level: BuildingLevel; rents: RentRow[] } & Holding)
  | ({ kind: 'node'; name: string; rents: RentRow[] } & Holding)
  | ({ kind: 'service'; name: string; multipliers: RentRow[] } & Holding)
  | { kind: 'other'; name: string; effect: string }

const BACKDOOR_ROWS = ['1 backdoor', '2 backdoors', '3 backdoors', '4 backdoors', 'Rootkit']

function countOfKind(state: GameState, owner: PlayerId | null, kind: 'node' | 'service'): number {
  if (!owner) return 0
  return Object.entries(state.ownership).filter(([id, own]) => own.owner === owner && purchasableById(id)?.kind === kind).length
}

function effectOf(square: Square): string {
  switch (square.kind) {
    case 'corner':
      switch (square.corner) {
        case 'boot':
          return `Encaissez ${formatPwn(SALARY)} à chaque passage.`
        case 'quarantine':
          return `Simple visite, ou quarantaine pour un joueur envoyé ici. Pour sortir : payer ${formatPwn(QUARANTINE_FINE)}, utiliser une Clé de déchiffrement ou faire un double.`
        case 'dmz':
          return 'Case de repos : il ne se passe rien.'
        case 'detected':
          return 'Allez directement en quarantaine, sans passer par Boot.'
      }
      return ''
    case 'tax':
      return `Payez ${formatPwn(square.amount)} à la banque.`
    case 'card':
      return `Piochez une carte ${square.deck === 'exploit' ? 'Exploit' : 'Patch'}.`
    default:
      return ''
  }
}

/** Contents of the sheet of any square for the current state. */
export function squareSheet(state: GameState, squareId: SquareId): SquareSheet {
  const square = squareById(squareId)
  if (square.kind !== 'system' && square.kind !== 'node' && square.kind !== 'service') {
    return { kind: 'other', name: square.name, effect: effectOf(square) }
  }
  const own = state.ownership[squareId]
  const active = own !== undefined && !own.mortgaged
  const holding: Holding = {
    owner: own?.owner ?? null,
    mortgaged: own?.mortgaged ?? false,
    price: square.price,
    mortgageValue: square.mortgageValue,
    unmortgageCost: unmortgageCost(squareId),
  }
  if (square.kind === 'node') {
    const count = active ? countOfKind(state, holding.owner, 'node') : 0
    const rents = NODE_RENTS.map((amount, i) => ({ label: `${i + 1} ${i === 0 ? 'nœud' : 'nœuds'}`, amount, current: i === count - 1 }))
    return { kind: 'node', name: square.name, rents, ...holding }
  }
  if (square.kind === 'service') {
    const count = active ? countOfKind(state, holding.owner, 'service') : 0
    const multipliers = SERVICE_MULTIPLIERS.map((amount, i) => ({
      label: `${i + 1} ${i === 0 ? 'service' : 'services'}`,
      amount,
      current: i === count - 1,
    }))
    return { kind: 'service', name: square.name, multipliers, ...holding }
  }
  const level = own?.level ?? 0
  const wholeFamily = own !== undefined && ownsWholeFamily(state, own.owner, squareId)
  const currentRow = !active ? -1 : level > 0 ? level + 1 : wholeFamily ? 1 : 0
  const [base, ...built] = square.rents
  const amounts = [base, base * 2, ...built]
  const labels = ['Loyer de base', 'Famille complète', ...BACKDOOR_ROWS]
  const rents = labels.map((label, i) => ({ label, amount: amounts[i] ?? 0, current: i === currentRow }))
  return {
    kind: 'system',
    name: square.name,
    family: square.family,
    familyName: FAMILY_NAMES[square.family],
    backdoorCost: square.backdoorCost,
    level,
    rents,
    ...holding,
  }
}
