import type { Highlights } from '../board/boardViewModel'
import {
  BOARD,
  expectedActor,
  MAX_QUARANTINE_ATTEMPTS,
  purchasableById,
  QUARANTINE_FINE,
  squareById,
  type Action,
  type GameState,
  type PlayerId,
  type SquareId,
} from '../engine'
import { formatPwn } from './format'
import {
  bidLimits,
  checkAction,
  debtSummary,
  manageableSquares,
  managementOptions,
  type ActionCheck,
  type DebtSummary,
  type ManagementOption,
} from './legalActions'

/** Interface state added on top of the engine phase: management mode, open sheet, pending bankruptcy confirmation. */
export type Interaction = {
  managing: boolean
  sheet: SquareId | null
  confirmingBankruptcy: boolean
}

/** No management mode, no sheet, no confirmation. */
export const IDLE: Interaction = { managing: false, sheet: null, confirmingBankruptcy: false }

/** Buttons of the HUD. */
export type ButtonId =
  | 'rollDice'
  | 'endTurn'
  | 'payFine'
  | 'useKey'
  | 'manage'
  | 'doneManaging'
  | 'buy'
  | 'decline'
  | 'pass'
  | 'payDebt'
  | 'declareBankruptcy'
  | 'confirmBankruptcy'
  | 'cancelBankruptcy'
  | 'build'
  | 'sell'
  | 'mortgage'
  | 'unmortgage'
  | 'closeSheet'

/** Something the user did: tap a square, tap outside the squares, press a button, or validate a bid. */
export type InteractionInput =
  | { kind: 'square'; index: number }
  | { kind: 'outside' }
  | { kind: 'button'; id: ButtonId }
  | { kind: 'bid'; amount: number }

/** A button as the HUD shows it; a disabled button carries the engine reason. */
export type ButtonView = {
  id: ButtonId
  label: string
  enabled: boolean
  reason: string | null
  amount: number | null
}

/** Main panel of the HUD, decided by the engine phase. */
export type PanelKind = 'turn' | 'buy' | 'auction' | 'debt' | 'gameOver'

/** A quick bid from the best bid. */
export type BidShortcut = { label: string; amount: number; enabled: boolean }

/** What the auction panel shows. */
export type AuctionView = {
  squareId: SquareId
  highBid: number
  highBidder: PlayerId | null
  bidders: PlayerId[]
  withdrawn: PlayerId[]
  nextBidder: PlayerId
  min: number
  max: number
  defaultBid: number
  shortcuts: BidShortcut[]
}

/** What the HUD shows for the current engine state and interaction. */
export type InteractionView = {
  actor: PlayerId | null
  panel: PanelKind
  managing: boolean
  buttons: ButtonView[]
  highlights: Highlights
  sheet: { squareId: SquareId; buttons: ButtonView[] } | null
  quarantine: { attempt: number; maxAttempts: number } | null
  buy: { squareId: SquareId; price: number; cash: number } | null
  auction: AuctionView | null
  debt: (DebtSummary & { confirming: boolean }) | null
}

/** Result of an input: the new interaction and, possibly, the engine action to dispatch. */
export type InteractionResult = { interaction: Interaction; action?: Action }

const BID_STEPS = [10, 50, 100] as const

const MANAGEMENT_BUTTONS: Record<ManagementOption['type'], ButtonId> = {
  buildBackdoor: 'build',
  sellBackdoor: 'sell',
  mortgage: 'mortgage',
  unmortgage: 'unmortgage',
}

function managementLabel(option: ManagementOption): string {
  switch (option.type) {
    case 'buildBackdoor':
      return option.rootkit ? 'Installer un rootkit' : 'Construire'
    case 'sellBackdoor':
      return option.rootkit ? 'Revendre le rootkit' : 'Revendre'
    case 'mortgage':
      return 'Mettre en veille'
    case 'unmortgage':
      return 'Réactiver'
  }
}

function makeButton(id: ButtonId, label: string, check: ActionCheck = { allowed: true, reason: null }, amount: number | null = null): ButtonView {
  return { id, label, enabled: check.allowed, reason: check.reason, amount }
}

function isManagementPhase(state: GameState): boolean {
  return state.phase.kind === 'preRoll' || state.phase.kind === 'postRoll'
}

function isManaging(state: GameState, interaction: Interaction): boolean {
  return state.phase.kind === 'debt' || (interaction.managing && isManagementPhase(state))
}

function manageButton(state: GameState, actor: PlayerId): ButtonView {
  const possible = manageableSquares(state, actor).length > 0
  return makeButton('manage', 'Gérer mes systèmes', {
    allowed: possible,
    reason: possible ? null : 'Aucune action possible sur vos systèmes pour l’instant.',
  })
}

