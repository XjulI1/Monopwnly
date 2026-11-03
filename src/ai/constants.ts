import type { AiLevel } from '../engine'

/** Reserve kept by an easy AI whatever the board. */
export const EASY_RESERVE = 100

/** Smallest reserve kept by a normal or hard AI. */
export const MIN_RESERVE = 50

/** Weight of the rent risk in the reserve of each level. */
export const PRUDENCE: Record<AiLevel, number> = { easy: 0, normal: 1, hard: 0.8 }

/** Share of the worst rent within reach of the dice added to the expected rent in the reserve. */
export const WORST_RENT_WEIGHT = 0.5

/** Discount on the price applied by an easy AI to value a square in an auction. */
export const EASY_AUCTION_DISCOUNT = 0.2

/** Premium, as a share of the price, of a square that completes one of the AI's families. */
export const FAMILY_COMPLETION_BONUS = 0.75

/** Premium, as a share of the price, of a square of a family the AI has started and no opponent holds. */
export const FAMILY_PROGRESS_BONUS = 0.25

/** Discount, as a share of the price, on a system of a family an opponent has started: it cannot be completed without trading. */
export const STARTED_BY_OPPONENT_DISCOUNT = 0.15

/** Premium, as a share of the price, of a square that keeps an opponent from completing a family (hard level). */
export const FAMILY_BLOCK_BONUS = 0.5

/** Weight of the expected yield over the remaining game in the value of a square (hard level). */
export const YIELD_WEIGHT = 0.5

/** Bounds of the yield adjustment, as shares of the price (hard level). */
export const YIELD_ADJUSTMENT = { floor: -0.1, ceiling: 0.5 } as const

/** Building level assumed reachable on a family the AI owns or can complete (hard level). */
export const REACHABLE_LEVEL = 3

/** Bounds and scale of the estimated number of rounds left, derived from the cash in play. */
export const HORIZON = { min: 10, max: 40, cashPerPlayerRound: 60 } as const

/** Step between two successive bids of an AI. */
export const BID_STEP = 10

/** Free purchasable squares from which normal and hard AIs leave the quarantine at once. */
export const EARLY_GAME_FREE_SQUARES = 8

/** A hard AI stays in quarantine when the expected rent ahead exceeds this many fines. */
export const QUARANTINE_DANGER_FACTOR = 3

/** Backdoors a hard AI puts on every system of a family before starting another one. */
export const HARD_TARGET_BACKDOORS = 3

/** Bank stock of backdoors under which a hard AI builds more eagerly. */
export const LOW_BANK_STOCK = 8

/** Share of the reserve a hard AI keeps when building while the bank stock is low. */
export const LOW_STOCK_RESERVE_FACTOR = 0.6

/** Cash a normal or hard AI keeps above its reserve before reactivating a square outside a complete family. */
export const REACTIVATION_MARGIN = 300

/** Ratio of expected yield to price under which a hard AI deems a square weak. */
export const LOW_YIELD_RATIO = 0.5

/** Share of the value exchanged that an offer must bring to the AI for it to accept, by level. */
export const TRADE_ACCEPT_THRESHOLD: Record<AiLevel, number> = { easy: 0, normal: 0.1, hard: 0.2 }

/** Value of a decryption key in a trade: the quarantine fine it saves. */
export const DECRYPTION_KEY_VALUE = 50

/** Rounds of expected rent counted as the danger of completing a family of the other side of a trade. */
export const TRADE_DANGER_ROUNDS = 3

/** Building level at which a normal AI weighs a family a trade would complete for the other side. */
export const TRADE_DANGER_LEVEL = 3

/** Price offered by a normal or hard AI for the square that completes its family, as multiples of its price, after 0, 1 and 2 refusals. */
export const PURCHASE_PRICE_STEPS: readonly number[] = [1, 1.5, 2]

/** Price asked by an AI in debt for an isolated square, as a multiple of its mortgage value. */
export const DEBT_SALE_FACTOR = 1.5

/** Step of the PwnCoins an AI offers in a trade. */
export const TRADE_CASH_STEP = 10

/** Most management actions (build, sell, mortgage, reactivate) an AI takes in a single phase. */
export const MANAGEMENT_LIMIT = 40
