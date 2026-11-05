import { describe, expect, it } from 'vitest'
import { createGame, type AiLevel, type GameEvent, type GameState, type PlayerSetup } from '../engine'
import { playUntilHumanOrEnd } from './index'

const SEED = 7
const LINEUP: AiLevel[] = ['easy', 'normal', 'hard']
const MAX_ROUNDS = 300
const SLOW_TEST_TIMEOUT_MS = 60_000
const SNAPSHOT_FILE = './__snapshots__/noOptionGame.txt'

const ADDED_STATE_FIELDS = ['dmzPot', 'winReason', 'firstPlayerIndex']
const ADDED_SETTINGS = ['dmzJackpot', 'doubleBootBonus', 'freeBuilding', 'noRentInQuarantine', 'turnLimit', 'netWorthTarget']
const ADDED_VICTORY_FIELDS = ['reason']

type Fields = Record<string, unknown>

function omit(fields: Fields, keys: string[]): Fields {
  return Object.fromEntries(Object.entries(fields).filter(([key]) => !keys.includes(key)))
}

function comparableState(state: GameState): Fields {
  const fields = omit(state as unknown as Fields, ADDED_STATE_FIELDS)
  return { ...fields, settings: omit(state.settings as unknown as Fields, ADDED_SETTINGS) }
}

function comparableEvent(event: GameEvent): Fields {
  const fields = event as unknown as Fields
  if (event.type === 'gameWon') return omit(fields, ADDED_VICTORY_FIELDS)
  if ((event.type === 'tradeAccepted' || event.type === 'tradeRejected') && event.original === null) return omit(fields, ['original'])
  return fields
}

function aiGame(): GameState {
  const players: PlayerSetup[] = LINEUP.map((level, i) => ({
    id: `p${i + 1}`,
    name: `IA ${i + 1}`,
    color: `color-${i}`,
    controller: { kind: 'ai', level },
  }))
  const created = createGame({ players, seed: SEED })
  if (!created.ok) throw new Error(created.error.code)
  return created.state
}

describe('game without any option', () => {
  it('plays the same events and reaches the same final state as the recorded reference game', async () => {
    const events: GameEvent[] = []
    const { state, stop } = playUntilHumanOrEnd(aiGame(), {
      maxRounds: MAX_ROUNDS,
      onAction: (_action, produced) => events.push(...produced),
    })
    expect(stop).toBe('gameOver')
    const lines = [
      JSON.stringify(comparableState(state), null, 2),
      ...events.map((event) => JSON.stringify(comparableEvent(event))),
    ]
    await expect(`${lines.join('\n')}\n`).toMatchFileSnapshot(SNAPSHOT_FILE)
  }, SLOW_TEST_TIMEOUT_MS)
})
