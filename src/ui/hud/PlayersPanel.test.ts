import { afterEach, describe, expect, it } from 'vitest'
import { A, B, C, makeState } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import PlayersPanel from './PlayersPanel.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

const gauge = (wrapper: ReturnType<typeof mountWithSession>['wrapper'], id: string) => wrapper.find(`[data-test="player-${id}"] [data-test="target-gauge"]`)

describe('PlayersPanel', () => {
  it('fills the gauge of each player with their share of the net worth target', () => {
    const state = makeState({
      players: 3,
      settings: { netWorthTarget: 5000 },
      overrides: [{ cash: 2000 }, { cash: 6000 }, { cash: 0, bankrupt: true }],
    })
    const { wrapper } = mountWithSession(PlayersPanel, state)
    expect(gauge(wrapper, A).attributes('aria-valuenow')).toBe('40')
    expect(gauge(wrapper, A).get('[data-test="target-gauge-fill"]').attributes('style')).toContain('width: 40%')
    expect(gauge(wrapper, B).attributes('aria-valuenow')).toBe('100')
    expect(gauge(wrapper, C).exists()).toBe(false)
  })

  it('shows no gauge without a net worth target', () => {
    const { wrapper } = mountWithSession(PlayersPanel, makeState())
    expect(wrapper.find('[data-test="target-gauge"]').exists()).toBe(false)
  })
})
