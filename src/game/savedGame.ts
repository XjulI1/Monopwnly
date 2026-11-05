import {
  AI_LEVELS,
  BOARD_SIZE,
  CARDS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  NET_WORTH_TARGETS,
  purchasableById,
  TURN_LIMITS,
  type GameSettings,
  type GameState,
  type PaymentReason,
  type PhaseKind,
  type WinReason,
} from '../engine'
import type { JournalEntry, JournalEntryKind } from './history/journal'
import type { GameStatistics, PlayerStatistics } from './history/statistics'
import type { GameConfig } from './setupForm'

/** Version of the format of the saved game understood by this application. */
export const SAVE_FORMAT_VERSION = 4

const FORMAT_BEFORE_TRADES = 1
const FORMAT_BEFORE_OPTIONS = 2
const FORMAT_BEFORE_COUNTERS = 3

const OPTIONS_OFF: Omit<GameSettings, 'auctions'> = {
  dmzJackpot: false,
  doubleBootBonus: false,
  freeBuilding: false,
  noRentInQuarantine: false,
  turnLimit: null,
  netWorthTarget: null,
}

/** Whether the saved game is still being played or is showing its end screen. */
export type SavedGameStatus = 'inProgress' | 'finished'

/** What a game session needs to be saved: the engine truth, the journal and the statistics. */
export type GameRecord = { engineState: GameState; journal: JournalEntry[]; statistics: GameStatistics }

/** The single game kept in the browser. */
export type SavedGame = GameRecord & {
  formatVersion: typeof SAVE_FORMAT_VERSION
  savedAt: string
  status: SavedGameStatus
  creation: GameConfig
}

type Fields = Record<string, unknown>

