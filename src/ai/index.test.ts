import { describe, expect, it } from 'vitest'
import { AI_LEVELS, createGame, type AiLevel, type GameState, type PlayerSetup } from '../engine'
import { A, B, makeState } from '../engine/testUtils'
import { chooseAction, playUntilHumanOrEnd } from './index'
import { playWhile } from './levels/testUtils'
import { playerView } from './playerView'

const RICH_FAMILIES = {
  minitel: { owner: A },
  'modem-56k': { owner: A },
  forum: { owner: A },
  blog: { owner: A },
  'online-shop': { owner: A },
  'state-mainframe': { owner: A },
  'ai-kernel': { owner: A },
}

function aiGame(levels: AiLevel[], seed: number): GameState {
  const colors = ['red', 'blue', 'green', 'yellow', 'purple', 'cyan']
  const players: PlayerSetup[] = levels.map((level, i) => ({ id: `p${i + 1}`, name: `IA ${i + 1}`, color: colors[i] ?? 'grey', controller: { kind: 'ai', level } }))
  const created = createGame({ players, seed })
  if (!created.ok) throw new Error(created.error.code)
  return created.state
}

describe('chooseAction', () => {
  it('takes the same action whatever the order of the decks', () => {
    const first = makeState({ overrides: [{ cash: 900 }], ownership: RICH_FAMILIES })
    const second = structuredClone(first)
    second.decks.exploit.reverse()
    second.decks.patch.reverse()
    for (const level of ['easy', 'normal', 'hard'] as const) {
      expect(chooseAction(playerView(second), A, level)).toEqual(chooseAction(playerView(first), A, level))
    }
  })

  it('takes the same action twice on the same view', () => {
    const view = playerView(makeState({ ownership: RICH_FAMILIES }))
    expect(chooseAction(view, A, 'normal')).toEqual(chooseAction(view, A, 'normal'))
  })

  it('leaves the game state, generator included, untouched', () => {
    const state = makeState({ ownership: RICH_FAMILIES })
    const before = structuredClone(state)
    chooseAction(playerView(state), A, 'hard')
    expect(state).toEqual(before)
  })

  it('stops managing once the management budget of the phase is spent', () => {
    const state = makeState({ overrides: [{ cash: 5000 }], ownership: RICH_FAMILIES })
    expect(chooseAction(playerView(state), A, 'normal').type).toBe('buildBackdoor')
    expect(chooseAction(playerView(state), A, 'normal', 0)).toEqual({ type: 'rollDice', playerId: A })
  })

  it('refuses to decide for a player who is not expected to act', () => {
    expect(() => chooseAction(playerView(makeState()), B, 'normal')).toThrow()
  })
})

describe('playUntilHumanOrEnd', () => {
  it('takes at most 40 management actions in a row before moving the game on', () => {
    const more = { 'wifi-bulb': { owner: A }, 'smart-fridge': { owner: A }, 'ip-camera': { owner: A }, 'network-printer': { owner: A }, 'work-mail': { owner: A }, intranet: { owner: A } }
    const start = makeState({ overrides: [{ cash: 100_000 }], ownership: { ...RICH_FAMILIES, ...more } })
    start.players[0]!.controller = { kind: 'ai', level: 'normal' }
    let inARow = 0
    let longest = 0
    playUntilHumanOrEnd(start, {
      onAction: (action) => {
        inARow = action.type === 'buildBackdoor' ? inARow + 1 : 0
        longest = Math.max(longest, inARow)
      },
    })
    expect(longest).toBe(40)
  })

  it('stops as soon as a human must act', () => {
    const state = aiGame(['normal', 'normal'], 3)
    state.players[1]!.controller = { kind: 'human' }
    const { state: end, stop } = playUntilHumanOrEnd(state, { maxRounds: 300 })
    expect(stop).toBe('human')
    expect(end.players[end.currentPlayerIndex]?.id === 'p2' || end.phase.kind !== 'preRoll').toBe(true)
  })

  it('plays a game between AIs to the end', () => {
    const { state, stop } = playUntilHumanOrEnd(aiGame(['easy', 'normal', 'hard'], 11), { maxRounds: 300 })
    expect(stop).not.toBe('human')
    if (stop === 'gameOver') expect(state.winner).not.toBeNull()
  })
})

describe('giving up a lost game', () => {
  const lost = (phase?: GameState['phase']) =>
    makeState({
      overrides: [{ cash: 20 }, { cash: 500 }],
      ownership: {
        minitel: { owner: A },
        'cash-machine': { owner: B, level: 5 },
        neobank: { owner: B, level: 5 },
        'online-exchange': { owner: B, level: 5 },
      },
      phase,
    })

  it.each(AI_LEVELS)('declares bankruptcy at the start of its turn at the %s level', (level) => {
    expect(chooseAction(playerView(lost()), A, level)).toEqual({ type: 'declareBankruptcy', playerId: A })
  })

  it('takes the same decision twice on the same view', () => {
    const view = playerView(lost())
    expect(chooseAction(view, A, 'normal')).toEqual(chooseAction(view, A, 'normal'))
  })

  it('ends its turn instead of giving up after the roll', () => {
    expect(chooseAction(playerView(lost({ kind: 'postRoll', mayRollAgain: false })), A, 'normal')).toEqual({ type: 'endTurn', playerId: A })
  })

  it('mortgages and pays a debt it can cover instead of giving up', () => {
    const start = lost({ kind: 'debt', debtor: A, payments: [{ to: B, amount: 40, reason: 'rent' }], resume: { kind: 'postRoll' } })
    const { actions, next } = playWhile(start, A, 'normal', (action) => action.type !== 'payDebt' && action.type !== 'declareBankruptcy')
    expect(actions).toEqual([{ type: 'mortgage', playerId: A, squareId: 'minitel' }])
    expect(next).toEqual({ type: 'payDebt', playerId: A })
  })
})
