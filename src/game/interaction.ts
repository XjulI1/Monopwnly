import type { Highlights } from '../board/boardViewModel'
import {
  BOARD,
  counterProblem,
  expectedActor,
  FAMILY_SQUARES,
  MAX_QUARANTINE_ATTEMPTS,
  ownedSquares,
  purchasableById,
  QUARANTINE_FINE,
  squareById,
  tradeProposalsLeft,
  validateTrade,
  type Action,
  type CardId,
  type GameState,
  type PlayerId,
  type SquareId,
  type TradeOffer,
  type TradeSide,
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

/** A trade being composed: the chosen partner, what the player gives and what they ask for, and whether it answers the offer received as a counter-offer. */
export type TradeDraft = { partner: PlayerId | null; give: TradeSide; receive: TradeSide; counter: boolean }

/** Interface state added on top of the engine phase: management mode, open sheet, pending bankruptcy confirmation, trade being composed. */
export type Interaction = {
  managing: boolean
  sheet: SquareId | null
  confirmingBankruptcy: boolean
  trade: TradeDraft | null
}

/** No management mode, no sheet, no confirmation, no trade being composed. */
export const IDLE: Interaction = { managing: false, sheet: null, confirmingBankruptcy: false, trade: null }

/** Nothing given, nothing asked. */
export const EMPTY_SIDE: TradeSide = { squares: [], cash: 0, keys: [] }

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
  | 'trade'
  | 'closeTrade'
  | 'proposeTrade'
  | 'acceptTrade'
  | 'rejectTrade'
  | 'counterTrade'

/** Something the user did: tap a square, tap outside the squares, press a button, or validate a bid. */
export type InteractionInput =
  | { kind: 'square'; index: number }
  | { kind: 'outside' }
  | { kind: 'button'; id: ButtonId }
  | { kind: 'bid'; amount: number }
  | { kind: 'tradeDraft'; draft: TradeDraft }

/** A button as the HUD shows it; a disabled button carries the engine reason. */
export type ButtonView = {
  id: ButtonId
  label: string
  enabled: boolean
  reason: string | null
  amount: number | null
  detail: string | null
}

/** A square in a column of the trade composer. */
export type TradeSquareChoice = { squareId: SquareId; selected: boolean; mortgaged: boolean; reason: string | null }

/** One side of the trade composer: the squares, PwnCoins and keys of a player, with what is selected. */
export type TradeColumn = {
  owner: PlayerId
  squares: TradeSquareChoice[]
  cash: number
  maxCash: number
  keys: { cardId: CardId; selected: boolean }[]
}

/** What the trade composer shows. */
export type TradeComposerView = {
  author: PlayerId
  draft: TradeDraft
  partners: PlayerId[]
  give: TradeColumn
  receive: TradeColumn | null
  check: ActionCheck
  empty: boolean
  remaining: number
}

/** Main panel of the HUD, decided by the engine phase. */
export type PanelKind = 'turn' | 'buy' | 'auction' | 'debt' | 'trade' | 'gameOver'

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
  thinking: PlayerId | null
  panel: PanelKind
  managing: boolean
  buttons: ButtonView[]
  highlights: Highlights
  sheet: { squareId: SquareId; buttons: ButtonView[] } | null
  quarantine: { attempt: number; maxAttempts: number } | null
  buy: { squareId: SquareId; price: number; cash: number } | null
  auction: AuctionView | null
  debt: (DebtSummary & { confirming: boolean }) | null
  trade: TradeComposerView | null
  offer: TradeOffer | null
  original: TradeOffer | null
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

function makeButton(
  id: ButtonId,
  label: string,
  check: ActionCheck = { allowed: true, reason: null },
  amount: number | null = null,
  detail: string | null = null,
): ButtonView {
  return { id, label, enabled: check.allowed, reason: check.reason, amount, detail }
}

function partnersOf(state: GameState, playerId: PlayerId): PlayerId[] {
  return state.players.filter((p) => p.id !== playerId && !p.bankrupt).map((p) => p.id)
}

function tradeButton(state: GameState, actor: PlayerId): ButtonView {
  const left = tradeProposalsLeft(state, actor)
  const check: ActionCheck =
    partnersOf(state, actor).length === 0
      ? { allowed: false, reason: 'Aucun autre joueur avec qui échanger.' }
      : left === 0
        ? { allowed: false, reason: 'Plus de proposition d’échange possible pendant ce tour.' }
        : { allowed: true, reason: null }
  return makeButton('trade', 'Échanger', check, null, `${left} ${left > 1 ? 'restantes' : 'restante'}`)
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
    return [main, manageButton(state, actor), tradeButton(state, actor)]
  }
  const player = state.players.find((p) => p.id === actor)
  if (!player?.quarantine) {
    return [makeButton('rollDice', 'Lancer les dés', check({ type: 'rollDice', playerId: actor })), manageButton(state, actor), tradeButton(state, actor)]
  }
  return [
    makeButton('payFine', `Payer ${formatPwn(QUARANTINE_FINE)}`, check({ type: 'payQuarantineFine', playerId: actor })),
    makeButton('useKey', 'Utiliser une Clé', check({ type: 'useDecryptionKey', playerId: actor })),
    makeButton('rollDice', 'Tenter un double', check({ type: 'rollDice', playerId: actor })),
    manageButton(state, actor),
    tradeButton(state, actor),
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
        tradeButton(state, actor),
      ]
    }
    case 'tradeOffer':
      return [
        makeButton('acceptTrade', 'Accepter', checkAction(state, { type: 'acceptTrade', playerId: actor })),
        ...(phase.original === null ? [makeButton('counterTrade', 'Contre-proposer')] : []),
        makeButton('rejectTrade', 'Refuser'),
      ]
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
  const traded = interaction.trade ?? (phase.kind === 'tradeOffer' ? phase.offer : null)
  for (const id of [...(traded?.give.squares ?? []), ...(traded?.receive.squares ?? [])]) highlights[squareIndex(id)] = 'selected'
  if (interaction.sheet) highlights[squareIndex(interaction.sheet)] = 'selected'
  return highlights
}

