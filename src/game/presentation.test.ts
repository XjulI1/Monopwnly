import { describe, expect, it } from 'vitest'
import { applyAction, cardIdByTitle, legalActions, type GameEvent, type GameState } from '../engine'
import { A, B, act, makeState, player, roll } from '../engine/testUtils'
import { applySteps, presentationSteps, type PresentationStep } from './presentation'

function stepsOfRoll(start: GameState, dice: [number, number]) {
  const { state, events } = roll(start, dice)
  return { state, steps: presentationSteps(start, events) }
}

const kinds = (steps: PresentationStep[]) => steps.map((s) => s.kind)

function essentials(state: GameState) {
  return {
    players: state.players.map((p) => ({
      id: p.id,
      cash: p.cash,
      position: p.position,
      quarantine: p.quarantine,
      keys: [...p.keys].sort(),
      bankrupt: p.bankrupt,
    })),
    ownership: state.ownership,
    winner: state.winner,
  }
}

describe('presentation steps', () => {
  it('shows the dice then the move for a simple roll', () => {
    const { steps } = stepsOfRoll(makeState(), [2, 4])
    expect(kinds(steps)).toEqual(['dice', 'move'])
    expect(steps[0]).toMatchObject({ kind: 'dice', playerId: A, dice: [2, 4], purpose: 'move' })
    expect(steps[1]).toMatchObject({ kind: 'move', playerId: A, squares: [0, 1, 2, 3, 4, 5, 6], backward: false })
  })

  it('credits the salary when the pawn passes Boot, in the middle of the move', () => {
    const { steps } = stepsOfRoll(makeState({ overrides: [{ position: 36 }] }), [3, 4])
    expect(kinds(steps)).toEqual(['dice', 'move', 'salary', 'move'])
    expect(steps[1]).toMatchObject({ squares: [36, 37, 38, 39, 0] })
    expect(steps[2]).toMatchObject({ kind: 'salary', playerId: A, amount: 200 })
    expect(steps[3]).toMatchObject({ squares: [0, 1, 2, 3] })
  })

  it('credits the salary once on a stop on Boot', () => {
    const { steps } = stepsOfRoll(makeState({ overrides: [{ position: 34 }] }), [3, 3])
    expect(kinds(steps)).toEqual(['dice', 'move', 'salary'])
    expect(steps[1]).toMatchObject({ squares: [34, 35, 36, 37, 38, 39, 0] })
  })

  it('shows the card before moving back for Rollback', () => {
    const start = makeState({
      overrides: [{ position: 10 }],
      decks: { exploit: [cardIdByTitle('exploit', 'Rollback')] },
    })
    const { steps } = stepsOfRoll(start, [2, 3])
    expect(kinds(steps)).toEqual(['dice', 'move', 'card', 'move'])
    expect(steps[2]).toMatchObject({ kind: 'card', playerId: A, cardId: cardIdByTitle('exploit', 'Rollback') })
    expect(steps[3]).toMatchObject({ squares: [15, 14, 13, 12], backward: true })
  })

  it('names the player, the deck, the title and the effect of the card in the feed', () => {
    const start = makeState({
      overrides: [{ position: 10 }],
      decks: { exploit: [cardIdByTitle('exploit', 'Rollback')] },
    })
    const { steps } = stepsOfRoll(start, [2, 3])
    expect(steps[2]?.lines).toEqual(['Joueur 1 pioche la carte Exploit «\u00A0Rollback\u00A0» : Reculez de 3 cases.'])
  })

  it('debits the payer and credits the owner on a rent', () => {
    const start = makeState({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } })
    const { state, steps } = stepsOfRoll(start, [4, 6])
    expect(kinds(steps)).toEqual(['dice', 'move', 'payment'])
    expect(steps[2]).toMatchObject({ kind: 'payment', from: A, to: B, amount: 60, reason: 'rent' })
    const projected = applySteps(start, steps)
    expect(player(projected, A).cash).toBe(1440)
    expect(player(projected, B).cash).toBe(1560)
    expect(essentials(projected)).toEqual(essentials(state))
  })

  it('moves the pawn straight to the quarantine after Détecté !', () => {
    const start = makeState({ overrides: [{ position: 25 }] })
    const { state, steps } = stepsOfRoll(start, [2, 3])
    expect(kinds(steps)).toEqual(['dice', 'move', 'quarantine'])
    expect(steps[2]).toMatchObject({ kind: 'quarantine', playerId: A, from: 30, reason: 'detected' })
    const projected = applySteps(start, steps)
    expect(player(projected, A)).toMatchObject({ position: 10, quarantine: { failedAttempts: 0 } })
    expect(essentials(projected)).toEqual(essentials(state))
  })

  it('updates the owner of a bought square', () => {
    const start = makeState({ overrides: [{ position: 16 }], phase: { kind: 'buyDecision', squareId: 'forum' } })
    const { state, events } = act(start, { type: 'buyProperty', playerId: A })
    const steps = presentationSteps(start, events)
    expect(kinds(steps)).toEqual(['payment', 'update'])
    expect(applySteps(start, steps).ownership.forum).toEqual({ owner: A, mortgaged: false, level: 0 })
    expect(essentials(applySteps(start, steps))).toEqual(essentials(state))
  })

  it('gives the drawn decryption key to the player', () => {
    const key = cardIdByTitle('patch', 'Clé de déchiffrement')
    const start = makeState({ overrides: [{ position: 5 }], decks: { patch: [key] } })
    const { state, steps } = stepsOfRoll(start, [1, 2])
    expect(kinds(steps)).toEqual(['dice', 'move', 'card'])
    expect(player(applySteps(start, steps), A).keys).toEqual([key])
    expect(essentials(applySteps(start, steps))).toEqual(essentials(state))
  })

  it('applies the events without display to the previous step', () => {
    const start = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 } }] })
    const { steps } = stepsOfRoll(start, [1, 2])
    expect(kinds(steps)).toEqual(['dice'])
    expect(steps[0]?.events.map((e) => e.type)).toEqual(['diceRolled', 'quarantineAttemptFailed'])
  })

  it('keeps events without display in a silent step when nothing precedes them', () => {
    const start = makeState({ phase: { kind: 'postRoll', mayRollAgain: false } })
    const { events } = act(start, { type: 'endTurn', playerId: A })
    expect(kinds(presentationSteps(start, events))).toEqual(['silent'])
  })

  it('describes each step in French', () => {
    const start = makeState({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } })
    const { steps } = stepsOfRoll(start, [4, 6])
    expect(steps.flatMap((s) => s.lines)).toEqual([
      'Joueur 1 lance 4 + 6 = 10',
      'Joueur 1 avance jusqu’à Intranet',
      'Joueur 1 paie 60\u00A0Ᵽ de loyer à Joueur 2',
    ])
  })

  it('announces the result of an auction', () => {
    const start = makeState({
      phase: { kind: 'auction', squareId: 'forum', highBid: 150, highBidder: B, bidders: [A, B], nextBidder: A },
    })
    const { events } = act(start, { type: 'passBid', playerId: A })
    expect(presentationSteps(start, events).flatMap((s) => s.lines)).toContain('Joueur 2 remporte Forum pour 150\u00A0Ᵽ')
    const unsold = makeState({
      phase: { kind: 'auction', squareId: 'forum', highBid: 0, highBidder: null, bidders: [A], nextBidder: A },
    })
    const result = act(unsold, { type: 'passBid', playerId: A })
    expect(presentationSteps(unsold, result.events).flatMap((s) => s.lines)).toContain(
      'Personne n’a enchéri : Forum reste à la banque',
    )
  })
})

