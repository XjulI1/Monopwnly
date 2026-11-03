import { describe, expect, it } from 'vitest'
import { applyAction, cardIdByTitle, type Phase } from '../../engine'
import { A, B, makeState } from '../../engine/testUtils'
import { decide, playWhile } from './testUtils'

const KEY = cardIdByTitle('patch', 'Clé de déchiffrement')

describe('hard AI', () => {
  it('buys Boutique en ligne to keep an opponent from completing Web, even if that breaks into its reserve', () => {
    const state = makeState({
      overrides: [{ cash: 220, position: 19 }],
      ownership: { forum: { owner: B }, blog: { owner: B } },
      phase: { kind: 'buyDecision', squareId: 'online-shop' },
    })
    expect(decide(state, A, 'hard')).toEqual({ type: 'buyProperty', playerId: A })
    expect(decide(state, A, 'normal')).toEqual({ type: 'declineProperty', playerId: A })
  })

  it('declines a weak square when auctions are on and it is poorer than every opponent, to get it cheaper', () => {
    const phase: Phase = { kind: 'buyDecision', squareId: 'minitel' }
    const withAuctions = makeState({ players: 3, overrides: [{ cash: 400, position: 1 }], phase })
    const withoutAuctions = makeState({ players: 3, overrides: [{ cash: 400, position: 1 }], phase, settings: { auctions: false } })
    expect(decide(withAuctions, A, 'hard')).toEqual({ type: 'declineProperty', playerId: A })
    expect(decide(withoutAuctions, A, 'hard')).toEqual({ type: 'buyProperty', playerId: A })
  })

  it('puts three backdoors on every system of a family before starting another one', () => {
    const start = makeState({
      overrides: [{ cash: 5000 }],
      ownership: {
        minitel: { owner: A, level: 1 },
        'modem-56k': { owner: A, level: 1 },
        'state-mainframe': { owner: A },
        'ai-kernel': { owner: A },
      },
    })
    const { actions } = playWhile(start, A, 'hard', (a) => a.type === 'buildBackdoor')
    const firstCore = actions.findIndex((a) => a.type === 'buildBackdoor' && (a.squareId === 'state-mainframe' || a.squareId === 'ai-kernel'))
    expect(firstCore).toBe(4)
  })

  it('mortgages an isolated square to afford a backdoor on a complete family', () => {
    const state = makeState({
      overrides: [{ cash: 60 }],
      ownership: { minitel: { owner: A }, 'modem-56k': { owner: A }, satellite: { owner: A } },
    })
    expect(decide(state, A, 'hard')).toEqual({ type: 'mortgage', playerId: A, squareId: 'satellite' })
    expect(decide(state, A, 'normal')).toEqual({ type: 'rollDice', playerId: A })
  })

  it('mortgages the square with the lowest expected rent first and keeps the other one', () => {
    const phase: Phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 25, reason: 'rent' }], resume: { kind: 'postRoll' } }
    const start = makeState({ overrides: [{ cash: 0 }], ownership: { minitel: { owner: A }, satellite: { owner: A } }, phase })
    const { actions, state, next } = playWhile(start, A, 'hard', (a) => a.type === 'mortgage')
    expect(actions).toEqual([{ type: 'mortgage', playerId: A, squareId: 'minitel' }])
    expect(next).toEqual({ type: 'payDebt', playerId: A })
    expect(state.ownership.satellite?.mortgaged).toBe(false)
    expect(applyAction(state, next).ok).toBe(true)
  })

  it('stays in quarantine early in the game when a dangerous zone lies ahead', () => {
    const state = makeState({
      overrides: [{ position: 10, quarantine: { failedAttempts: 0 }, keys: [KEY] }],
      ownership: { forum: { owner: B, level: 5 }, blog: { owner: B, level: 5 }, 'online-shop': { owner: B, level: 5 } },
    })
    expect(decide(state, A, 'hard')).toEqual({ type: 'rollDice', playerId: A })
    expect(decide(state, A, 'normal')).toEqual({ type: 'useDecryptionKey', playerId: A })
  })
})
