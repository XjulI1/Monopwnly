import { describe, expect, it } from 'vitest'
import { applyAction } from './index'
import { createGame } from './setup'
import { A, B, C, act, forceDice, makeState, rejectCode, roll } from './testUtils'
import type { Action, GameState } from './types'

describe('action validation', () => {
  it('rejects an action from a player other than the current one', () => {
    expect(rejectCode(makeState(), { type: 'rollDice', playerId: B })).toBe('NOT_YOUR_TURN')
  })

  it('rejects an action outside its phase', () => {
    expect(rejectCode(makeState(), { type: 'buyProperty', playerId: A })).toBe('WRONG_PHASE')
  })

  it('rejects any action once the game is over', () => {
    const state = makeState({ phase: { kind: 'gameOver' } })
    expect(rejectCode(state, { type: 'rollDice', playerId: A })).toBe('GAME_OVER')
  })

  it('returns a French message with every error', () => {
    const result = applyAction(makeState(), { type: 'rollDice', playerId: B })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message.length).toBeGreaterThan(0)
  })

  it('never modifies the input state', () => {
    const state = forceDice(makeState(), [[3, 4]])
    const snapshot = structuredClone(state)
    act(state, { type: 'rollDice', playerId: A })
    expect(state).toEqual(snapshot)
  })
})

describe('determinism and serialization', () => {
  function playSome(state: GameState, count: number): GameState {
    let current = state
    for (let i = 0; i < count; i++) {
      const phase = current.phase
      const me = current.players[current.currentPlayerIndex]?.id as string
      let action: Action
      if (phase.kind === 'preRoll') action = { type: 'rollDice', playerId: me }
      else if (phase.kind === 'postRoll') action = phase.mayRollAgain ? { type: 'rollDice', playerId: me } : { type: 'endTurn', playerId: me }
      else if (phase.kind === 'buyDecision') action = { type: 'buyProperty', playerId: me }
      else if (phase.kind === 'auction') action = { type: 'passBid', playerId: phase.nextBidder }
      else if (phase.kind === 'debt') action = { type: 'declareBankruptcy', playerId: phase.debtor }
      else break
      const result = applyAction(current, action)
      if (!result.ok) {
        const fallback = applyAction(current, { type: 'declineProperty', playerId: me })
        if (!fallback.ok) throw new Error(result.error.code)
        current = fallback.state
      } else current = result.state
    }
    return current
  }

  it('replays the same game from the same seed and actions', () => {
    const create = () => {
      const result = createGame({
        players: [
          { id: A, name: 'A', color: 'red' },
          { id: B, name: 'B', color: 'blue' },
          { id: C, name: 'C', color: 'green' },
        ],
        seed: 77,
      })
      if (!result.ok) throw new Error()
      return result.state
    }
    expect(playSome(create(), 50)).toEqual(playSome(create(), 50))
  })

  it('round-trips through JSON and continues identically', () => {
    const state = playSome(makeState({ players: 3 }), 20)
    const copy = JSON.parse(JSON.stringify(state)) as GameState
    expect(copy).toEqual(state)
    expect(playSome(copy, 20)).toEqual(playSome(state, 20))
  })
})

describe('turn flow', () => {
  it('ends in postRoll without a second roll after a simple roll', () => {
    const { state } = roll(makeState({ overrides: [{ position: 13 }] }), [3, 4])
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: false })
  })

  it('allows a second roll after a double and refuses to end the turn', () => {
    const { state } = roll(makeState({ overrides: [{ position: 16 }] }), [2, 2])
    expect(state.phase).toEqual({ kind: 'postRoll', mayRollAgain: true })
    expect(rejectCode(state, { type: 'endTurn', playerId: A })).toBe('MUST_ROLL_AGAIN')
  })

  it('passes to the next player in preRoll and resets the doubles counter', () => {
    const start = makeState({ players: 3, phase: { kind: 'postRoll', mayRollAgain: false }, doublesInARow: 0 })
    const { state, events } = act(start, { type: 'endTurn', playerId: A })
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.phase).toEqual({ kind: 'preRoll' })
    expect(state.doublesInARow).toBe(0)
    expect(events).toContainEqual({ type: 'turnStarted', playerId: B, turnNumber: 1 })
  })

  it('skips bankrupt players', () => {
    const start = makeState({ players: 3, overrides: [{}, { bankrupt: true }], phase: { kind: 'postRoll', mayRollAgain: false } })
    const { state } = act(start, { type: 'endTurn', playerId: A })
    expect(state.players[state.currentPlayerIndex]?.id).toBe(C)
  })

  it('increments the turn number after the last player in order', () => {
    const start = makeState({ players: 3, current: 2, phase: { kind: 'postRoll', mayRollAgain: false } })
    const { state } = act(start, { type: 'endTurn', playerId: C })
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.turnNumber).toBe(2)
  })
})

describe('events', () => {
  it('emits diceRolled, moved then paid when landing on an opponent system', () => {
    const start = makeState({ ownership: { 'smart-fridge': { owner: B } } })
    const { events } = roll(start, [3, 4])
    expect(events.map((e) => e.type)).toEqual(['diceRolled', 'moved', 'paid'])
  })

  it('lists the squares crossed and emits passedBoot', () => {
    const start = makeState({ overrides: [{ position: 38 }] })
    const { events } = roll(start, [2, 3])
    expect(events).toContainEqual({ type: 'moved', playerId: A, path: [39, 0, 1, 2, 3], backward: false })
    expect(events.some((e) => e.type === 'passedBoot')).toBe(true)
  })
})
