import {
  cardById,
  MAX_QUARANTINE_ATTEMPTS,
  QUARANTINE_INDEX,
  squareAt,
  squareById,
  type CardId,
  type GameEvent,
  type GameState,
  type PaymentReason,
  type PlayerId,
  type QuarantineReason,
  type SquareId,
} from '../engine'
import { formatPwn } from './format'

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
  | { kind: 'silent' }

/** One thing shown to the players, with the engine events it applies to the displayed state and its description. */
export type PresentationStep = StepContent & { events: GameEvent[]; lines: string[] }

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

type Names = { player: (id: PlayerId | 'bank') => string; square: (id: SquareId) => string }

function namesOf(state: GameState): Names {
  return {
    player: (id) => (id === 'bank' ? 'la banque' : (findPlayer(state, id)?.name ?? id)),
    square: (id) => squareById(id).name,
  }
}

function paymentLine(names: Names, event: Extract<GameEvent, { type: 'paid' }>): string | null {
  const amount = formatPwn(event.amount)
  const from = names.player(event.from)
  const to = names.player(event.to)
  switch (event.reason) {
    case 'rent':
      return `${from} paie ${amount} de loyer à ${to}`
    case 'tax':
      return `${from} paie ${amount} de taxe`
    case 'card':
      if (event.from === 'bank') return `${to} reçoit ${amount}`
      if (event.to === 'bank') return `${from} paie ${amount}`
      return `${from} verse ${amount} à ${to}`
    case 'salary':
      return `${to} passe par Boot : +${amount}`
    case 'bankruptcy':
      return `${from} cède ${amount} à ${to}`
    default:
      return null
  }
}

const QUARANTINE_EXITS = {
  fine: 'paie l’amende et sort de quarantaine',
  key: 'utilise une Clé de déchiffrement et sort de quarantaine',
  double: 'fait un double et sort de quarantaine',
  forcedFine: 'paie l’amende après trois échecs et sort de quarantaine',
} as const

