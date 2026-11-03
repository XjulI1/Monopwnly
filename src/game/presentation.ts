import {
  cardById,
  QUARANTINE_INDEX,
  type CardId,
  type GameEvent,
  type GameState,
  type PaymentReason,
  type PlayerId,
  type QuarantineReason,
  type TradeOffer,
} from '../engine'

type StepContent =
  | { kind: 'dice'; playerId: PlayerId; dice: [number, number]; purpose: 'move' | 'quarantine' | 'serviceRent' }
  | { kind: 'move'; playerId: PlayerId; squares: number[]; backward: boolean }
  | { kind: 'salary'; playerId: PlayerId; amount: number }
  | { kind: 'card'; playerId: PlayerId; cardId: CardId }
  | { kind: 'payment'; from: PlayerId | 'bank'; to: PlayerId | 'bank'; amount: number; reason: PaymentReason }
  | { kind: 'quarantine'; playerId: PlayerId; from: number; reason: QuarantineReason }
  | { kind: 'update' }
  | { kind: 'bankrupt'; playerId: PlayerId; creditor: PlayerId | 'bank' }
  | { kind: 'victory'; playerId: PlayerId }
  | { kind: 'trade'; offer: TradeOffer }
  | { kind: 'silent' }

/** One thing shown to the players, with the engine events it applies to the displayed state and the number of events of the action fully presented once it is played. */
export type PresentationStep = StepContent & { events: GameEvent[]; presented: number }

/** Kind of a presentation step. */
export type StepKind = PresentationStep['kind']

const UPDATE_EVENTS: ReadonlySet<GameEvent['type']> = new Set([
  'propertyBought',
  'auctionWon',
  'auctionUnsold',
  'backdoorBuilt',
  'backdoorSold',
  'mortgaged',
  'unmortgaged',
  'assetsTransferred',
])

function findPlayer(state: GameState, id: PlayerId) {
  return state.players.find((p) => p.id === id)
}

function applyEvent(state: GameState, event: GameEvent): void {
  switch (event.type) {
    case 'turnStarted': {
      const index = state.players.findIndex((p) => p.id === event.playerId)
      if (index >= 0) state.currentPlayerIndex = index
      state.turnNumber = event.turnNumber
      state.doublesInARow = 0
      state.phase = { kind: 'preRoll' }
      return
    }
    case 'diceRolled':
      if (event.purpose !== 'serviceRent') state.lastRoll = event.dice
      return
    case 'moved': {
      const player = findPlayer(state, event.playerId)
      const last = event.path.at(-1)
      if (player && last !== undefined) player.position = last
      return
    }
    case 'sentToQuarantine': {
      const player = findPlayer(state, event.playerId)
      if (!player) return
      player.position = QUARANTINE_INDEX
      player.quarantine = { failedAttempts: 0 }
      return
    }
    case 'quarantineAttemptFailed': {
      const player = findPlayer(state, event.playerId)
      if (player?.quarantine) player.quarantine = { failedAttempts: event.failedAttempts }
      return
    }
    case 'leftQuarantine': {
      const player = findPlayer(state, event.playerId)
      if (player) player.quarantine = null
      return
    }
    case 'cardDrawn': {
      const player = findPlayer(state, event.playerId)
      if (player && cardById(event.cardId).effect.kind === 'decryptionKey') player.keys.push(event.cardId)
      return
    }
    case 'keyUsed': {
      const player = findPlayer(state, event.playerId)
      if (player) player.keys = player.keys.filter((key) => key !== event.cardId)
      return
    }
    case 'paid': {
      const from = event.from === 'bank' ? null : findPlayer(state, event.from)
      const to = event.to === 'bank' ? null : findPlayer(state, event.to)
      if (from) from.cash -= event.amount
      if (to) to.cash += event.amount
      return
    }
    case 'propertyBought':
    case 'auctionWon':
      state.ownership[event.squareId] = { owner: event.playerId, mortgaged: false, level: 0 }
      return
    case 'backdoorBuilt':
    case 'backdoorSold': {
      const own = state.ownership[event.squareId]
      if (own) own.level = event.level
      return
    }
    case 'mortgaged':
    case 'unmortgaged': {
      const own = state.ownership[event.squareId]
      if (own) own.mortgaged = event.type === 'mortgaged'
      return
    }
    case 'assetsTransferred':
      transferAssets(state, event)
      return
    case 'tradeAccepted':
      acceptTrade(state, event.offer)
      return
    case 'bankrupt': {
      const player = findPlayer(state, event.playerId)
      if (!player) return
      player.bankrupt = true
      player.quarantine = null
      return
    }
    case 'gameWon':
      state.winner = event.playerId
      state.phase = { kind: 'gameOver' }
      return
    default:
      return
  }
}

