import type { PhaseKind } from '../engine'

const PWN_SYMBOL = 'Ᵽ'
const NBSP = '\u00A0'

const amountFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const deltaFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0, signDisplay: 'exceptZero' })

const PHASE_NAMES: Record<PhaseKind, string> = {
  preRoll: 'Avant le lancer',
  buyDecision: 'Décision d’achat',
  auction: 'Enchère',
  debt: 'Règlement de dette',
  postRoll: 'Après le lancer',
  gameOver: 'Partie terminée',
}

/** Formats an amount of PwnCoins the French way, e.g. `1 500 Ᵽ`. */
export function formatPwn(amount: number): string {
  return `${amountFormat.format(amount)}${NBSP}${PWN_SYMBOL}`
}

/** Formats a change of PwnCoins with its sign, e.g. `+200 Ᵽ` or `-50 Ᵽ`. */
export function formatPwnDelta(amount: number): string {
  return `${deltaFormat.format(amount)}${NBSP}${PWN_SYMBOL}`
}

/** French name of an engine phase. */
export function phaseName(kind: PhaseKind): string {
  return PHASE_NAMES[kind]
}
