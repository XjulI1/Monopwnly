import { FAMILY_SQUARES, purchasableById } from './board/squares'
import { emit, fail, getPlayer, type Ctx } from './context'
import type { GameState, Player, PlayerId, PublicGameState, RuleError, SquareId, TradeOffer, TradeSide, TurnProposals } from './types'

/** Most trades a player may propose in one turn. */
export const MAX_TRADE_PROPOSALS = 3

const NO_PROPOSAL: TurnProposals = { count: 0, partners: [], rejected: [] }

function error(code: RuleError['code'], message: string): RuleError {
  return { code, message }
}

function isEmpty(side: TradeSide): boolean {
  return side.squares.length === 0 && side.cash === 0 && side.keys.length === 0
}

function hasBuildingsInFamily(state: PublicGameState, squareId: SquareId): boolean {
  const square = purchasableById(squareId)
  if (square?.kind !== 'system') return false
  return FAMILY_SQUARES[square.family].some((id) => (state.ownership[id]?.level ?? 0) > 0)
}

function sideProblem(state: PublicGameState, side: TradeSide, owner: PlayerId): RuleError | null {
  const player = state.players.find((p) => p.id === owner)
  if (!player) return error('INVALID_TRADE', 'Ce joueur ne participe pas à la partie.')
  if (!Number.isInteger(side.cash) || side.cash < 0) return error('INVALID_TRADE', 'Le montant doit être un nombre entier de PwnCoins.')
  if (side.cash > player.cash) return error('INSUFFICIENT_FUNDS', `${player.name} n’a pas ${side.cash} Ᵽ.`)
  if (new Set(side.squares).size !== side.squares.length) return error('INVALID_TRADE', 'Une même case apparaît deux fois dans l’offre.')
  for (const squareId of side.squares) {
    if (!purchasableById(squareId)) return error('UNKNOWN_SQUARE', 'Cette case ne peut pas être échangée.')
    if (state.ownership[squareId]?.owner !== owner) return error('NOT_OWNER', `Cette case n’appartient pas à ${player.name}.`)
    if (hasBuildingsInFamily(state, squareId)) {
      return error('HAS_BUILDINGS', 'Revendez d’abord les constructions de la famille pour échanger ce système.')
    }
  }
  if (new Set(side.keys).size !== side.keys.length) return error('INVALID_TRADE', 'Une même Clé apparaît deux fois dans l’offre.')
  if (side.keys.some((key) => !player.keys.includes(key))) return error('NO_KEY', `${player.name} ne détient pas cette Clé de déchiffrement.`)
  return null
}

/** Explains why the content of an offer is not valid in this state, ignoring the phase and the limits of proposals, or null if it is. */
export function offerProblem(state: PublicGameState, offer: TradeOffer): RuleError | null {
  const recipient = state.players.find((p) => p.id === offer.to)
  if (offer.from === offer.to || !recipient || recipient.bankrupt) {
    return error('INVALID_TRADE', 'Choisissez un autre joueur encore en jeu.')
  }
  if (isEmpty(offer.give) && isEmpty(offer.receive)) return error('EMPTY_TRADE', 'L’offre ne contient rien.')
  return sideProblem(state, offer.give, offer.from) ?? sideProblem(state, offer.receive, offer.to)
}

function canonicalSide(side: TradeSide): TradeSide {
  return { squares: [...side.squares].sort(), cash: side.cash, keys: [...side.keys].sort() }
}

/** Key of an offer that does not depend on the order of its squares and keys. */
export function tradeKey(offer: TradeOffer): string {
  return JSON.stringify({ to: offer.to, give: canonicalSide(offer.give), receive: canonicalSide(offer.receive) })
}

/** Proposals the player has made in the current turn. */
export function turnProposals(state: PublicGameState, playerId: PlayerId): TurnProposals {
  return state.tradeLimits.thisTurn[playerId] ?? NO_PROPOSAL
}

/** Trades the player may still propose in the current turn. */
export function tradeProposalsLeft(state: PublicGameState, playerId: PlayerId): number {
  return Math.max(0, MAX_TRADE_PROPOSALS - turnProposals(state, playerId).count)
}

/** Explains why the offer could not be proposed now, phase and author aside, or null if it could. */
export function validateTrade(state: PublicGameState, offer: TradeOffer): RuleError | null {
  const proposals = turnProposals(state, offer.from)
  if (proposals.count >= MAX_TRADE_PROPOSALS) {
    return error('TRADE_LIMIT_REACHED', `Pas plus de ${MAX_TRADE_PROPOSALS} propositions d’échange par tour.`)
  }
  if (proposals.rejected.includes(tradeKey(offer))) {
    return error('TRADE_ALREADY_REJECTED', 'Cette offre a déjà été refusée pendant ce tour.')
  }
  return offerProblem(state, offer)
}

/** The same trade sent the other way: what the author gave becomes what they ask for, and the other way round. */
export function reversedOffer(offer: TradeOffer): TradeOffer {
  return { from: offer.to, to: offer.from, give: offer.receive, receive: offer.give }
}

