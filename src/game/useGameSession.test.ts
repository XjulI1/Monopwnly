import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chooseAction } from '../ai'
import type { DecisionRequest } from '../ai/workerProtocol'
import { cardIdByTitle, type Action, type GameState } from '../engine'
import { A, B, C, forceDice, makeState, player } from '../engine/testUtils'
import type { AiDecider } from './aiDecider'
import { startJournal } from './history/journal'
import { startStatistics } from './history/statistics'
import type { GameRecord } from './savedGame'
import { useGameSession, type BoardHandle, type GameSession } from './useGameSession'

function fakeBoard(): BoardHandle & { animateMove: ReturnType<typeof vi.fn> } {
  return { animateMove: vi.fn(() => Promise.resolve()) }
}

function visibleJournal(session: GameSession): string[] {
  return session.journal.value.slice(0, session.journalShown.value).map((entry) => entry.text)
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
    expect(session.journalShown.value).toBe(session.journal.value.length)
    expect(session.journal.value.at(-1)?.details.map((d) => d.text)).toEqual(['Joueur 1 passe par Boot et reçoit 200\u00A0Ᵽ'])
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

  it('plays nothing at instant speed and sums the action up in the journal', () => {
    const board = fakeBoard()
    const session = useGameSession(forceDice(makeState(), [[2, 4]]), { speed: 'instant', board })
    session.dispatch({ type: 'rollDice', playerId: A })
    expect(board.animateMove).not.toHaveBeenCalled()
    expect(session.isPresenting.value).toBe(false)
    expect(player(session.displayedState.value, A).position).toBe(6)
    expect(visibleJournal(session)).toEqual(['Tour 1 — Joueur 1', 'Joueur 1 lance 2 et 4 et avance sur Ampoule Wi‑Fi'])
  })

})