function transferAssets(state: GameState, event: Extract<GameEvent, { type: 'assetsTransferred' }>): void {
  for (const id of event.squareIds) {
    const own = state.ownership[id]
    if (!own) continue
    if (event.to === 'bank') delete state.ownership[id]
    else state.ownership[id] = { ...own, owner: event.to, level: 0 }
  }
  const from = findPlayer(state, event.from)
  if (from) from.keys = from.keys.filter((key) => !event.keys.includes(key))
  const to = event.to === 'bank' ? null : findPlayer(state, event.to)
  if (to) to.keys.push(...event.keys)
}

function acceptTrade(state: GameState, offer: TradeOffer): void {
  const author = findPlayer(state, offer.from)
  const recipient = findPlayer(state, offer.to)
  if (!author || !recipient) return
  for (const [side, giver, receiver] of [
    [offer.give, author, recipient],
    [offer.receive, recipient, author],
  ] as const) {
    for (const id of side.squares) {
      const own = state.ownership[id]
      if (own) own.owner = receiver.id
    }
    giver.cash -= side.cash
    receiver.cash += side.cash
    giver.keys = giver.keys.filter((key) => !side.keys.includes(key))
    receiver.keys.push(...side.keys)
  }
}

/** Applies the events of one step to a copy of the displayed state. */
export function applyStep(state: GameState, step: PresentationStep): GameState {
  const next = structuredClone(state)
  for (const event of step.events) applyEvent(next, event)
  return next
}

/** Applies the events of several steps to a copy of the displayed state. */
export function applySteps(state: GameState, steps: readonly PresentationStep[]): GameState {
  const next = structuredClone(state)
  for (const step of steps) for (const event of step.events) applyEvent(next, event)
  return next
}

function contentOf(event: GameEvent, positions: Map<PlayerId, number>): StepContent | null {
  switch (event.type) {
    case 'diceRolled':
      return { kind: 'dice', playerId: event.playerId, dice: event.dice, purpose: event.purpose }
    case 'cardDrawn':
      return { kind: 'card', playerId: event.playerId, cardId: event.cardId }
    case 'sentToQuarantine':
      return { kind: 'quarantine', playerId: event.playerId, from: positions.get(event.playerId) ?? 0, reason: event.reason }
    case 'paid':
      return event.reason === 'salary' && event.to !== 'bank'
        ? { kind: 'salary', playerId: event.to, amount: event.amount }
        : { kind: 'payment', from: event.from, to: event.to, amount: event.amount, reason: event.reason }
    case 'bankrupt':
      return { kind: 'bankrupt', playerId: event.playerId, creditor: event.creditor }
    case 'gameWon':
      return { kind: 'victory', playerId: event.playerId }
    case 'tradeAccepted':
      return { kind: 'trade', offer: event.offer }
    default:
      return UPDATE_EVENTS.has(event.type) ? { kind: 'update' } : null
  }
}

/** Turns the events of one engine action into the ordered steps shown to the players. */
export function presentationSteps(before: GameState, events: readonly GameEvent[]): PresentationStep[] {
  const positions = new Map(before.players.map((p) => [p.id, p.position]))
  const steps: PresentationStep[] = []

  const pushMove = (event: Extract<GameEvent, { type: 'moved' }>, path: number[], presented: number) => {
    const from = positions.get(event.playerId) ?? 0
    const moved: GameEvent = { ...event, path }
    steps.push({ kind: 'move', playerId: event.playerId, squares: [from, ...path], backward: event.backward, events: [moved], presented })
    const last = path.at(-1)
    if (last !== undefined) positions.set(event.playerId, last)
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i] as GameEvent
    if (event.type === 'moved') {
      const bootAt = event.backward ? -1 : event.path.indexOf(0)
      const passed = events[i + 1]
      const salary = events[i + 2]
      if (bootAt < 0 || passed?.type !== 'passedBoot' || salary?.type !== 'paid' || salary.reason !== 'salary') {
        pushMove(event, event.path, i + 1)
        continue
      }
      const rest = event.path.slice(bootAt + 1)
      const afterSalary = i + 3
      pushMove(event, event.path.slice(0, bootAt + 1), rest.length === 0 ? i + 1 : i)
      steps.push({
        kind: 'salary',
        playerId: event.playerId,
        amount: salary.amount,
        events: [passed, salary],
        presented: rest.length === 0 ? afterSalary : i,
      })
      if (rest.length > 0) pushMove(event, rest, afterSalary)
      i += 2
      continue
    }
    const content = contentOf(event, positions)
    if (event.type === 'sentToQuarantine') positions.set(event.playerId, QUARANTINE_INDEX)
    const previous = steps.at(-1)
    if (content) steps.push({ ...content, events: [event], presented: i + 1 })
    else if (previous) {
      previous.events.push(event)
      previous.presented = i + 1
    } else steps.push({ kind: 'silent', events: [event], presented: i + 1 })
  }
  return steps
}
