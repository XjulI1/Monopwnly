import type { GameSettings, WinReason } from '../engine'
import { formatPwn } from './format'

/** Settings of the four house rules. */
export type HouseRule = 'dmzJackpot' | 'doubleBootBonus' | 'freeBuilding' | 'noRentInQuarantine'

/** How a house rule is shown: its name on the creation screen, the short name of its badge in game and the sentence that explains it. */
export type HouseRuleText = { rule: HouseRule; name: string; badge: string; help: string }

/** The house rules, in the order they are offered. */
export const HOUSE_RULES: readonly HouseRuleText[] = [
  {
    rule: 'dmzJackpot',
    name: 'Cagnotte de la DMZ',
    badge: 'Cagnotte',
    help: 'Les taxes et les cartes qui font payer la banque remplissent une cagnotte, gagnée par le joueur qui s’arrête sur la DMZ.',
  },
  {
    rule: 'doubleBootBonus',
    name: 'Bonus double sur Boot',
    badge: 'Bonus double',
    help: 'S’arrêter sur Boot rapporte 400 Ᵽ au lieu de 200 Ᵽ.',
  },
  {
    rule: 'freeBuilding',
    name: 'Construction libre',
    badge: 'Construction libre',
    help: 'Plus besoin de construire ni de revendre de façon égale dans une famille.',
  },
  {
    rule: 'noRentInQuarantine',
    name: 'Pas de loyer en quarantaine',
    badge: 'Quarantaine sans loyer',
    help: 'Un joueur en quarantaine ne touche aucun loyer.',
  },
]

/** Sentence that explains the turn limit. */
export const TURN_LIMIT_HELP = 'À la fin du dernier tour de table, le plus gros patrimoine gagne.'

/** Sentence that explains the net worth target. */
export const NET_WORTH_TARGET_HELP = 'La partie s’arrête dès qu’un joueur atteint ce patrimoine à la fin d’un tour.'

/** House rules active in the game, in the order they are offered. */
export function activeHouseRules(settings: GameSettings): HouseRuleText[] {
  return HOUSE_RULES.filter(({ rule }) => settings[rule])
}

/** Why the game was won, as the end screen shows it, e.g. « Limite de 30 tours atteinte ». */
export function winReasonText(reason: WinReason, settings: GameSettings): string {
  switch (reason) {
    case 'lastStanding':
      return 'Dernier hacker solvable'
    case 'turnLimit':
      return `Limite de ${settings.turnLimit ?? 0} tours atteinte`
    case 'netWorthTarget':
      return `Objectif de ${formatPwn(settings.netWorthTarget ?? 0)} atteint`
  }
}