describe('drawn card', () => {
  const ROLLBACK_LINE = 'Joueur 1 pioche Exploit : Rollback — recule sur Messagerie pro'

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

  it('shows in the journal once the card and its move are presented', async () => {
    const session = useGameSession(rollOntoRollback(), { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(session.journal.value.at(-1)?.text).toBe(ROLLBACK_LINE)
    expect(visibleJournal(session)).toEqual(['Tour 1 — Joueur 1', 'Joueur 1 lance 2 et 3 et avance sur Exploit'])
    session.dismissCard()
    await vi.runAllTimersAsync()
    expect(visibleJournal(session).at(-1)).toBe(ROLLBACK_LINE)
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
    expect(visibleJournal(session)).toContain(ROLLBACK_LINE)
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

describe('journal and statistics', () => {
  function slowBoard(): BoardHandle {
    return { animateMove: (_, squares, ms) => new Promise((resolve) => setTimeout(resolve, squares.length * ms)) }
  }

  it('files each entry under the round in which it happened', async () => {
    const start = makeState({ current: 1, phase: { kind: 'postRoll', mayRollAgain: false } })
    const session = useGameSession(start, { speed: 'normal' })
    session.dispatch({ type: 'endTurn', playerId: B })
    await vi.runAllTimersAsync()
    expect(session.journal.value.at(-1)).toMatchObject({ kind: 'turn', text: 'Tour 2 — Joueur 1', turn: 2 })
  })

  it('records each action in the journal and the statistics as soon as the engine accepts it', () => {
    const start = forceDice(makeState({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } }), [[4, 6]])
    const session = useGameSession(start, { speed: 'normal' })
    session.dispatch({ type: 'rollDice', playerId: A })
    expect(session.journal.value.map((entry) => entry.text)).toEqual([
      'Tour 1 — Joueur 1',
      'Joueur 1 lance 4 et 6 et avance sur Intranet',
      'Joueur 1 paie 55\u00A0Ᵽ de loyer à Joueur 2 pour Intranet',
    ])
    expect(session.statistics.value.players[A]?.rentPaid).toBe(55)
    expect(session.statistics.value.squareRents.intranet).toBe(55)
  })

  it('keeps an entry hidden until its presentation step is over', async () => {
    const start = forceDice(makeState({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } }), [[4, 6]])
    const session = useGameSession(start, { speed: 'normal', board: slowBoard() })
    session.dispatch({ type: 'rollDice', playerId: A })
    expect(visibleJournal(session)).toEqual(['Tour 1 — Joueur 1'])
    await vi.advanceTimersByTimeAsync(1000)
    expect(session.currentStep.value?.kind).toBe('move')
    expect(visibleJournal(session)).toEqual(['Tour 1 — Joueur 1'])
    await vi.advanceTimersByTimeAsync(11 * 200)
    expect(session.currentStep.value?.kind).toBe('payment')
    expect(visibleJournal(session)).toHaveLength(2)
    await vi.runAllTimersAsync()
    expect(visibleJournal(session)).toHaveLength(3)
  })

  it('shows every pending entry at once when the animation is skipped', async () => {
    const start = forceDice(makeState({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } }), [[4, 6]])
    const session = useGameSession(start, { speed: 'normal', board: slowBoard() })
    session.dispatch({ type: 'rollDice', playerId: A })
    session.skip()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.journalShown.value).toBe(3)
  })
})

describe('saving', () => {
  const ai = { kind: 'ai', level: 'normal' } as const

  function aiDecider(): AiDecider {
    return {
      decide: (request: DecisionRequest) => Promise.resolve(chooseAction(request.view, request.playerId, request.level, request.managementLeft)),
      dispose: () => undefined,
    }
  }

  it('saves a new game at once, then after each action of a human, with the engine truth', async () => {
    const save = vi.fn<(record: GameRecord) => boolean>(() => true)
    const session = useGameSession(forceDice(makeState({ overrides: [{ position: 12 }] }), [[2, 2]]), { speed: 'normal', save })
    expect(save).toHaveBeenCalledTimes(1)
    session.dispatch({ type: 'rollDice', playerId: A })
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith({
      engineState: session.engineState.value,
      journal: session.journal.value,
      statistics: session.statistics.value,
    })
    await vi.runAllTimersAsync()
    session.dispatch({ type: 'buyProperty', playerId: A })
    expect(save).toHaveBeenCalledTimes(3)
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({ engineState: { ownership: { forum: { owner: A } } } })
  })

  it('groups the writes of a burst of AI bids into one', async () => {
    const start = forceDice(makeState({ players: 3, overrides: [{}, { controller: ai }, { controller: ai }] }), [[1, 2]])
    const save = vi.fn<(record: GameRecord) => boolean>(() => true)
    const session = useGameSession(start, { speed: 'fast', ai: aiDecider(), save })
    session.dispatch({ type: 'rollDice', playerId: A })
    await vi.runAllTimersAsync()
    session.dispatch({ type: 'declineProperty', playerId: A })
    await vi.runAllTimersAsync()
    save.mockClear()
    session.dispatch({ type: 'passBid', playerId: A })
    await vi.runAllTimersAsync()
    const end = session.engineState.value
    expect(end.phase.kind).toBe('postRoll')
    expect(session.journal.value.at(-1)?.details.length).toBeGreaterThan(2)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({ engineState: end })
  })

  it('saves the actions of an AI at the latest when its burst ends with an animation', async () => {
    const start = forceDice(makeState({ overrides: [{ controller: ai }] }), [[2, 4]])
    const save = vi.fn<(record: GameRecord) => boolean>(() => true)
    const session = useGameSession(start, { speed: 'normal', ai: aiDecider(), save })
    save.mockClear()
    await vi.advanceTimersByTimeAsync(600)
    expect(session.engineState.value).not.toBe(start)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0]?.[0]).toMatchObject({ engineState: session.engineState.value })
  })

  it('keeps the backdoor built by an AI for the end of its burst, and writes it when the game is left', async () => {
    const start = makeState({ overrides: [{ controller: ai }], ownership: { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: A } } })
    const build: Action = { type: 'buildBackdoor', playerId: A, squareId: 'forum' }
    const decider: AiDecider = {
      decide: vi.fn().mockResolvedValueOnce(build).mockReturnValue(new Promise(() => undefined)),
      dispose: () => undefined,
    }
    const save = vi.fn<(record: GameRecord) => boolean>(() => true)
    const session = useGameSession(start, { speed: 'normal', ai: decider, save })
    await vi.advanceTimersByTimeAsync(5000)
    expect(session.engineState.value.ownership.forum?.level).toBe(1)
    expect(save).toHaveBeenCalledTimes(1)
    session.dispose()
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls.at(-1)?.[0]).toMatchObject({ engineState: { ownership: { forum: { level: 1 } } } })
  })

  it('warns once when the game cannot be saved, and goes on', async () => {
    const save = vi.fn<(record: GameRecord) => boolean>(() => false)
    const session = useGameSession(forceDice(makeState({ overrides: [{ position: 12 }] }), [[2, 2]]), { speed: 'instant', save })
    expect(session.toast.value?.message).toBe('La partie ne peut pas être sauvegardée sur cet appareil')
    session.dismissToast()
    session.dispatch({ type: 'rollDice', playerId: A })
    session.dispatch({ type: 'buyProperty', playerId: A })
    await vi.runAllTimersAsync()
    expect(save).toHaveBeenCalledTimes(3)
    expect(session.toast.value).toBeNull()
    expect(session.engineState.value.ownership.forum?.owner).toBe(A)
  })
})

