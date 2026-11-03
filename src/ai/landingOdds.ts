import { BOARD, BOARD_SIZE, CARDS, MAX_QUARANTINE_ATTEMPTS, QUARANTINE_INDEX, type CardEffect } from '../engine'

type Outcome = number | 'quarantine'
type Transitions = Map<number, number>[]

const DOUBLES_BEFORE_QUARANTINE = 2
const ROLL_STATES = BOARD_SIZE * (DOUBLES_BEFORE_QUARANTINE + 1)
const QUARANTINE_STATES = MAX_QUARANTINE_ATTEMPTS
const MAX_CARD_CHAIN = 2
const CONVERGENCE = 1e-13
const MAX_ITERATIONS = 10_000
const DIE_FACES = [1, 2, 3, 4, 5, 6] as const
const ROLLS = DIE_FACES.flatMap((a) => DIE_FACES.map((b) => ({ total: a + b, double: a === b })))

/** Chance that two dice add up to the total. */
export function diceTotalOdds(total: number): number {
  if (total < 2 || total > 12) return 0
  return (6 - Math.abs(total - 7)) / 36
}

function nextOfKind(position: number, kind: 'node' | 'service'): number {
  for (let offset = 1; offset <= BOARD_SIZE; offset++) {
    const index = (position + offset) % BOARD_SIZE
    if (BOARD[index]?.kind === kind) return index
  }
  return position
}

function destination(position: number, effect: CardEffect): Outcome {
  switch (effect.kind) {
    case 'moveTo':
    case 'moveBackTo':
      return effect.target
    case 'moveBack':
      return (position - effect.steps + BOARD_SIZE) % BOARD_SIZE
    case 'nextNode':
      return nextOfKind(position, 'node')
    case 'nextService':
      return nextOfKind(position, 'service')
    case 'goToQuarantine':
      return 'quarantine'
    default:
      return position
  }
}

function add(outcomes: Map<Outcome, number>, outcome: Outcome, chance: number): void {
  outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + chance)
}

function landOn(index: number, chain = 0): Map<Outcome, number> {
  const square = BOARD[index]
  const outcomes = new Map<Outcome, number>()
  if (square?.kind === 'corner' && square.corner === 'detected') add(outcomes, 'quarantine', 1)
  else if (square?.kind === 'card' && chain < MAX_CARD_CHAIN) {
    const deck = CARDS.filter((card) => card.deck === square.deck)
    for (const card of deck) {
      const target = destination(index, card.effect)
      const share = 1 / deck.length
      if (target === 'quarantine' || target === index) add(outcomes, target, share)
      else for (const [outcome, chance] of landOn(target, chain + 1)) add(outcomes, outcome, share * chance)
    }
  } else add(outcomes, index, 1)
  return outcomes
}

function rollState(position: number, doubles: number): number {
  return position * (DOUBLES_BEFORE_QUARANTINE + 1) + doubles
}

function quarantineState(failedAttempts: number): number {
  return ROLL_STATES + failedAttempts
}

function moveTo(row: Map<number, number>, target: number, chance: number, doubles: number): void {
  for (const [outcome, share] of landOn(target % BOARD_SIZE)) {
    const next = outcome === 'quarantine' ? quarantineState(0) : rollState(outcome, doubles)
    row.set(next, (row.get(next) ?? 0) + chance * share)
  }
}

function transitions(): Transitions {
  const rows: Transitions = []
  for (let position = 0; position < BOARD_SIZE; position++) {
    for (let doubles = 0; doubles <= DOUBLES_BEFORE_QUARANTINE; doubles++) {
      const row = new Map<number, number>()
      for (const roll of ROLLS) {
        const chance = 1 / ROLLS.length
        if (roll.double && doubles === DOUBLES_BEFORE_QUARANTINE) row.set(quarantineState(0), (row.get(quarantineState(0)) ?? 0) + chance)
        else moveTo(row, position + roll.total, chance, roll.double ? doubles + 1 : 0)
      }
      rows[rollState(position, doubles)] = row
    }
  }
  for (let failed = 0; failed < QUARANTINE_STATES; failed++) {
    const row = new Map<number, number>()
    for (const roll of ROLLS) {
      const chance = 1 / ROLLS.length
      const leaves = roll.double || failed + 1 >= MAX_QUARANTINE_ATTEMPTS
      if (leaves) moveTo(row, QUARANTINE_INDEX + roll.total, chance, 0)
      else row.set(quarantineState(failed + 1), (row.get(quarantineState(failed + 1)) ?? 0) + chance)
    }
    rows[quarantineState(failed)] = row
  }
  return rows
}

function stationary(rows: Transitions): number[] {
  let current: number[] = Array.from({ length: rows.length }, (_, i) => (i === 0 ? 1 : 0))
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const next = new Array<number>(rows.length).fill(0)
    rows.forEach((row, from) => {
      const weight = current[from] ?? 0
      if (weight === 0) return
      for (const [to, chance] of row) next[to] = (next[to] ?? 0) + weight * chance
    })
    const averaged = next.map((value, i) => (value + (current[i] ?? 0)) / 2)
    const change = averaged.reduce((max, value, i) => Math.max(max, Math.abs(value - (current[i] ?? 0))), 0)
    current = averaged
    if (change < CONVERGENCE) break
  }
  return current
}

let cached: readonly number[] | null = null

/** Long-run share of rolls that leave a pawn on each square, from the board data alone (dice, triple double, movement cards, quarantine). */
export function landingOdds(): readonly number[] {
  if (cached) return cached
  const distribution = stationary(transitions())
  const odds = Array.from({ length: BOARD_SIZE }, (_, position) =>
    Array.from({ length: DOUBLES_BEFORE_QUARANTINE + 1 }, (_, doubles) => distribution[rollState(position, doubles)] ?? 0).reduce((a, b) => a + b, 0),
  )
  for (let failed = 0; failed < QUARANTINE_STATES; failed++) odds[QUARANTINE_INDEX] = (odds[QUARANTINE_INDEX] ?? 0) + (distribution[quarantineState(failed)] ?? 0)
  cached = Object.freeze(odds)
  return cached
}