function turnButtons(state: GameState, actor: PlayerId, managing: boolean): ButtonView[] {
  if (managing) return [makeButton('doneManaging', 'Terminer')]
  const phase = state.phase
  const check = (action: Action) => checkAction(state, action)
  if (phase.kind === 'postRoll') {
    const main = phase.mayRollAgain
      ? makeButton('rollDice', 'Relancer', check({ type: 'rollDice', playerId: actor }))
      : makeButton('endTurn', 'Fin du tour', check({ type: 'endTurn', playerId: actor }))
    return [main, manageButton(state, actor)]
  }
  const player = state.players.find((p) => p.id === actor)
  if (!player?.quarantine) {
    return [makeButton('rollDice', 'Lancer les dés', check({ type: 'rollDice', playerId: actor })), manageButton(state, actor)]
  }
  return [
    makeButton('payFine', `Payer ${formatPwn(QUARANTINE_FINE)}`, check({ type: 'payQuarantineFine', playerId: actor })),
    makeButton('useKey', 'Utiliser une Clé', check({ type: 'useDecryptionKey', playerId: actor })),
    makeButton('rollDice', 'Tenter un double', check({ type: 'rollDice', playerId: actor })),
    manageButton(state, actor),
  ]
}

function mainButtons(state: GameState, interaction: Interaction, actor: PlayerId | null): ButtonView[] {
  if (!actor) return []
  const phase = state.phase
  switch (phase.kind) {
    case 'preRoll':
    case 'postRoll':
      return turnButtons(state, actor, interaction.managing)
    case 'buyDecision': {
      const price = purchasableById(phase.squareId)?.price ?? 0
      return [
        makeButton('buy', 'Acheter', checkAction(state, { type: 'buyProperty', playerId: actor }), price),
        makeButton('decline', state.settings.auctions ? 'Mettre aux enchères' : 'Ne pas acheter'),
      ]
    }
    case 'auction':
      return [makeButton('pass', 'Passer', checkAction(state, { type: 'passBid', playerId: actor }))]
    case 'debt': {
      if (interaction.confirmingBankruptcy) {
        return [makeButton('confirmBankruptcy', 'Confirmer la faillite'), makeButton('cancelBankruptcy', 'Annuler')]
      }
      const amount = phase.payments[0]?.amount ?? null
      return [
        makeButton('payDebt', 'Payer', checkAction(state, { type: 'payDebt', playerId: actor }), amount),
        makeButton('declareBankruptcy', 'Déclarer faillite'),
      ]
    }
    case 'gameOver':
      return []
  }
}

function sheetOptions(state: GameState, interaction: Interaction, actor: PlayerId | null): ManagementOption[] {
  if (!interaction.sheet || !actor || !isManaging(state, interaction)) return []
  return managementOptions(state, actor, interaction.sheet)
}

function sheetButtons(options: ManagementOption[]): ButtonView[] {
  return options.map((option) => makeButton(MANAGEMENT_BUTTONS[option.type], managementLabel(option), option, option.amount))
}

function squareIndex(squareId: SquareId): number {
  return squareById(squareId).index
}

function highlightsOf(state: GameState, interaction: Interaction, actor: PlayerId | null, managing: boolean): Highlights {
  const highlights: Highlights = {}
  if (managing && actor) {
    for (const id of manageableSquares(state, actor)) highlights[squareIndex(id)] = 'selectable'
  }
  const phase = state.phase
  if (phase.kind === 'buyDecision' || phase.kind === 'auction') highlights[squareIndex(phase.squareId)] = 'selected'
  if (interaction.sheet) highlights[squareIndex(interaction.sheet)] = 'selected'
  return highlights
}

function auctionView(state: GameState): AuctionView | null {
  const phase = state.phase
  const limits = bidLimits(state)
  if (phase.kind !== 'auction' || !limits) return null
  const withdrawn = state.players.filter((p) => !p.bankrupt && !phase.bidders.includes(p.id)).map((p) => p.id)
  return {
    squareId: phase.squareId,
    highBid: phase.highBid,
    highBidder: phase.highBidder,
    bidders: [...phase.bidders],
    withdrawn,
    nextBidder: phase.nextBidder,
    min: limits.min,
    max: limits.max,
    defaultBid: limits.min,
    shortcuts: BID_STEPS.map((step) => {
      const amount = phase.highBid + step
      return { label: `+${step}`, amount, enabled: amount >= limits.min && amount <= limits.max }
    }),
  }
}

function quarantineView(state: GameState, actor: PlayerId | null): InteractionView['quarantine'] {
  if (state.phase.kind !== 'preRoll' || !actor) return null
  const quarantine = state.players.find((p) => p.id === actor)?.quarantine
  return quarantine ? { attempt: quarantine.failedAttempts + 1, maxAttempts: MAX_QUARANTINE_ATTEMPTS } : null
}