describe('resuming', () => {
  const ai = { kind: 'ai', level: 'normal' } as const

  function historyOf(state: GameState) {
    return { journal: startJournal(state), statistics: startStatistics(state) }
  }

  it('restores the journal and the statistics, shows the state without animation and does not save again', () => {
    const state = makeState({ overrides: [{ position: 9 }], phase: { kind: 'buyDecision', squareId: 'ip-camera' } })
    const history = historyOf(state)
    const save = vi.fn<(record: GameRecord) => boolean>(() => true)
    const session = useGameSession(state, { speed: 'normal', history, save })
    expect(session.journal.value).toBe(history.journal)
    expect(session.journalShown.value).toBe(history.journal.length)
    expect(session.statistics.value).toBe(history.statistics)
    expect(session.displayedState.value).toBe(state)
    expect(session.isPresenting.value).toBe(false)
    expect(session.view.value.buttons.find((b) => b.id === 'buy')?.enabled).toBe(true)
    expect(save).not.toHaveBeenCalled()
  })

  it('offers the auction again with its highest bid and the next bidder', () => {
    const state = makeState({
      players: 3,
      phase: { kind: 'auction', squareId: 'tor-node', highBid: 120, highBidder: B, bidders: [A, B, C], nextBidder: C },
    })
    const session = useGameSession(state, { speed: 'normal', history: historyOf(state) })
    expect(session.view.value.auction).toMatchObject({ squareId: 'tor-node', highBid: 120, nextBidder: C })
  })

  it('offers the debt again with the same amount', () => {
    const state = makeState({
      overrides: [{ cash: 100 }],
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 400, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const session = useGameSession(state, { speed: 'normal', history: historyOf(state) })
    expect(session.view.value.buttons.find((b) => b.id === 'payDebt')).toMatchObject({ amount: 400, enabled: false })
  })

  it('lets the AI who must act go on by itself', async () => {
    const state = forceDice(makeState({ overrides: [{ controller: ai }] }), [[2, 4]])
    const decider = { decide: vi.fn((request: DecisionRequest) => Promise.resolve(chooseAction(request.view, request.playerId, request.level, request.managementLeft))), dispose: vi.fn() }
    const session = useGameSession(state, { speed: 'instant', ai: decider, history: historyOf(state) })
    await vi.runAllTimersAsync()
    expect(decider.decide).toHaveBeenCalled()
    expect(session.engineState.value.ownership['wifi-bulb']?.owner).toBe(A)
  })
})
