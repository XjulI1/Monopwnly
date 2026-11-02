export type PlayerId = string
export type SquareId = string
export type CardId = string
export type DeckKind = 'exploit' | 'patch'

export type FamilyId =
  | 'retro'
  | 'iot'
  | 'office'
  | 'web'
  | 'social'
  | 'finance'
  | 'infrastructure'
  | 'core'

export type CornerKind = 'boot' | 'quarantine' | 'dmz' | 'detected'

type SquareBase = { index: number; id: SquareId; name: string }

export type SystemSquare = SquareBase & {
  kind: 'system'
  family: FamilyId
  price: number
  rents: readonly [number, number, number, number, number, number]
  backdoorCost: number
  mortgageValue: number
}

export type NodeSquare = SquareBase & { kind: 'node'; price: number; mortgageValue: number }
export type ServiceSquare = SquareBase & { kind: 'service'; price: number; mortgageValue: number }

export type PurchasableSquare = SystemSquare | NodeSquare | ServiceSquare

export type Square =
  | (SquareBase & { kind: 'corner'; corner: CornerKind })
  | SystemSquare
  | NodeSquare
  | ServiceSquare
  | (SquareBase & { kind: 'tax'; amount: number })
  | (SquareBase & { kind: 'card'; deck: DeckKind })

export type CardEffect =
  | { kind: 'moveTo'; target: number }
  | { kind: 'moveBack'; steps: number }
  | { kind: 'moveBackTo'; target: number }
  | { kind: 'nextNode' }
  | { kind: 'nextService' }
  | { kind: 'gain'; amount: number }
  | { kind: 'pay'; amount: number }
  | { kind: 'payPerBuilding'; perBackdoor: number; perRootkit: number }
  | { kind: 'payEachPlayer'; amount: number }
  | { kind: 'collectFromEachPlayer'; amount: number }
  | { kind: 'goToQuarantine' }
  | { kind: 'decryptionKey' }

export type Card = {
  id: CardId
  deck: DeckKind
  title: string
  text: string
  effect: CardEffect
}

export type GameSettings = {
  auctions: boolean
}

export type PlayerSetup = { id: PlayerId; name: string; color: string }

export type Player = {
  id: PlayerId
  name: string
  color: string
  cash: number
  position: number
  quarantine: { failedAttempts: number } | null
  keys: CardId[]
  bankrupt: boolean
}

export type BuildingLevel = 0 | 1 | 2 | 3 | 4 | 5

export type Ownership = { owner: PlayerId; mortgaged: boolean; level: BuildingLevel }

export type PaymentReason =
  | 'rent'
  | 'tax'
  | 'card'
  | 'salary'
  | 'purchase'
  | 'auction'
  | 'build'
  | 'sellBuilding'
  | 'mortgage'
  | 'unmortgage'
  | 'quarantineFine'
  | 'bankruptcy'

export type Payment = { to: PlayerId | 'bank'; amount: number; reason: PaymentReason }

export type ResumePoint =
  | { kind: 'postRoll' }
  | { kind: 'moveAfterFine'; steps: number }
  | { kind: 'collectFrom'; creditor: PlayerId; payers: PlayerId[]; amount: number }

export type Phase =
  | { kind: 'preRoll' }
  | { kind: 'buyDecision'; squareId: SquareId }
  | {
      kind: 'auction'
      squareId: SquareId
      highBid: number
      highBidder: PlayerId | null
      bidders: PlayerId[]
      nextBidder: PlayerId
    }
  | { kind: 'debt'; debtor: PlayerId; payments: Payment[]; resume: ResumePoint }
  | { kind: 'postRoll'; mayRollAgain: boolean }
  | { kind: 'gameOver' }

export type PhaseKind = Phase['kind']

export type GameState = {
  settings: GameSettings
  boardId: 'monopwnly'
  players: Player[]
  ownership: Record<SquareId, Ownership>
  bankStock: { backdoors: number; rootkits: number }
  decks: Record<DeckKind, CardId[]>
  currentPlayerIndex: number
  doublesInARow: number
  turnNumber: number
  lastRoll: [number, number] | null
  phase: Phase
  rngState: number
  winner: PlayerId | null
}