function buyView(state: GameState, actor: PlayerId | null): InteractionView['buy'] {
  const phase = state.phase
  if (phase.kind !== 'buyDecision') return null
  const cash = state.players.find((p) => p.id === actor)?.cash ?? 0
  return { squareId: phase.squareId, price: purchasableById(phase.squareId)?.price ?? 0, cash }
}

function panelOf(state: GameState): PanelKind {
  switch (state.phase.kind) {
    case 'preRoll':
    case 'postRoll':
      return 'turn'
    case 'buyDecision':
      return 'buy'
    case 'auction':
      return 'auction'
    case 'debt':
      return 'debt'
    case 'gameOver':
      return 'gameOver'
  }
}

/** Whether the engine accepts this bid from the expected bidder. */
export function bidCheck(state: GameState, amount: number): ActionCheck {
  const actor = expectedActor(state)
  if (state.phase.kind !== 'auction' || !actor) return { allowed: false, reason: 'Aucune enchère en cours.' }
  return checkAction(state, { type: 'placeBid', playerId: actor, amount })
}

/** Everything the HUD and the board need to show for the engine state and the interaction. */
export function viewOf(state: GameState, interaction: Interaction): InteractionView {
  const actor = expectedActor(state)
  const managing = isManaging(state, interaction)
  const summary = debtSummary(state)
  return {
    actor,
    panel: panelOf(state),
    managing,
    buttons: mainButtons(state, interaction, actor),
    highlights: highlightsOf(state, interaction, actor, managing),
    sheet: interaction.sheet
      ? { squareId: interaction.sheet, buttons: sheetButtons(sheetOptions(state, interaction, actor)) }
      : null,
    quarantine: quarantineView(state, actor),
    buy: buyView(state, actor),
    auction: auctionView(state),
    debt: summary ? { ...summary, confirming: interaction.confirmingBankruptcy } : null,
  }
}

function pressButton(state: GameState, interaction: Interaction, id: ButtonId): InteractionResult {
  const view = viewOf(state, interaction)
  const actor = view.actor
  const pressed = [...view.buttons, ...(view.sheet?.buttons ?? [])].find((b) => b.id === id)
  if (id === 'closeSheet') return { interaction: { ...interaction, sheet: null } }
  if (!pressed?.enabled || !actor) return { interaction }
  const playerId = actor
  switch (id) {
    case 'rollDice':
      return { interaction: IDLE, action: { type: 'rollDice', playerId } }
    case 'endTurn':
      return { interaction: IDLE, action: { type: 'endTurn', playerId } }
    case 'payFine':
      return { interaction: IDLE, action: { type: 'payQuarantineFine', playerId } }
    case 'useKey':
      return { interaction: IDLE, action: { type: 'useDecryptionKey', playerId } }
    case 'manage':
      return { interaction: { ...IDLE, managing: true } }
    case 'doneManaging':
      return { interaction: IDLE }
    case 'buy':
      return { interaction: IDLE, action: { type: 'buyProperty', playerId } }
    case 'decline':
      return { interaction: IDLE, action: { type: 'declineProperty', playerId } }
    case 'pass':
      return { interaction, action: { type: 'passBid', playerId } }
    case 'payDebt':
      return { interaction: IDLE, action: { type: 'payDebt', playerId } }
    case 'declareBankruptcy':
      return { interaction: { ...interaction, confirmingBankruptcy: true } }
    case 'confirmBankruptcy':
      return { interaction: IDLE, action: { type: 'declareBankruptcy', playerId } }
    case 'cancelBankruptcy':
      return { interaction: { ...interaction, confirmingBankruptcy: false } }
    case 'build':
    case 'sell':
    case 'mortgage':
    case 'unmortgage': {
      const option = sheetOptions(state, interaction, actor).find((o) => MANAGEMENT_BUTTONS[o.type] === id)
      return option ? { interaction, action: option.action } : { interaction }
    }
  }
}

/** Applies a user input to the interaction and tells which engine action, if any, it triggers. */
export function reduceInteraction(state: GameState, interaction: Interaction, input: InteractionInput): InteractionResult {
  switch (input.kind) {
    case 'square': {
      const square = BOARD[input.index]
      return square ? { interaction: { ...interaction, sheet: square.id } } : { interaction }
    }
    case 'outside':
      return { interaction: { ...interaction, sheet: null } }
    case 'bid': {
      const actor = expectedActor(state)
      if (!actor || !bidCheck(state, input.amount).allowed) return { interaction }
      return { interaction, action: { type: 'placeBid', playerId: actor, amount: input.amount } }
    }
    case 'button':
      return pressButton(state, interaction, input.id)
  }
}
