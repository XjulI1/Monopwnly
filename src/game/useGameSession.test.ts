import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseAction } from '../ai'
import type { DecisionRequest } from '../ai/workerProtocol'
import { cardIdByTitle, type Action } from '../engine'
import { A, B, C, forceDice, makeState, player } from '../engine/testUtils'
import type { AiDecider } from './aiDecider'
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
    expect(player(session.displayedState.value, A).cash).toBe(1445)
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

describe('AI players', () => {
  const ai = { kind: 'ai', level: 'normal' } as const

  function deciderOf(): AiDecider & { decide: ReturnType<typeof vi.fn> } {
    return {
      decide: vi.fn((request: DecisionRequest) => Promise.resolve(chooseAction(request.view, request.playerId, request.level, request.managementLeft))),
      dispose: vi.fn(),
    }
  }

  it('asks the AI who must act and submits its action only after the pause of the speed', async () => {
    const start = forceDice(makeState({ overrides: [{ controller: ai }] }), [[2, 4]])
    const decider = deciderOf()
    const session = useGameSession(start, { speed: 'normal', ai: decider })
    await vi.advanceTimersByTimeAsync(500)
    expect(decider.decide).toHaveBeenCalledWith(expect.objectContaining({ playerId: A, level: 'normal' }))
    expect(session.engineState.value).toBe(start)
    await vi.advanceTimersByTimeAsync(100)
    expect(session.engineState.value).not.toBe(start)
    expect(session.isPresenting.value).toBe(true)
    await vi.runAllTimersAsync()
    const end = session.engineState.value
    expect(end.ownership['wifi-bulb']?.owner).toBe(A)
    expect(end.players[end.currentPlayerIndex]?.id).toBe(B)
    expect(end.phase.kind).toBe('preRoll')
    expect(session.displayedState.value).toBe(end)
  })

  it('waits for the presentation of the previous action before asking again', async () => {
    const start = forceDice(makeState({ overrides: [{ controller: ai }] }), [[2, 4]])
    const decider = deciderOf()
    const session = useGameSession(start, { speed: 'normal', ai: decider })
    await vi.advanceTimersByTimeAsync(600)
    expect(decider.decide).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(500)
    expect(session.isPresenting.value).toBe(true)
    expect(decider.decide).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(500)
    expect(session.isPresenting.value).toBe(false)
    expect(decider.decide).toHaveBeenCalledTimes(2)
  })

  it('chains the actions of an AI without any delay at instant speed', async () => {
    const start = forceDice(makeState({ overrides: [{ controller: ai }] }), [[2, 4]])
    const session = useGameSession(start, { speed: 'instant', ai: deciderOf() })
    const clock = Date.now()
    await vi.runAllTimersAsync()
    expect(Date.now()).toBe(clock)
    expect(session.engineState.value.players[session.engineState.value.currentPlayerIndex]?.id).toBe(B)
  })

  it('closes the card drawn by an AI by itself after the delay of the speed', async () => {
    const start = forceDice(
      makeState({ overrides: [{ position: 10, controller: ai }], decks: { exploit: [cardIdByTitle('exploit', 'Rollback')] } }),
      [[2, 3]],
    )
    const session = useGameSession(start, { speed: 'normal', ai: deciderOf() })
    let sawCard = false
    for (let elapsed = 0; elapsed < 20_000 && !sawCard; elapsed += 100) {
      await vi.advanceTimersByTimeAsync(100)
      sawCard = session.currentStep.value?.kind === 'card'
    }
    expect(sawCard).toBe(true)
    await vi.advanceTimersByTimeAsync(2400)
    expect(session.currentStep.value?.kind).not.toBe('card')
  })

  it('lets the AIs bid one after the other once the human has passed', async () => {
    const start = forceDice(makeState({ players: 3, overrides: [{}, { controller: ai }, { controller: ai }] }), [[1, 2]])
    const decider = deciderOf()
    const session = useGameSession(start, { speed: 'fast', ai: decider })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.runAllTimersAsync()
    session.dispatch({ type: 'declineProperty', playerId: A })
    await vi.runAllTimersAsync()
    expect(session.engineState.value.phase).toMatchObject({ kind: 'auction', nextBidder: A })
    expect(decider.decide).not.toHaveBeenCalled()
    session.dispatch({ type: 'passBid', playerId: A })
    await vi.runAllTimersAsync()
    const bidders = decider.decide.mock.calls.map(([request]) => (request as DecisionRequest).playerId)
    expect(new Set(bidders)).toEqual(new Set([B, C]))
    expect(session.engineState.value.phase.kind).toBe('postRoll')
    expect([B, C]).toContain(session.engineState.value.ownership['modem-56k']?.owner)
  })

  it('settles the debt of an AI out of its turn', async () => {
    const start = forceDice(
      makeState({
        overrides: [{ position: 5 }, { cash: 5, controller: ai }],
        ownership: { blog: { owner: B } },
        decks: { patch: [cardIdByTitle('patch', 'Serveur de jeu partagé')] },
      }),
      [[1, 2]],
    )
    const session = useGameSession(start, { speed: 'fast', ai: deciderOf() })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.runAllTimersAsync()
    session.dismissCard()
    await vi.runAllTimersAsync()
    const end = session.engineState.value
    expect(end.phase.kind).toBe('postRoll')
    expect(player(end, A).cash).toBe(1510)
    expect(end.ownership.blog?.mortgaged).toBe(true)
  })

  it('ignores an answer that arrives after the game was quit and leaves no timer behind', async () => {
    let answer: (action: Action) => void = () => undefined
    const decider: AiDecider = { decide: () => new Promise((resolve) => (answer = resolve)), dispose: vi.fn() }
    const start = makeState({ overrides: [{ controller: ai }] })
    const session = useGameSession(start, { speed: 'normal', ai: decider })
    await vi.advanceTimersByTimeAsync(0)
    session.dispose()
    answer({ type: 'rollDice', playerId: A })
    await vi.advanceTimersByTimeAsync(5000)
    expect(session.engineState.value).toBe(start)
    expect(vi.getTimerCount()).toBe(0)
  })
})