const PHASE_KINDS: readonly PhaseKind[] = ['preRoll', 'buyDecision', 'auction', 'debt', 'postRoll', 'tradeOffer', 'gameOver']
const TRADE_RESUME_KINDS: readonly PhaseKind[] = ['preRoll', 'postRoll', 'debt']
const PAYMENT_REASONS: readonly PaymentReason[] = [
  'rent',
  'tax',
  'card',
  'salary',
  'purchase',
  'auction',
  'build',
  'sellBuilding',
  'mortgage',
  'unmortgage',
  'quarantineFine',
  'bankruptcy',
]
const ENTRY_KINDS: readonly JournalEntryKind[] = ['turn', 'action', 'auction']
const WIN_REASONS: readonly WinReason[] = ['lastStanding', 'turnLimit', 'netWorthTarget']
const STATUSES: readonly SavedGameStatus[] = ['inProgress', 'finished']
const CARD_IDS = new Set(CARDS.map((card) => card.id))
const COUNTERS: readonly Exclude<keyof PlayerStatistics, 'bankruptcy'>[] = [
  'rentCollected',
  'rentPaid',
  'taxesPaid',
  'salaries',
  'cardsDrawn',
  'purchases',
  'purchaseSpending',
  'auctionsWon',
  'backdoorsBuilt',
  'rootkitsBuilt',
  'quarantines',
  'doubles',
]

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInt(value: unknown, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= max
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isListOf(value: unknown, check: (item: unknown) => boolean): value is unknown[] {
  return Array.isArray(value) && value.every(check)
}

function isOneOf<T>(value: unknown, options: readonly T[]): value is T {
  return options.includes(value as T)
}

function isPurchasable(value: unknown): boolean {
  return isString(value) && purchasableById(value) !== null
}

function isController(value: unknown): boolean {
  if (!isFields(value)) return false
  return value.kind === 'human' || (value.kind === 'ai' && isOneOf(value.level, AI_LEVELS))
}

function isPlayer(value: unknown): boolean {
  if (!isFields(value)) return false
  const quarantine = value.quarantine
  return (
    isString(value.id) &&
    isString(value.name) &&
    isString(value.color) &&
    isController(value.controller) &&
    isInt(value.cash, 0) &&
    isInt(value.position, 0, BOARD_SIZE - 1) &&
    (quarantine === null || (isFields(quarantine) && isInt(quarantine.failedAttempts, 0))) &&
    isListOf(value.keys, (key) => CARD_IDS.has(key as string)) &&
    typeof value.bankrupt === 'boolean'
  )
}

function isSettings(value: unknown): value is GameSettings {
  if (!isFields(value)) return false
  const flags = [value.auctions, value.dmzJackpot, value.doubleBootBonus, value.freeBuilding, value.noRentInQuarantine]
  return (
    flags.every((flag) => typeof flag === 'boolean') &&
    (value.turnLimit === null || isOneOf(value.turnLimit, TURN_LIMITS)) &&
    (value.netWorthTarget === null || isOneOf(value.netWorthTarget, NET_WORTH_TARGETS))
  )
}

function isOwnership(value: unknown, isPlayerId: (id: unknown) => boolean): boolean {
  if (!isFields(value)) return false
  return Object.entries(value).every(
    ([squareId, own]) =>
      isPurchasable(squareId) && isFields(own) && isPlayerId(own.owner) && typeof own.mortgaged === 'boolean' && isInt(own.level, 0, 5),
  )
}

function isPayment(value: unknown, isPlayerId: (id: unknown) => boolean): boolean {
  if (!isFields(value)) return false
  return (value.to === 'bank' || isPlayerId(value.to)) && isInt(value.amount, 0) && isOneOf(value.reason, PAYMENT_REASONS)
}

function isResume(value: unknown, isPlayerId: (id: unknown) => boolean): boolean {
  if (!isFields(value)) return false
  switch (value.kind) {
    case 'postRoll':
      return true
    case 'moveAfterFine':
      return isInt(value.steps, 0)
    case 'collectFrom':
      return isPlayerId(value.creditor) && isListOf(value.payers, isPlayerId) && isInt(value.amount, 0)
    default:
      return false
  }
}

function isTradeSide(value: unknown): boolean {
  return (
    isFields(value) &&
    isListOf(value.squares, isPurchasable) &&
    isInt(value.cash, 0) &&
    isListOf(value.keys, (key) => CARD_IDS.has(key as string))
  )
}

function isTradeOffer(value: unknown, isPlayerId: (id: unknown) => boolean): boolean {
  return isFields(value) && isPlayerId(value.from) && isPlayerId(value.to) && isTradeSide(value.give) && isTradeSide(value.receive)
}

function isTradeLimits(value: unknown, isPlayerId: (id: unknown) => boolean): boolean {
  if (!isFields(value) || !isFields(value.thisTurn) || !isFields(value.refusedAsks)) return false
  const proposals = Object.entries(value.thisTurn).every(
    ([author, turn]) =>
      isPlayerId(author) &&
      isFields(turn) &&
      isInt(turn.count, 0) &&
      isListOf(turn.partners, isPlayerId) &&
      isListOf(turn.rejected, isString),
  )
  const asks = Object.entries(value.refusedAsks).every(
    ([author, squares]) =>
      isPlayerId(author) &&
      isFields(squares) &&
      Object.entries(squares).every(([squareId, ask]) => isPurchasable(squareId) && isFields(ask) && isPlayerId(ask.holder) && isInt(ask.count, 1)),
  )
  return proposals && asks
}

function isPhase(value: unknown, isPlayerId: (id: unknown) => boolean): boolean {
  if (!isFields(value) || !isOneOf(value.kind, PHASE_KINDS)) return false
  switch (value.kind) {
    case 'buyDecision':
      return isPurchasable(value.squareId)
    case 'auction':
      return (
        isPurchasable(value.squareId) &&
        isInt(value.highBid, 0) &&
        (value.highBidder === null || isPlayerId(value.highBidder)) &&
        isListOf(value.bidders, isPlayerId) &&
        isPlayerId(value.nextBidder)
      )
    case 'debt':
      return (
        isPlayerId(value.debtor) &&
        isListOf(value.payments, (payment) => isPayment(payment, isPlayerId)) &&
        isResume(value.resume, isPlayerId)
      )
    case 'postRoll':
      return typeof value.mayRollAgain === 'boolean'
    case 'tradeOffer':
      return (
        isTradeOffer(value.offer, isPlayerId) &&
        (value.original === null || isTradeOffer(value.original, isPlayerId)) &&
        isFields(value.resume) &&
        isOneOf(value.resume.kind, TRADE_RESUME_KINDS) &&
        isPhase(value.resume, isPlayerId)
      )
    default:
      return true
  }
}

function isDie(value: unknown): boolean {
  return isInt(value, 1, 6)
}

function isEngineState(value: unknown): value is GameState {
  if (!isFields(value) || value.boardId !== 'monopwnly') return false
  const players = value.players
  if (!isListOf(players, isPlayer) || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return false
  const ids = new Set(players.map((player) => (player as Fields).id))
  if (ids.size !== players.length) return false
  const isPlayerId = (id: unknown) => ids.has(id)
  const { settings, bankStock, decks, lastRoll } = value
  return (
    isSettings(settings) &&
    isOwnership(value.ownership, isPlayerId) &&
    isFields(bankStock) &&
    isInt(bankStock.backdoors, 0) &&
    isInt(bankStock.rootkits, 0) &&
    isFields(decks) &&
    isListOf(decks.exploit, (id) => CARD_IDS.has(id as string)) &&
    isListOf(decks.patch, (id) => CARD_IDS.has(id as string)) &&
    isInt(value.currentPlayerIndex, 0, players.length - 1) &&
    isInt(value.firstPlayerIndex, 0, players.length - 1) &&
    isInt(value.doublesInARow, 0) &&
    isInt(value.turnNumber, 1) &&
    (lastRoll === null || (isListOf(lastRoll, isDie) && lastRoll.length === 2)) &&
    isPhase(value.phase, isPlayerId) &&
    isInt(value.rngState) &&
    (value.winner === null ? value.winReason === null : isPlayerId(value.winner) && isOneOf(value.winReason, WIN_REASONS)) &&
    isTradeLimits(value.tradeLimits, isPlayerId) &&
    isInt(value.dmzPot, 0)
  )
}

function isDetail(value: unknown): boolean {
  return isFields(value) && (value.actor === null || isString(value.actor)) && isString(value.text)
}

function isJournalEntry(value: unknown): boolean {
  return (
    isFields(value) &&
    isInt(value.id) &&
    isOneOf(value.kind, ENTRY_KINDS) &&
    isInt(value.turn, 1) &&
    (value.actor === null || isString(value.actor)) &&
    isString(value.text) &&
    isListOf(value.details, isDetail)
  )
}

function isReading(value: unknown): boolean {
  return (
    isFields(value) &&
    isInt(value.turn, 1) &&
    isListOf(value.players, (p) => isFields(p) && isString(p.playerId) && isInt(p.cash) && isInt(p.netWorth))
  )
}

function isCounters(value: unknown): boolean {
  if (!isFields(value) || !COUNTERS.every((counter) => isInt(value[counter], 0))) return false
  const bankruptcy = value.bankruptcy
  return (
    bankruptcy === null ||
    (isFields(bankruptcy) && isInt(bankruptcy.turn, 1) && isString(bankruptcy.creditor) && isInt(bankruptcy.rank, 1))
  )
}

function isStatistics(value: unknown): value is GameStatistics {
  return (
    isFields(value) &&
    isListOf(value.rounds, isReading) &&
    isFields(value.players) &&
    Object.values(value.players).every(isCounters) &&
    isFields(value.squareRents) &&
    Object.entries(value.squareRents).every(([squareId, total]) => isPurchasable(squareId) && isInt(total, 0))
  )
}

function isCreation(value: unknown): value is GameConfig {
  if (!isFields(value) || !isSettings(value.settings)) return false
  return isListOf(
    value.players,
    (p) => isFields(p) && isString(p.id) && isString(p.name) && isString(p.color) && (p.controller === undefined || isController(p.controller)),
  )
}

function addTradeLimits(save: Fields, engineState: Fields): Fields {
  return { ...save, formatVersion: FORMAT_BEFORE_OPTIONS, engineState: { ...engineState, tradeLimits: { thisTurn: {}, refusedAsks: {} } } }
}

function addGameOptions(save: Fields, engineState: Fields): Fields {
  const creation = isFields(save.creation) ? { ...save.creation, settings: { ...OPTIONS_OFF, ...(isFields(save.creation.settings) ? save.creation.settings : {}) } } : save.creation
  return {
    ...save,
    formatVersion: FORMAT_BEFORE_COUNTERS,
    creation,
    engineState: {
      ...engineState,
      settings: { ...OPTIONS_OFF, ...(isFields(engineState.settings) ? engineState.settings : {}) },
      firstPlayerIndex: 0,
      winReason: engineState.winner === null || engineState.winner === undefined ? null : 'lastStanding',
      dmzPot: 0,
    },
  }
}

function addCounterOffers(save: Fields, engineState: Fields): Fields {
  const phase = isFields(engineState.phase) && engineState.phase.kind === 'tradeOffer' ? { ...engineState.phase, original: null } : engineState.phase
  return { ...save, formatVersion: SAVE_FORMAT_VERSION, engineState: { ...engineState, phase } }
}

const MIGRATIONS: Record<number, (save: Fields, engineState: Fields) => Fields> = {
  [FORMAT_BEFORE_TRADES]: addTradeLimits,
  [FORMAT_BEFORE_OPTIONS]: addGameOptions,
  [FORMAT_BEFORE_COUNTERS]: addCounterOffers,
}

/** Brings a saved game of an older format to the current one, one format after the other: a save from before the trades gets empty trade limits, a save from before the game options gets them all off, an empty pot, its rounds counted as before and the last solvent player as reason of a victory, and an offer saved before the counter-offers becomes an offer that can be countered. */
export function migrateSavedGame(value: unknown): unknown {
  let save = value
  for (;;) {
    if (!isFields(save) || !isFields(save.engineState) || typeof save.formatVersion !== 'number') return save
    const migrate = MIGRATIONS[save.formatVersion]
    if (!migrate) return save
    save = migrate(save, save.engineState)
  }
}

/** Checks that an unknown value is a complete and coherent saved game of the current format. */
export function isSavedGame(value: unknown): value is SavedGame {
  return (
    isFields(value) &&
    value.formatVersion === SAVE_FORMAT_VERSION &&
    isString(value.savedAt) &&
    !Number.isNaN(Date.parse(value.savedAt)) &&
    isOneOf(value.status, STATUSES) &&
    isCreation(value.creation) &&
    isEngineState(value.engineState) &&
    isListOf(value.journal, isJournalEntry) &&
    isStatistics(value.statistics)
  )
}