function canCompose(state: GameState, draft: TradeDraft, actor: PlayerId | null): actor is PlayerId {
  const phase = state.phase
  if (actor === null) return false
  if (draft.counter) return phase.kind === 'tradeOffer' && phase.original === null && phase.offer.to === actor
  return phase.kind === 'preRoll' || phase.kind === 'postRoll' || phase.kind === 'debt'
}

function squareReason(state: GameState, squareId: SquareId): string | null {
  const square = purchasableById(squareId)
  if (square?.kind !== 'system') return null
  return FAMILY_SQUARES[square.family].some((id) => (state.ownership[id]?.level ?? 0) > 0) ? 'famille construite' : null
}

function columnOf(state: GameState, owner: PlayerId, side: TradeSide): TradeColumn {
  const player = state.players.find((p) => p.id === owner)
  return {
    owner,
    squares: BOARD.filter((square) => ownedSquares(state, owner).includes(square.id)).map((square) => ({
      squareId: square.id,
      selected: side.squares.includes(square.id),
      mortgaged: state.ownership[square.id]?.mortgaged ?? false,
      reason: squareReason(state, square.id),
    })),
    cash: side.cash,
    maxCash: player?.cash ?? 0,
    keys: (player?.keys ?? []).map((cardId) => ({ cardId, selected: side.keys.includes(cardId) })),
  }
}

/** The offer a draft stands for, once a partner is chosen. */
export function offerOf(author: PlayerId, draft: TradeDraft): TradeOffer | null {
  return draft.partner ? { from: author, to: draft.partner, give: draft.give, receive: draft.receive } : null
}