export type Action =
  | { type: 'rollDice'; playerId: PlayerId }
  | { type: 'payQuarantineFine'; playerId: PlayerId }
  | { type: 'useDecryptionKey'; playerId: PlayerId }
  | { type: 'buyProperty'; playerId: PlayerId }
  | { type: 'declineProperty'; playerId: PlayerId }
  | { type: 'placeBid'; playerId: PlayerId; amount: number }
  | { type: 'passBid'; playerId: PlayerId }
  | { type: 'buildBackdoor'; playerId: PlayerId; squareId: SquareId }
  | { type: 'sellBackdoor'; playerId: PlayerId; squareId: SquareId }
  | { type: 'mortgage'; playerId: PlayerId; squareId: SquareId }
  | { type: 'unmortgage'; playerId: PlayerId; squareId: SquareId }
  | { type: 'payDebt'; playerId: PlayerId }
  | { type: 'declareBankruptcy'; playerId: PlayerId }
  | { type: 'endTurn'; playerId: PlayerId }

export type ActionType = Action['type']

export type QuarantineReason = 'detected' | 'card' | 'tripleDouble'
export type QuarantineExit = 'fine' | 'key' | 'double' | 'forcedFine'

export type GameEvent =
  | { type: 'turnStarted'; playerId: PlayerId; turnNumber: number }
  | { type: 'diceRolled'; playerId: PlayerId; dice: [number, number]; purpose: 'move' | 'quarantine' | 'serviceRent' }
  | { type: 'moved'; playerId: PlayerId; path: number[]; backward: boolean }
  | { type: 'passedBoot'; playerId: PlayerId }
  | { type: 'sentToQuarantine'; playerId: PlayerId; reason: QuarantineReason }
  | { type: 'quarantineAttemptFailed'; playerId: PlayerId; failedAttempts: number }
  | { type: 'leftQuarantine'; playerId: PlayerId; method: QuarantineExit }
  | { type: 'cardDrawn'; playerId: PlayerId; deck: DeckKind; cardId: CardId }
  | { type: 'keyUsed'; playerId: PlayerId; cardId: CardId }
  | { type: 'paid'; from: PlayerId | 'bank'; to: PlayerId | 'bank'; amount: number; reason: PaymentReason }
  | { type: 'propertyBought'; playerId: PlayerId; squareId: SquareId; price: number }
  | { type: 'propertyDeclined'; playerId: PlayerId; squareId: SquareId }
  | { type: 'auctionStarted'; squareId: SquareId; bidders: PlayerId[] }
  | { type: 'bidPlaced'; playerId: PlayerId; amount: number }
  | { type: 'bidPassed'; playerId: PlayerId }
  | { type: 'auctionWon'; playerId: PlayerId; squareId: SquareId; amount: number }
  | { type: 'auctionUnsold'; squareId: SquareId }
  | { type: 'backdoorBuilt'; playerId: PlayerId; squareId: SquareId; level: BuildingLevel }
  | { type: 'backdoorSold'; playerId: PlayerId; squareId: SquareId; level: BuildingLevel }
  | { type: 'mortgaged'; playerId: PlayerId; squareId: SquareId }
  | { type: 'unmortgaged'; playerId: PlayerId; squareId: SquareId }
  | { type: 'debtStarted'; debtor: PlayerId; payments: Payment[] }
  | { type: 'bankrupt'; playerId: PlayerId; creditor: PlayerId | 'bank' }
  | { type: 'assetsTransferred'; from: PlayerId; to: PlayerId | 'bank'; squareIds: SquareId[]; keys: CardId[] }
  | { type: 'gameWon'; playerId: PlayerId }

export type RuleErrorCode =
  | 'INVALID_PLAYER_COUNT'
  | 'DUPLICATE_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'WRONG_PHASE'
  | 'GAME_OVER'
  | 'MUST_ROLL_AGAIN'
  | 'NOT_OWNER'
  | 'UNKNOWN_SQUARE'
  | 'INSUFFICIENT_FUNDS'
  | 'GROUP_INCOMPLETE'
  | 'UNEVEN_BUILDING'
  | 'NO_STOCK'
  | 'MORTGAGED'
  | 'NOT_MORTGAGED'
  | 'HAS_BUILDINGS'
  | 'NOT_BUILDABLE'
  | 'MAX_LEVEL'
  | 'NO_BUILDING'
  | 'INVALID_BID'
  | 'NOT_IN_QUARANTINE'
  | 'NO_KEY'
  | 'DEBT_NOT_COVERED'

export type RuleError = { code: RuleErrorCode; message: string }

export type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: RuleError }

export type CreateGameResult = { ok: true; state: GameState } | { ok: false; error: RuleError }
