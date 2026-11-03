import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cardIdByTitle } from '../engine'
import { A, B, forceDice, makeState, player } from '../engine/testUtils'
import { useGameSession, type BoardHandle } from './useGameSession'

function fakeBoard(): BoardHandle & { animateMove: ReturnType<typeof vi.fn> } {
  return { animateMove: vi.fn(() => Promise.resolve()) }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('dispatch', () => {
  it('updates the engine state at once and the displayed state at the end of the presentation', async () => {
    const session = useGameSession(forceDice(makeState(), [[2, 4]]), { speed: 'normal' })
    expect(session.dispatch({ type: 'rollDice', playerId: A })).toBe(true)
    expect(player(session.engineState.value, A).position).toBe(6)
    expect(player(session.displayedState.value, A).position).toBe(0)
    expect(session.isPresenting.value).toBe(true)
    await vi.runAllTimersAsync()
    expect(session.isPresenting.value).toBe(false)
    expect(session.displayedState.value).toBe(session.engineState.value)
  })

  it('updates the displayed state step by step', async () => {
    const start = forceDice(makeState({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } }), [[4, 6]])
    const session = useGameSession(start, { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.advanceTimersByTimeAsync(1000)
    expect(session.currentStep.value?.kind).toBe('payment')
    expect(player(session.displayedState.value, A)).toMatchObject({ position: 14, cash: 1500 })
    await vi.runAllTimersAsync()
    expect(player(session.displayedState.value, A).cash).toBe(1440)
  })

  it('ignores inputs during the presentation', async () => {
    const session = useGameSession(forceDice(makeState(), [[2, 4]]), { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    const engine = session.engineState.value
    expect(session.dispatch({ type: 'buyProperty', playerId: A })).toBe(false)
    session.send({ kind: 'square', index: 6 })
    expect(session.engineState.value).toBe(engine)
    expect(session.interaction.value.sheet).toBeNull()
    expect(session.view.value.buttons.every((b) => !b.enabled)).toBe(true)
    await vi.runAllTimersAsync()
    expect(session.view.value.buttons.find((b) => b.id === 'buy')?.enabled).toBe(true)
  })

  it('realigns the displayed state at once when the animation is skipped', async () => {
    const session = useGameSession(forceDice(makeState({ overrides: [{ position: 36 }] }), [[3, 4]]), { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    session.skip()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.isPresenting.value).toBe(false)
    expect(session.dice.value).toBeNull()
    expect(session.displayedState.value).toBe(session.engineState.value)
    expect(session.feed.value.map((l) => l.text)).toContain('Joueur 1 passe par Boot : +200\u00A0Ᵽ')
  })

  it('shows the engine message and keeps the state when the action is rejected', () => {
    const start = makeState()
    const session = useGameSession(start, { speed: 'normal' })
    expect(session.dispatch({ type: 'endTurn', playerId: A })).toBe(false)
    expect(session.toast.value?.message).toBe('Cette action n’est pas possible maintenant.')
    expect(session.engineState.value).toBe(start)
    expect(session.displayedState.value).toBe(start)
    expect(session.isPresenting.value).toBe(false)
  })
})

describe('board animation', () => {
  it('hops the pawn along the squares of the move at the chosen speed', async () => {
    const board = fakeBoard()
    const session = useGameSession(forceDice(makeState(), [[2, 4]]), { speed: 'fast', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.runAllTimersAsync()
    expect(board.animateMove).toHaveBeenCalledWith(A, [0, 1, 2, 3, 4, 5, 6], 110)
  })

  it('moves the pawn straight to the quarantine', async () => {
    const board = fakeBoard()
    const session = useGameSession(forceDice(makeState({ overrides: [{ position: 25 }] }), [[2, 3]]), { speed: 'normal', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.runAllTimersAsync()
    expect(board.animateMove).toHaveBeenLastCalledWith(A, [30, 10], expect.any(Number))
  })

  it('plays nothing at instant speed and sums the action up in the feed', () => {
    const board = fakeBoard()
    const session = useGameSession(forceDice(makeState(), [[2, 4]]), { speed: 'instant', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    expect(board.animateMove).not.toHaveBeenCalled()
    expect(session.isPresenting.value).toBe(false)
    expect(player(session.displayedState.value, A).position).toBe(6)
    expect(session.feed.value.map((l) => l.text)).toEqual(['Joueur 1 lance 2 + 4 = 6', 'Joueur 1 avance jusqu’à Ampoule Wi‑Fi'])
  })

})

describe('drawn card', () => {
  const ROLLBACK_LINE = 'Joueur 1 pioche la carte Exploit «\u00A0Rollback\u00A0» : Reculez de 3 cases.'

  function rollOntoRollback() {
    return forceDice(makeState({ overrides: [{ position: 10 }], decks: { exploit: [cardIdByTitle('exploit', 'Rollback')] } }), [[2, 3]])
  }

  it('stays on screen until the player touches it', async () => {
    const session = useGameSession(rollOntoRollback(), { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(session.currentStep.value?.kind).toBe('card')
    expect(player(session.displayedState.value, A).position).toBe(15)
    session.dismissCard()
    await vi.runAllTimersAsync()
    expect(session.isPresenting.value).toBe(false)
    expect(player(session.displayedState.value, A).position).toBe(12)
  })

  it('is written in the feed as soon as it shows', async () => {
    const session = useGameSession(rollOntoRollback(), { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(session.feed.value.at(-1)?.text).toBe(ROLLBACK_LINE)
  })

  it('still shows when the animation is skipped, then the rest of the action is skipped too', async () => {
    const board = fakeBoard()
    const session = useGameSession(rollOntoRollback(), { speed: 'normal', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    session.skip()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.currentStep.value?.kind).toBe('card')
    expect(player(session.displayedState.value, A).position).toBe(15)
    session.dismissCard()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.isPresenting.value).toBe(false)
    expect(player(session.displayedState.value, A).position).toBe(12)
    expect(board.animateMove).not.toHaveBeenCalled()
  })

  it('is closed by a touch outside of it, which skips the rest of the action', async () => {
    const board = fakeBoard()
    const session = useGameSession(rollOntoRollback(), { speed: 'normal', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.advanceTimersByTimeAsync(60_000)
    board.animateMove.mockClear()
    session.skip()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.isPresenting.value).toBe(false)
    expect(player(session.displayedState.value, A).position).toBe(12)
    expect(board.animateMove).not.toHaveBeenCalled()
  })

  it('still shows at instant speed, with nothing else played', async () => {
    const board = fakeBoard()
    const session = useGameSession(rollOntoRollback(), { speed: 'instant', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    expect(session.currentStep.value?.kind).toBe('card')
    expect(session.dice.value).toBeNull()
    expect(player(session.displayedState.value, A).position).toBe(15)
    session.dismissCard()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.isPresenting.value).toBe(false)
    expect(player(session.displayedState.value, A).position).toBe(12)
    expect(board.animateMove).not.toHaveBeenCalled()
    expect(session.feed.value.map((l) => l.text)).toContain(ROLLBACK_LINE)
  })
})

describe('speed', () => {
  it('remembers the chosen speed', () => {
    const session = useGameSession(makeState(), { speed: 'normal' })
    session.setSpeed('fast')
    expect(session.speed.value).toBe('fast')
    expect(useGameSession(makeState()).speed.value).toBe('fast')
    localStorage.clear()
  })
})