function composerView(state: GameState, interaction: Interaction, actor: PlayerId | null): TradeComposerView | null {
  const draft = interaction.trade
  if (!draft || !canCompose(state, draft, actor)) return null
  const offer = offerOf(actor, draft)
  const problem = offer ? (draft.counter ? counterProblem(state, offer) : validateTrade(state, offer)) : null
  const check: ActionCheck = !offer
    ? { allowed: false, reason: 'Choisissez avec qui échanger.' }
    : { allowed: problem === null, reason: problem?.message ?? null }
  return {
    author: actor,
    draft,
    partners: draft.counter && draft.partner ? [draft.partner] : partnersOf(state, actor),
    give: columnOf(state, actor, draft.give),
    receive: draft.partner ? columnOf(state, draft.partner, draft.receive) : null,
    check,
    empty: [draft.give, draft.receive].every((side) => side.squares.length === 0 && side.cash === 0 && side.keys.length === 0),
    remaining: tradeProposalsLeft(state, actor),
  }
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
    case 'tradeOffer':
      return 'trade'
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

function aiActor(state: GameState, actor: PlayerId | null): PlayerId | null {
  return actor && state.players.find((p) => p.id === actor)?.controller.kind === 'ai' ? actor : null
}

function withoutCommands(view: InteractionView, thinking: PlayerId): InteractionView {
  return {
    ...view,
    thinking,
    managing: false,
    buttons: [],
    highlights: view.offer ? view.highlights : {},
    sheet: view.sheet ? { squareId: view.sheet.squareId, buttons: [] } : null,
    trade: null,
  }
}

/** Everything the HUD and the board need to show for the engine state and the interaction; while an AI must act, no game command is offered and the AI is named. */
export function viewOf(state: GameState, interaction: Interaction): InteractionView {
  const actor = expectedActor(state)
  const view = humanView(state, interaction, actor)
  const thinking = aiActor(state, actor)
  return thinking ? withoutCommands(view, thinking) : view
}

function humanView(state: GameState, interaction: Interaction, actor: PlayerId | null): InteractionView {
  const managing = isManaging(state, interaction)
  const summary = debtSummary(state)
  return {
    actor,
    thinking: null,
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
    trade: composerView(state, interaction, actor),
    offer: state.phase.kind === 'tradeOffer' ? state.phase.offer : null,
    original: state.phase.kind === 'tradeOffer' ? state.phase.original : null,
  }
}

function pressButton(state: GameState, interaction: Interaction, id: ButtonId): InteractionResult {
  const view = viewOf(state, interaction)
  const actor = view.actor
  const pressed = [...view.buttons, ...(view.sheet?.buttons ?? [])].find((b) => b.id === id)
  if (id === 'closeSheet') return { interaction: { ...interaction, sheet: null } }
  if (id === 'closeTrade') return { interaction: { ...interaction, trade: null } }
  if (id === 'proposeTrade') {
    const draft = view.trade?.check.allowed ? view.trade.draft : null
    const offer = draft && actor ? offerOf(actor, draft) : null
    if (!draft || !offer) return { interaction }
    return { interaction: IDLE, action: { type: draft.counter ? 'counterTrade' : 'proposeTrade', playerId: offer.from, offer } }
  }
  if (!pressed?.enabled || !actor) return { interaction }
  const playerId = actor
  switch (id) {
    case 'trade':
      return {
        interaction: {
          ...IDLE,
          trade: { partner: partnersOf(state, actor)[0] ?? null, give: EMPTY_SIDE, receive: EMPTY_SIDE, counter: false },
        },
      }
    case 'counterTrade': {
      const phase = state.phase
      if (phase.kind !== 'tradeOffer') return { interaction }
      return { interaction: { ...IDLE, trade: { partner: phase.offer.from, give: phase.offer.receive, receive: phase.offer.give, counter: true } } }
    }
    case 'acceptTrade':
      return { interaction: IDLE, action: { type: 'acceptTrade', playerId } }
    case 'rejectTrade':
      return { interaction: IDLE, action: { type: 'rejectTrade', playerId } }
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
      if (!actor || aiActor(state, actor) || !bidCheck(state, input.amount).allowed) return { interaction }
      return { interaction, action: { type: 'placeBid', playerId: actor, amount: input.amount } }
    }
    case 'button':
      return pressButton(state, interaction, input.id)
    case 'tradeDraft':
      return interaction.trade ? { interaction: { ...interaction, trade: input.draft } } : { interaction }
  }
}
