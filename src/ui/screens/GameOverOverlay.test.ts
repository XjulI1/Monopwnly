import { afterEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../engine'
import { A, B, act, makeState } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import GameOverOverlay from './GameOverOverlay.vue'

function wonByB(): GameState {
  const start = makeState({
    overrides: [{ cash: 10 }],
    phase: { kind: 'debt', debtor: A, payments: [{ to: B, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
  })
  return act(start, { type: 'declareBankruptcy', playerId: A }).state
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GameOverOverlay', () => {
  it('names the winner in their color with the final cash', () => {
    const { wrapper } = mountWithSession(GameOverOverlay, wonByB())
    const title = wrapper.get('#game-over-title')
    expect(title.text()).toBe('Joueur 2 remporte la partie')
    expect(title.attributes('style')).toContain('color: blue')
    expect(wrapper.text()).toContain('Argent final : 1\u202F510\u00A0Ᵽ')
  })

  it('offers to replay or to go back home', async () => {
    const { wrapper } = mountWithSession(GameOverOverlay, wonByB())
    await wrapper.get('[data-test="replay"]').trigger('click')
    await wrapper.get('[data-test="home"]').trigger('click')
    expect(wrapper.emitted('replay')).toHaveLength(1)
    expect(wrapper.emitted('home')).toHaveLength(1)
  })

  it('stays hidden while there is no winner', () => {
    expect(mountWithSession(GameOverOverlay, makeState()).wrapper.find('[data-test="game-over"]').exists()).toBe(false)
  })
})
