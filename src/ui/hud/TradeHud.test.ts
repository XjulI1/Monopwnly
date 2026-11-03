import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameState, Phase } from '../../engine'
import { A, B, makeState } from '../../engine/testUtils'
import { localDecider } from '../../game/aiDecider'
import { useGameSession } from '../../game/useGameSession'
import { mountOnSession, mountWithSession } from '../testUtils'
import ActionPanel from './ActionPanel.vue'
import AppToast from './AppToast.vue'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const ai = { kind: 'ai', level: 'normal' } as const

function tradeButton(state: GameState) {
  return mountWithSession(ActionPanel, state).wrapper.find('[data-button="trade"]')
}

describe('trade button of the HUD', () => {
  it('is active before the roll and tells how many proposals are left', () => {
    const button = tradeButton(makeState())
    expect(button.attributes('disabled')).toBeUndefined()
    expect(button.text()).toContain('Échanger')
    expect(button.text()).toContain('3 restantes')
  })

  it('is disabled once three proposals were made in the turn', () => {
    const state = makeState()
    state.tradeLimits.thisTurn[A] = { count: 3, partners: [B], rejected: [] }
    expect(tradeButton(state).attributes('disabled')).toBeDefined()
  })

  it('is offered during a debt', () => {
    const debt: Phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 400, reason: 'rent' }], resume: { kind: 'postRoll' } }
    expect(tradeButton(makeState({ overrides: [{ cash: 100 }], phase: debt })).exists()).toBe(true)
  })

  it('is not offered during an auction or a purchase decision', () => {
    const auction: Phase = { kind: 'auction', squareId: 'forum', highBid: 0, highBidder: null, bidders: [A, B], nextBidder: A }
    expect(tradeButton(makeState({ phase: auction })).exists()).toBe(false)
    expect(tradeButton(makeState({ phase: { kind: 'buyDecision', squareId: 'forum' } })).exists()).toBe(false)
  })
})

describe('answer of an AI to an offer of a human', () => {
  it('tells that the AI studies the offer, then whether it refuses it, and gives the commands back', async () => {
    const state = makeState({ overrides: [{}, { name: 'Nyx', controller: ai }], ownership: { satellite: { owner: B } } })
    const session = useGameSession(state, { speed: 'normal', ai: localDecider() })
    const panel = mountOnSession(ActionPanel, session)
    const toast = mountOnSession(AppToast, session)
    const offer = { from: A, to: B, give: { squares: [], cash: 50, keys: [] }, receive: { squares: ['satellite'], cash: 0, keys: [] } }
    session.dispatch({ type: 'proposeTrade', playerId: A, offer })
    await vi.advanceTimersByTimeAsync(100)
    expect(panel.get('[data-test="ai-thinking"]').text()).toBe('Nyx étudie votre offre…')
    await vi.advanceTimersByTimeAsync(1500)
    expect(session.engineState.value.phase.kind).toBe('preRoll')
    expect(toast.text()).toContain('Nyx refuse votre offre')
    expect(panel.find('[data-button="rollDice"]').exists()).toBe(true)
  })
})
