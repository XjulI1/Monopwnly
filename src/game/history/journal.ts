import {
  cardById,
  MAX_QUARANTINE_ATTEMPTS,
  purchasableById,
  unmortgageCost,
  type Card,
  type CardEffect,
  type GameEvent,
  type GameState,
  type PlayerId,
  type QuarantineExit,
  type TradeOffer,
} from '../../engine'
import { formatPwn } from '../format'
import { winReasonText } from '../gameOptions'
import { countOf, deckName, listOf, offerText, ofName, squareName, squareNameAt } from './format'
import { trackPositions } from './positions'

/** A sub-line of a journal entry, shown when the entry is unfolded. */
export type JournalDetail = { actor: PlayerId | null; text: string }

/** Kind of a journal entry: the heading of a player's turn, an action, or an auction still running. */
export type JournalEntryKind = 'turn' | 'action' | 'auction'

/** A line of the game journal, tied to its author and to the round of the engine. */
export type JournalEntry = {
  id: number
  kind: JournalEntryKind
  turn: number
  actor: PlayerId | null
  text: string
  details: JournalDetail[]
}

/** The journal after an action; `reveals[i]` is the number of events of the action to present before its i-th new entry shows. */
export type JournalUpdate = { journal: JournalEntry[]; reveals: number[] }

type Draft = { entry: JournalEntry; until: number }
type Roll = { draft: Draft; playerId: PlayerId; dice: [number, number]; double: boolean; move: string | null }
type DrawnCard = { draft: Draft; playerId: PlayerId; card: Card; effect: string; moved: boolean }
type Paid = Extract<GameEvent, { type: 'paid' }>
type Transferred = Extract<GameEvent, { type: 'assetsTransferred' }>
type PotPayment = Extract<GameEvent, { type: 'potIncreased' }>

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

const EXITS: Record<QuarantineExit, string> = {
  fine: 'amende',
  key: 'clé',
  double: 'double',
  forcedFine: 'amende après trois échecs',
}

const MOVE_EFFECTS: ReadonlySet<CardEffect['kind']> = new Set(['moveTo', 'moveBack', 'moveBackTo', 'nextNode', 'nextService'])
const SHARED_EFFECTS: ReadonlySet<CardEffect['kind']> = new Set(['payEachPlayer', 'collectFromEachPlayer'])

function cardEffect(effect: CardEffect): string {
  switch (effect.kind) {
    case 'gain':
      return `reçoit ${formatPwn(effect.amount)}`
    case 'pay':
      return `paie ${formatPwn(effect.amount)}`
    case 'payPerBuilding':
      return 'n’a rien à payer'
    case 'payEachPlayer':
      return `verse ${formatPwn(effect.amount)} à chaque autre joueur`
    case 'collectFromEachPlayer':
      return `reçoit ${formatPwn(effect.amount)} de chaque autre joueur`
    case 'goToQuarantine':
      return 'est placé en quarantaine'
    case 'decryptionKey':
      return 'garde une Clé de déchiffrement'
    default:
      return ''
  }
}

function plural(count: number, singular: string, many: string): string {
  return count === 1 ? singular : many
}

/** The journal of a new game: the heading of the turn of the first player. */
export function startJournal(state: GameState): JournalEntry[] {
  const player = state.players[state.currentPlayerIndex]
  if (!player) return []
  return [{ id: 1, kind: 'turn', turn: state.turnNumber, actor: player.id, text: `Tour ${state.turnNumber} — ${player.name}`, details: [] }]
}

