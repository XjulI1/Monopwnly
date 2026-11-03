import { describe, expect, it } from 'vitest'
import { A, B, act, makeState } from '../engine/testUtils'
import { spotlightPlayer } from './spotlight'

describe('spotlightPlayer', () => {
  it('is the player whose turn it is during the game', () => {
    expect(spotlightPlayer(makeState({ players: 3, current: 1 }))?.id).toBe(B)
  })

  it('is the winner once the game is over, not the player who went bankrupt last', () => {
    const start = makeState({
      overrides: [{ cash: 10 }],
      phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const over = act(start, { type: 'declareBankruptcy', playerId: A }).state
    expect(over.players[over.currentPlayerIndex]?.id).toBe(A)
    expect(spotlightPlayer(over)?.id).toBe(B)
  })
})
