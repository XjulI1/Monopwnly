import { afterEach, describe, expect, it } from 'vitest'
import type { GameSettings } from '../../engine'
import { makeState } from '../../engine/testUtils'
import { HOUSE_RULES } from '../../game/gameOptions'
import { formatPwn } from '../../game/format'
import { mountWithSession } from '../testUtils'
import StatusBar from './StatusBar.vue'

function statusBar(settings: Partial<GameSettings>, turnNumber = 1, dmzPot = 0) {
  const state = makeState({ settings })
  state.turnNumber = turnNumber
  state.dmzPot = dmzPot
  return mountWithSession(StatusBar, state).wrapper
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('StatusBar', () => {
  it('shows one badge per active house rule, with the rule as tooltip', () => {
    const wrapper = statusBar({ dmzJackpot: true, freeBuilding: true })
    const badges = wrapper.findAll('[data-test="rule-badge"]')
    expect(badges.map((b) => b.text())).toEqual(['Cagnotte', 'Construction libre'])
    expect(badges.map((b) => b.attributes('title'))).toEqual(
      HOUSE_RULES.filter(({ rule }) => rule === 'dmzJackpot' || rule === 'freeBuilding').map(({ help }) => help),
    )
  })

  it('shows no badge without a house rule, even with a turn limit', () => {
    const wrapper = statusBar({ turnLimit: 30 })
    expect(wrapper.findAll('[data-test="rule-badge"]')).toHaveLength(0)
    expect(wrapper.get('[data-test="turn-counter"]').text()).toBe('Tour 1 / 30')
  })

  it('shows the round out of the turn limit', () => {
    expect(statusBar({ turnLimit: 30 }, 12).get('[data-test="turn-counter"]').text()).toBe('Tour 12 / 30')
    expect(statusBar({}, 12).get('[data-test="turn-counter"]').text()).toBe('Tour 12')
  })

  it('shows the DMZ pot only with the option', () => {
    expect(statusBar({ dmzJackpot: true }, 1, 300).get('[data-test="pot"]').text()).toContain(formatPwn(300))
    expect(statusBar({}, 1, 0).find('[data-test="pot"]').exists()).toBe(false)
  })
})
