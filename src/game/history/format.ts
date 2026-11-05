import { squareAt, squareById, type DeckKind, type SquareId, type TradeOffer, type TradeSide } from '../../engine'
import { formatPwn } from '../format'

const NBSP = ' '
const STARTS_WITH_VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæ]/i

const DECK_NAMES: Record<DeckKind, string> = { exploit: 'Exploit', patch: 'Patch' }

/** Name of the square with the given identifier. */
export function squareName(id: SquareId): string {
  return squareById(id).name
}

/** Name of the square at a board index. */
export function squareNameAt(index: number): string {
  return squareAt(index).name
}

/** French name of a deck of cards. */
export function deckName(deck: DeckKind): string {
  return DECK_NAMES[deck]
}

/** A count followed by its noun, singular for one, plural otherwise: `1 backdoor`, `3 backdoors`. */
export function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count}${NBSP}${count === 1 ? singular : plural}`
}

/** French enumeration: `A`, `A et B`, `A, B et C`. */
export function listOf(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`
}

/** « de » followed by a name, elided before a vowel: `d’Alice`, `de Bob`. */
export function ofName(name: string): string {
  return STARTS_WITH_VOWEL.test(name) ? `d’${name}` : `de ${name}`
}

function sideText(side: TradeSide, isMortgaged: (id: SquareId) => boolean): string {
  const squares = side.squares.map((id) => `${squareName(id)}${isMortgaged(id) ? ' (en veille)' : ''}`)
  const cash = side.cash > 0 ? [formatPwn(side.cash)] : []
  const keys = side.keys.length > 0 ? [countOf(side.keys.length, 'Clé de déchiffrement', 'Clés de déchiffrement')] : []
  const items = [...squares, ...cash, ...keys]
  return items.length > 0 ? listOf(items) : 'rien'
}

/** An offer in words, as its author sees it: what they give `contre` what they ask for, the squares said to be mortgaged flagged `(en veille)`. */
export function offerText(offer: TradeOffer, isMortgaged: (id: SquareId) => boolean = () => false): string {
  return `${sideText(offer.give, isMortgaged)} contre ${sideText(offer.receive, isMortgaged)}`
}