/** Explains why the recipient of the pending offer could not send this counter-offer back to its author, or null if they could. */
export function counterProblem(state: PublicGameState, counter: TradeOffer): RuleError | null {
  const phase = state.phase
  if (phase.kind !== 'tradeOffer') return error('WRONG_PHASE', 'Aucune offre d’échange en attente.')
  if (phase.original !== null) return error('COUNTER_NOT_ALLOWED', 'Une contre-proposition ne peut pas recevoir de contre-proposition.')
  if (counter.from !== phase.offer.to || counter.to !== phase.offer.from) {
    return error('INVALID_TRADE', 'Une contre-proposition s’adresse à l’auteur de l’offre.')
  }
  if (tradeKey(counter) === tradeKey(reversedOffer(phase.offer))) return error('COUNTER_UNCHANGED', 'Modifiez l’offre pour faire une contre-proposition.')
  return offerProblem(state, counter)
}

function ensure(problem: RuleError | null): void {
  if (problem) fail(problem.code, problem.message)
}

function tradePhase(ctx: Ctx) {
  const phase = ctx.state.phase
  if (phase.kind !== 'tradeOffer') fail('WRONG_PHASE', 'Aucune offre d’échange en attente.')
  return phase
}

export function proposeTrade(ctx: Ctx, playerId: PlayerId, offer: TradeOffer): void {
  const state = ctx.state
  const phase = state.phase
  if (phase.kind !== 'preRoll' && phase.kind !== 'postRoll' && phase.kind !== 'debt') {
    fail('WRONG_PHASE', 'Aucun échange n’est possible maintenant.')
  }
  if (offer.from !== playerId) fail('INVALID_TRADE', 'Une offre se propose en son propre nom.')
  ensure(validateTrade(state, offer))
  const proposals = turnProposals(state, playerId)
  state.tradeLimits.thisTurn[playerId] = {
    count: proposals.count + 1,
    partners: proposals.partners.includes(offer.to) ? [...proposals.partners] : [...proposals.partners, offer.to],
    rejected: [...proposals.rejected],
  }
  const proposed = structuredClone(offer)
  state.phase = { kind: 'tradeOffer', offer: proposed, resume: phase, original: null }
  emit(ctx, { type: 'tradeProposed', offer: structuredClone(proposed) })
}

function handOver(state: PublicGameState, side: TradeSide, giver: Player, receiver: Player): void {
  for (const squareId of side.squares) {
    const own = state.ownership[squareId]
    if (own) own.owner = receiver.id
  }
  giver.cash -= side.cash
  receiver.cash += side.cash
  giver.keys = giver.keys.filter((key) => !side.keys.includes(key))
  receiver.keys.push(...side.keys)
}

/** A copy of the state once the offer is accepted, the phase left as it is. */
export function stateAfterTrade<T extends PublicGameState>(state: T, offer: TradeOffer): T {
  const next = structuredClone(state)
  const author = next.players.find((p) => p.id === offer.from)
  const recipient = next.players.find((p) => p.id === offer.to)
  if (!author || !recipient) return next
  handOver(next, offer.give, author, recipient)
  handOver(next, offer.receive, recipient, author)
  return next
}

export function acceptTrade(ctx: Ctx): void {
  const state = ctx.state
  const phase = tradePhase(ctx)
  const { offer } = phase
  ensure(offerProblem(state, offer))
  const author = getPlayer(state, offer.from)
  const recipient = getPlayer(state, offer.to)
  handOver(state, offer.give, author, recipient)
  handOver(state, offer.receive, recipient, author)
  state.phase = phase.resume
  emit(ctx, { type: 'tradeAccepted', offer: structuredClone(offer), original: structuredClone(phase.original) })
}

function rememberRefusal(state: GameState, offer: TradeOffer): void {
  const limits = state.tradeLimits
  const proposals = turnProposals(state, offer.from)
  limits.thisTurn[offer.from] = { ...proposals, rejected: [...proposals.rejected, tradeKey(offer)] }
  if (offer.receive.squares.length === 0) return
  const asks = (limits.refusedAsks[offer.from] ??= {})
  for (const squareId of offer.receive.squares) {
    const previous = asks[squareId]
    asks[squareId] = { holder: offer.to, count: previous?.holder === offer.to ? previous.count + 1 : 1 }
  }
}

export function rejectTrade(ctx: Ctx): void {
  const state = ctx.state
  const phase = tradePhase(ctx)
  rememberRefusal(state, phase.offer)
  state.phase = phase.resume
  emit(ctx, { type: 'tradeRejected', offer: structuredClone(phase.offer), original: structuredClone(phase.original) })
}

export function counterTrade(ctx: Ctx, counter: TradeOffer): void {
  const state = ctx.state
  const phase = tradePhase(ctx)
  ensure(counterProblem(state, counter))
  rememberRefusal(state, phase.offer)
  const countered = structuredClone(counter)
  state.phase = { kind: 'tradeOffer', offer: countered, resume: phase.resume, original: phase.offer }
  emit(ctx, { type: 'tradeCountered', offer: structuredClone(countered), original: structuredClone(phase.offer) })
}