describe('projection', () => {
  function nextRandom(seed: number): number {
    return (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
  }

  const SQUARE_ACTIONS = ['buildBackdoor', 'sellBackdoor', 'mortgage', 'unmortgage']

  function playRandomGame(seed: number, players: number, cash: number, maxActions: number) {
    let state = makeState({ players, overrides: Array.from({ length: players }, () => ({ cash })) })
    state.rngState = seed
    let random = seed
    const checked: { before: GameState; events: GameEvent[]; after: GameState }[] = []
    for (let i = 0; i < maxActions && state.phase.kind !== 'gameOver'; i++) {
      const actions = legalActions(state)
      const flow = actions.filter((a) => !SQUARE_ACTIONS.includes(a.type))
      random = nextRandom(random)
      const pool = flow.length > 0 && random % 10 < 8 ? flow : actions
      random = nextRandom(random)
      const action = pool[random % pool.length]
      if (!action) break
      const result = applyAction(state, action)
      if (!result.ok) throw new Error(result.error.message)
      checked.push({ before: state, events: result.events, after: result.state })
      state = result.state
    }
    return checked
  }

  it('gives the same cash, positions and owners as the engine after every action of random games', () => {
    for (const seed of [7, 42, 1234]) {
      for (const { before, events, after } of playRandomGame(seed, 4, 500, 1500)) {
        expect(essentials(applySteps(before, presentationSteps(before, events)))).toEqual(essentials(after))
      }
    }
  })

  it('follows the engine up to the victory', () => {
    const game = playRandomGame(2, 2, 100, 3000)
    expect(game.at(-1)?.after.phase.kind).toBe('gameOver')
    for (const { before, events, after } of game) {
      expect(essentials(applySteps(before, presentationSteps(before, events)))).toEqual(essentials(after))
    }
  })
})