function eventLine(state: GameState, names: Names, event: GameEvent): string | null {
  switch (event.type) {
    case 'turnStarted':
      return `Au tour de ${names.player(event.playerId)}`
    case 'diceRolled': {
      const [a, b] = event.dice
      const who = names.player(event.playerId)
      if (event.purpose === 'quarantine') return `${who} tente un double : ${a} + ${b}`
      if (event.purpose === 'serviceRent') return `${who} lance ${a} + ${b} pour le loyer du service`
      return `${who} lance ${a} + ${b} = ${a + b}${a === b ? ' — Double !' : ''}`
    }
    case 'moved': {
      const last = event.path.at(-1)
      if (last === undefined) return null
      const verb = event.backward ? 'recule' : 'avance'
      return `${names.player(event.playerId)} ${verb} jusqu’à ${squareAt(last).name}`
    }
    case 'sentToQuarantine': {
      const who = names.player(event.playerId)
      if (event.reason === 'tripleDouble') return `Trois doubles d’affilée : ${who} part en quarantaine`
      if (event.reason === 'detected') return `${who} est détecté et part en quarantaine`
      return `${who} part en quarantaine`
    }
    case 'quarantineAttemptFailed':
      return `Pas de double : tentative ${event.failedAttempts} sur ${MAX_QUARANTINE_ATTEMPTS} échouée`
    case 'leftQuarantine':
      return `${names.player(event.playerId)} ${QUARANTINE_EXITS[event.method]}`
    case 'cardDrawn': {
      const card = cardById(event.cardId)
      const deck = card.deck === 'exploit' ? 'Exploit' : 'Patch'
      return `${names.player(event.playerId)} pioche la carte ${deck} «\u00A0${card.title}\u00A0» : ${card.text}`
    }
    case 'paid':
      return paymentLine(names, event)
    case 'propertyBought':
      return `${names.player(event.playerId)} achète ${names.square(event.squareId)} pour ${formatPwn(event.price)}`
    case 'propertyDeclined':
      return state.settings.auctions
        ? `${names.player(event.playerId)} met ${names.square(event.squareId)} aux enchères`
        : `${names.player(event.playerId)} n’achète pas ${names.square(event.squareId)}`
    case 'bidPlaced':
      return `${names.player(event.playerId)} mise ${formatPwn(event.amount)}`
    case 'bidPassed':
      return `${names.player(event.playerId)} passe`
    case 'auctionWon':
      return `${names.player(event.playerId)} remporte ${names.square(event.squareId)} pour ${formatPwn(event.amount)}`
    case 'auctionUnsold':
      return `Personne n’a enchéri : ${names.square(event.squareId)} reste à la banque`
    case 'backdoorBuilt':
      return event.level === 5
        ? `${names.player(event.playerId)} installe un rootkit sur ${names.square(event.squareId)}`
        : `${names.player(event.playerId)} installe une backdoor sur ${names.square(event.squareId)}`
    case 'backdoorSold':
      return event.level === 4
        ? `${names.player(event.playerId)} revend le rootkit de ${names.square(event.squareId)}`
        : `${names.player(event.playerId)} revend une backdoor de ${names.square(event.squareId)}`
    case 'mortgaged':
      return `${names.player(event.playerId)} met ${names.square(event.squareId)} en veille`
    case 'unmortgaged':
      return `${names.player(event.playerId)} réactive ${names.square(event.squareId)}`
    case 'debtStarted': {
      const [first] = event.payments
      return first ? `${names.player(event.debtor)} doit ${formatPwn(first.amount)} à ${names.player(first.to)}` : null
    }
    case 'assetsTransferred':
      return event.to === 'bank'
        ? `Les systèmes de ${names.player(event.from)} retournent à la banque`
        : `Les biens de ${names.player(event.from)} passent à ${names.player(event.to)}`
    case 'bankrupt':
      return `${names.player(event.playerId)} fait faillite`
    case 'gameWon':
      return `${names.player(event.playerId)} remporte la partie`
    default:
      return null
  }
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
    default:
      return UPDATE_EVENTS.has(event.type) ? { kind: 'update' } : null
  }
}

function lineList(line: string | null): string[] {
  return line === null ? [] : [line]
}

/** Turns the events of one engine action into the ordered steps shown to the players. */
export function presentationSteps(before: GameState, events: readonly GameEvent[]): PresentationStep[] {
  const names = namesOf(before)
  const positions = new Map(before.players.map((p) => [p.id, p.position]))
  const steps: PresentationStep[] = []
  const line = (event: GameEvent) => lineList(eventLine(before, names, event))

  const pushMove = (event: Extract<GameEvent, { type: 'moved' }>, path: number[], lines: string[]) => {
    const from = positions.get(event.playerId) ?? 0
    const moved: GameEvent = { ...event, path }
    steps.push({ kind: 'move', playerId: event.playerId, squares: [from, ...path], backward: event.backward, events: [moved], lines })
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
        pushMove(event, event.path, line(event))
        continue
      }
      const rest = event.path.slice(bootAt + 1)
      pushMove(event, event.path.slice(0, bootAt + 1), rest.length === 0 ? line(event) : [])
      steps.push({ kind: 'salary', playerId: event.playerId, amount: salary.amount, events: [passed, salary], lines: line(salary) })
      if (rest.length > 0) pushMove(event, rest, line(event))
      i += 2
      continue
    }
    const content = contentOf(event, positions)
    if (event.type === 'sentToQuarantine') positions.set(event.playerId, QUARANTINE_INDEX)
    const previous = steps.at(-1)
    if (content) steps.push({ ...content, events: [event], lines: line(event) })
    else if (previous) {
      previous.events.push(event)
      previous.lines.push(...line(event))
    } else steps.push({ kind: 'silent', events: [event], lines: line(event) })
  }
  return steps
}