/** Writes in the journal the events of one engine action, played from the given state. */
export function recordInJournal(journal: readonly JournalEntry[], before: GameState, events: readonly GameEvent[]): JournalUpdate {
  const kept = [...journal]
  const added: Draft[] = []
  const positions = trackPositions(before)
  const leavesQuarantine = events.some((event) => event.type === 'leftQuarantine')
  let nextId = (journal.at(-1)?.id ?? 0) + 1
  let turn = before.turnNumber
  let roll: Roll | null = null
  let card: DrawnCard | null = null
  let mover: Draft | null = null
  let quarantineDice: [number, number] | null = null
  let serviceDice: [number, number] | null = null
  let liquidation = 0
  let ruin: JournalDetail[] = []

  const name = (id: PlayerId | 'bank') => (id === 'bank' ? 'la banque' : (before.players.find((p) => p.id === id)?.name ?? id))
  const actorOf = (id: PlayerId | 'bank') => (id === 'bank' ? null : id)

  function add(kind: JournalEntry['kind'], actor: PlayerId | null, text: string, index: number, details: JournalDetail[] = []): Draft {
    const draft = { entry: { id: nextId++, kind, turn, actor, text, details }, until: index + 1 }
    added.push(draft)
    return draft
  }

  function extend(draft: Draft, index: number, detail?: JournalDetail) {
    if (detail) draft.entry.details.push(detail)
    draft.until = index + 1
  }

  function rollText(open: Roll): string {
    const [a, b] = open.dice
    return `${name(open.playerId)} lance ${a} et ${b}${open.move ? ` et ${open.move}` : ''}${open.double ? ' (double)' : ''}`
  }

  function openRoll(playerId: PlayerId, dice: [number, number], double: boolean, index: number): Roll {
    const open: Roll = { draft: add('action', playerId, '', index), playerId, dice, double, move: null }
    open.draft.entry.text = rollText(open)
    return open
  }

  function setEffect(drawn: DrawnCard, effect: string, index: number) {
    drawn.effect = effect
    drawn.draft.entry.text = `${name(drawn.playerId)} pioche ${deckName(drawn.card.deck)} : ${drawn.card.title}${effect ? ` — ${effect}` : ''}`
    extend(drawn.draft, index)
  }

  function auction(index: number): Draft {
    const open = added.findLast((draft) => draft.entry.kind === 'auction')
    if (open) return open
    const keptIndex = kept.findLastIndex((entry) => entry.kind === 'auction')
    const previous = kept[keptIndex]
    if (previous) {
      const entry = { ...previous, details: [...previous.details] }
      kept[keptIndex] = entry
      return { entry, until: 0 }
    }
    const phase = before.phase
    return add('auction', null, phase.kind === 'auction' ? `Enchère sur ${squareName(phase.squareId)}` : 'Enchère', index)
  }

  function closeAuction(actor: PlayerId | null, text: string, index: number) {
    const draft = auction(index)
    Object.assign(draft.entry, { kind: 'action', actor, text })
    extend(draft, index)
  }

  function onMove(event: Extract<GameEvent, { type: 'moved' }>, index: number) {
    const last = event.path.at(-1)
    if (last === undefined) return
    const move = `${event.backward ? 'recule' : 'avance'} sur ${squareNameAt(last)}`
    if (roll && roll.move === null && roll.playerId === event.playerId) {
      roll.move = move
      roll.draft.entry.text = rollText(roll)
      extend(roll.draft, index)
      mover = roll.draft
      return
    }
    if (card && !card.moved && MOVE_EFFECTS.has(card.card.effect.kind)) {
      card.moved = true
      setEffect(card, move, index)
      mover = card.draft
      return
    }
    mover = add('action', event.playerId, `${name(event.playerId)} ${move}`, index)
  }

  function onCardPayment(event: Paid, index: number) {
    const amount = formatPwn(event.amount)
    if (card && SHARED_EFFECTS.has(card.card.effect.kind)) {
      extend(card.draft, index, { actor: actorOf(event.from), text: `${name(event.from)} verse ${amount} à ${name(event.to)}` })
      return
    }
    if (card && (event.from === card.playerId || event.to === card.playerId)) {
      if (card.card.effect.kind === 'payPerBuilding') setEffect(card, `paie ${amount}`, index)
      else extend(card.draft, index)
      return
    }
    add('action', actorOf(event.from), `${name(event.from)} paie ${amount} à ${name(event.to)}`, index)
  }

  function onPotPayment(event: PotPayment, index: number) {
    const text = `${name(event.playerId)} alimente la cagnotte de ${formatPwn(event.amount)}`
    if (event.reason !== 'card' || card?.playerId !== event.playerId) {
      add('action', event.playerId, text, index)
      return
    }
    if (card.card.effect.kind === 'payPerBuilding') setEffect(card, `paie ${formatPwn(event.amount)}`, index)
    extend(card.draft, index, { actor: event.playerId, text })
  }

  function onPayment(event: Paid, index: number) {
    const amount = formatPwn(event.amount)
    const payer = name(event.from)
    switch (event.reason) {
      case 'salary': {
        if (events[index - 1]?.type === 'bootBonus') {
          if (mover) extend(mover, index)
          return
        }
        const text = `${name(event.to)} passe par Boot et reçoit ${amount}`
        if (mover) extend(mover, index, { actor: actorOf(event.to), text })
        else add('action', actorOf(event.to), text, index)
        return
      }
      case 'rent': {
        const square = squareNameAt(positions.at(event.from))
        const draft = add('action', actorOf(event.from), `${payer} paie ${amount} de loyer à ${name(event.to)} pour ${square}`, index)
        if (serviceDice) extend(draft, index, { actor: actorOf(event.from), text: `${payer} lance ${serviceDice[0]} et ${serviceDice[1]} pour le loyer` })
        serviceDice = null
        return
      }
      case 'tax':
        add('action', actorOf(event.from), `${payer} paie ${amount} : ${squareNameAt(positions.at(event.from))}`, index)
        return
      case 'card':
        onCardPayment(event, index)
        return
      case 'quarantineFine':
        if (!leavesQuarantine) add('action', actorOf(event.from), `${payer} paie l’amende de ${amount}`, index)
        return
      case 'sellBuilding':
        if (events[index + 1]?.type !== 'backdoorSold') liquidation += event.amount
        return
      case 'bankruptcy':
        ruin.push({ actor: actorOf(event.from), text: `${payer} cède ${amount} à ${name(event.to)}` })
        return
      default:
        return
    }
  }

  function transferDetails(event: Transferred): JournalDetail[] {
    const toBank = event.to === 'bank'
    const details: JournalDetail[] = []
    const squares = event.squareIds.length
    if (squares > 0) {
      const verb = toBank ? `${plural(squares, 'retourne', 'retournent')} à la banque` : `${plural(squares, 'passe', 'passent')} à ${name(event.to)}`
      details.push({ actor: event.from, text: `${listOf(event.squareIds.map(squareName))} ${verb}` })
    }
    const keys = event.keys.length
    if (keys > 0) {
      const verb = toBank
        ? plural(keys, 'retourne sous son paquet', 'retournent sous leur paquet')
        : `${plural(keys, 'passe', 'passent')} à ${name(event.to)}`
      details.push({ actor: event.from, text: `${countOf(keys, 'Clé de déchiffrement', 'Clés de déchiffrement')} ${verb}` })
    }
    return details
  }

  function tradeText(offer: TradeOffer): string {
    return offerText(offer, (id) => before.ownership[id]?.mortgaged ?? false)
  }

  function answer(offer: TradeOffer, original: TradeOffer | null, verb: string, index: number) {
    const what = original ? 'la contre-proposition' : 'l’offre'
    add('action', offer.to, `${name(offer.to)} ${verb} ${what} ${ofName(name(offer.from))} : ${tradeText(offer)}`, index)
  }

  function onBankruptcy(event: Extract<GameEvent, { type: 'bankrupt' }>, index: number) {
    const who = name(event.playerId)
    const sold = liquidation > 0 ? [{ actor: event.playerId, text: `${who} revend ses constructions pour ${formatPwn(liquidation)}` }] : []
    const text = event.voluntary ? `${who} abandonne et se déclare en faillite` : `${who} fait faillite au profit ${ofName(name(event.creditor))}`
    add('action', event.playerId, text, index, [...sold, ...ruin])
    liquidation = 0
    ruin = []
  }

  function onEvent(event: GameEvent, index: number) {
    switch (event.type) {
      case 'turnStarted':
        turn = event.turnNumber
        roll = null
        card = null
        mover = null
        add('turn', event.playerId, `Tour ${turn} — ${name(event.playerId)}`, index)
        return
      case 'diceRolled':
        if (event.purpose === 'move') roll = openRoll(event.playerId, event.dice, event.dice[0] === event.dice[1], index)
        else if (event.purpose === 'quarantine') quarantineDice = event.dice
        else serviceDice = event.dice
        return
      case 'moved':
        onMove(event, index)
        return
      case 'paid':
        onPayment(event, index)
        return
      case 'sentToQuarantine':
        if (event.reason === 'card' && card) extend(card.draft, index)
        else add('action', event.playerId, `${name(event.playerId)} est placé en quarantaine`, index)
        return
      case 'quarantineAttemptFailed': {
        const [a, b] = quarantineDice ?? [0, 0]
        const attempt = `tentative ${event.failedAttempts} sur ${MAX_QUARANTINE_ATTEMPTS}`
        add('action', event.playerId, `${name(event.playerId)} lance ${a} et ${b} sans faire de double (${attempt})`, index)
        return
      }
      case 'leftQuarantine':
        add('action', event.playerId, `${name(event.playerId)} sort de quarantaine (${EXITS[event.method]})`, index)
        if (event.method === 'double' && quarantineDice) roll = openRoll(event.playerId, quarantineDice, false, index)
        return
      case 'cardDrawn': {
        const drawn = cardById(event.cardId)
        card = { draft: add('action', event.playerId, '', index), playerId: event.playerId, card: drawn, effect: '', moved: false }
        setEffect(card, cardEffect(drawn.effect), index)
        return
      }
      case 'propertyBought':
        add('action', event.playerId, `${name(event.playerId)} achète ${squareName(event.squareId)} pour ${formatPwn(event.price)}`, index)
        return
      case 'propertyDeclined':
        add('action', event.playerId, `${name(event.playerId)} n’achète pas ${squareName(event.squareId)}`, index)
        return
      case 'auctionStarted':
        add('auction', null, `Enchère sur ${squareName(event.squareId)}`, index)
        return
      case 'bidPlaced':
        extend(auction(index), index, { actor: event.playerId, text: `${name(event.playerId)} mise ${formatPwn(event.amount)}` })
        return
      case 'bidPassed':
        extend(auction(index), index, { actor: event.playerId, text: `${name(event.playerId)} passe` })
        return
      case 'auctionWon':
        closeAuction(event.playerId, `${name(event.playerId)} remporte ${squareName(event.squareId)} aux enchères pour ${formatPwn(event.amount)}`, index)
        return
      case 'auctionUnsold':
        closeAuction(null, `Personne ne prend ${squareName(event.squareId)} aux enchères`, index)
        return
      case 'backdoorBuilt': {
        const piece = event.level === 5 ? 'un rootkit' : 'une backdoor'
        add('action', event.playerId, `${name(event.playerId)} installe ${piece} sur ${squareName(event.squareId)}`, index)
        return
      }
      case 'backdoorSold': {
        const piece = event.level === 4 ? 'le rootkit' : 'une backdoor'
        add('action', event.playerId, `${name(event.playerId)} revend ${piece} ${ofName(squareName(event.squareId))}`, index)
        return
      }
      case 'mortgaged': {
        const value = purchasableById(event.squareId)?.mortgageValue ?? 0
        add('action', event.playerId, `${name(event.playerId)} met ${squareName(event.squareId)} en veille et reçoit ${formatPwn(value)}`, index)
        return
      }
      case 'unmortgaged':
        add('action', event.playerId, `${name(event.playerId)} réactive ${squareName(event.squareId)} pour ${formatPwn(unmortgageCost(event.squareId))}`, index)
        return
      case 'debtStarted': {
        const [first] = event.payments
        if (first && card?.card.effect.kind === 'payPerBuilding' && card.playerId === event.debtor) setEffect(card, `paie ${formatPwn(first.amount)}`, index)
        const total = event.payments.reduce((sum, payment) => sum + payment.amount, 0)
        add('action', event.debtor, `${name(event.debtor)} doit réunir ${formatPwn(total)}`, index)
        return
      }
      case 'assetsTransferred':
        ruin.push(...transferDetails(event))
        return
      case 'bankrupt':
        onBankruptcy(event, index)
        return
      case 'gameWon':
        add('action', event.playerId, `${name(event.playerId)} remporte la partie : ${lowerFirst(winReasonText(event.reason, before.settings))}`, index)
        return
      case 'potIncreased':
        onPotPayment(event, index)
        return
      case 'potCollected':
        add('action', event.playerId, `${name(event.playerId)} remporte la cagnotte de la DMZ : ${formatPwn(event.amount)}`, index)
        return
      case 'bootBonus': {
        const text = `${name(event.playerId)} reçoit le bonus double de Boot`
        if (mover) extend(mover, index, { actor: event.playerId, text })
        else add('action', event.playerId, text, index)
        return
      }
      case 'rentWaived':
        add('action', event.ownerId, `${name(event.ownerId)} ne perçoit pas de loyer (en quarantaine)`, index)
        return
      case 'tradeProposed':
        add('action', event.offer.from, `${name(event.offer.from)} propose à ${name(event.offer.to)} : ${tradeText(event.offer)}`, index)
        return
      case 'tradeCountered':
        add('action', event.offer.from, `${name(event.offer.from)} fait une contre-proposition à ${name(event.offer.to)} : ${tradeText(event.offer)}`, index)
        return
      case 'tradeAccepted':
        answer(event.offer, event.original, 'accepte', index)
        return
      case 'tradeRejected':
        answer(event.offer, event.original, 'refuse', index)
        return
      default:
        return
    }
  }

  events.forEach((event, index) => {
    onEvent(event, index)
    positions.follow(event)
  })

  return { journal: [...kept, ...added.map((draft) => draft.entry)], reveals: added.map((draft) => draft.until) }
}
