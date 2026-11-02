import { cardById } from './board/cards'
import { purchasableById } from './board/squares'
import { currentPlayer, emit, fail, getPlayer, transfer, type Ctx } from './context'
import { moveForward, resolveLanding } from './movement'
import { advanceToNextPlayer, checkVictory, enterPostRoll } from './turn'
import type { GameState, Payment, PlayerId, ResumePoint } from './types'

/** Makes the debtor pay in order; switches to the debt phase on the first payment not covered. */
export function charge(ctx: Ctx, debtorId: PlayerId, payments: Payment[], resume: ResumePoint): void {
  const debtor = getPlayer(ctx.state, debtorId)
  const due = payments.filter((p) => p.amount > 0)
  for (let i = 0; i < due.length; i++) {
    const payment = due[i] as Payment
    if (debtor.cash < payment.amount) {
      const remaining = due.slice(i)
      ctx.state.phase = { kind: 'debt', debtor: debtorId, payments: remaining, resume }
      emit(ctx, { type: 'debtStarted', debtor: debtorId, payments: remaining })
      return
    }
    transfer(ctx, debtorId, payment.to, payment.amount, payment.reason)
  }
  applyResume(ctx, resume)
}

export function applyResume(ctx: Ctx, resume: ResumePoint): void {
  switch (resume.kind) {
    case 'postRoll':
      enterPostRoll(ctx)
      return
    case 'moveAfterFine':
      moveForward(ctx, resume.steps)
      resolveLanding(ctx)
      return
    case 'collectFrom':
      collectFrom(ctx, resume.creditor, resume.payers, resume.amount)
  }
}

/** Makes each payer in turn pay the creditor, each one possibly going through the debt phase. */
export function collectFrom(ctx: Ctx, creditor: PlayerId, payers: PlayerId[], amount: number): void {
  const [payer, ...rest] = payers.filter((id) => !getPlayer(ctx.state, id).bankrupt)
  if (!payer) {
    enterPostRoll(ctx)
    return
  }
  charge(ctx, payer, [{ to: creditor, amount, reason: 'card' }], {
    kind: 'collectFrom',
    creditor,
    payers: rest,
    amount,
  })
}

function debtPhase(ctx: Ctx) {
  const phase = ctx.state.phase
  if (phase.kind !== 'debt') fail('WRONG_PHASE', 'Aucune dette à régler.')
  return phase
}

export function payDebt(ctx: Ctx): void {
  const phase = debtPhase(ctx)
  const debtor = getPlayer(ctx.state, phase.debtor)
  const first = phase.payments[0]
  if (first && debtor.cash < first.amount) {
    fail('DEBT_NOT_COVERED', `Il vous manque ${first.amount - debtor.cash} Ᵽ pour régler cette dette.`)
  }
  charge(ctx, phase.debtor, phase.payments, phase.resume)
}

/** Amount a player could raise: cash, plus the sale of all buildings, plus mortgaging every active square. */
export function liquidationValue(state: GameState, playerId: PlayerId): number {
  let total = getPlayer(state, playerId).cash
  for (const [id, own] of Object.entries(state.ownership)) {
    if (own.owner !== playerId) continue
    const square = purchasableById(id)
    if (!square) continue
    if (square.kind === 'system') total += (own.level * square.backdoorCost) / 2
    if (!own.mortgaged) total += square.mortgageValue
  }
  return total
}

function liquidateBuildings(ctx: Ctx, playerId: PlayerId): void {
  for (const [id, own] of Object.entries(ctx.state.ownership)) {
    const square = purchasableById(id)
    if (own.owner !== playerId || own.level === 0 || !square || square.kind !== 'system') continue
    if (own.level === 5) ctx.state.bankStock.rootkits += 1
    else ctx.state.bankStock.backdoors += own.level
    transfer(ctx, 'bank', playerId, (own.level * square.backdoorCost) / 2, 'sellBuilding')
    own.level = 0
  }
}

export function declareBankruptcy(ctx: Ctx): void {
  const phase = debtPhase(ctx)
  const state = ctx.state
  const debtor = getPlayer(state, phase.debtor)
  const creditor = phase.payments[0]?.to ?? 'bank'
  const wasCurrent = currentPlayer(state).id === debtor.id

  liquidateBuildings(ctx, debtor.id)
  transfer(ctx, debtor.id, creditor, debtor.cash, 'bankruptcy')

  const squareIds = Object.keys(state.ownership).filter((id) => state.ownership[id]?.owner === debtor.id)
  const keys = debtor.keys
  debtor.keys = []
  for (const id of squareIds) {
    if (creditor === 'bank') delete state.ownership[id]
    else {
      const own = state.ownership[id]
      if (own) own.owner = creditor
    }
  }
  if (creditor === 'bank') {
    for (const key of keys) state.decks[cardById(key).deck].push(key)
  } else getPlayer(state, creditor).keys.push(...keys)

  debtor.bankrupt = true
  debtor.quarantine = null
  emit(ctx, { type: 'assetsTransferred', from: debtor.id, to: creditor, squareIds, keys })
  emit(ctx, { type: 'bankrupt', playerId: debtor.id, creditor })

  if (checkVictory(ctx)) return
  if (wasCurrent) advanceToNextPlayer(ctx)
  else applyResume(ctx, phase.resume)
}
