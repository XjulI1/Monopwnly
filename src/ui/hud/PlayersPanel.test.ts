import { afterEach, describe, expect, it } from 'vitest'
import { A, B, C, makeState } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import PlayersPanel from './PlayersPanel.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

type Wrapper = ReturnType<typeof mountWithSession>['wrapper']

const gauge = (wrapper: Wrapper, id: string) => wrapper.find(`[data-test="player-${id}"] [data-test="target-gauge"]`)
const toggle = (wrapper: Wrapper, id: string) => wrapper.find(`[data-test="player-${id}"] [data-test="properties-toggle"]`)
const chips = (wrapper: Wrapper, id: string) => wrapper.findAll(`[data-test="player-${id}"] [data-test="chip"]`)

const ownerOfThree = () =>
  makeState({
    players: 3,
    ownership: { forum: { owner: A }, blog: { owner: A }, satellite: { owner: A }, 'online-shop': { owner: B } },
  })

describe('PlayersPanel', () => {
  it('hides the properties of every player by default and gives their count', () => {
    const { wrapper } = mountWithSession(PlayersPanel, ownerOfThree())
    expect(wrapper.find('[data-test="chip"]').exists()).toBe(false)
    expect(toggle(wrapper, A).text()).toBe('3 biens')
    expect(toggle(wrapper, A).attributes('aria-expanded')).toBe('false')
    expect(toggle(wrapper, B).text()).toBe('1 bien')
  })

  it('shows the properties of a player only, then hides them again', async () => {
    const { wrapper } = mountWithSession(PlayersPanel, ownerOfThree())
    await toggle(wrapper, A).trigger('click')
    expect(chips(wrapper, A)).toHaveLength(3)
    expect(chips(wrapper, B)).toHaveLength(0)
    expect(toggle(wrapper, A).attributes('aria-expanded')).toBe('true')
    await toggle(wrapper, A).trigger('click')
    expect(chips(wrapper, A)).toHaveLength(0)
  })

  it('opens the sheet of a shown property', async () => {
    const { wrapper, session } = mountWithSession(PlayersPanel, ownerOfThree())
    await toggle(wrapper, B).trigger('click')
    await chips(wrapper, B)[0]?.trigger('click')
    expect(session.view.value.sheet?.squareId).toBe('online-shop')
  })

  it('offers no toggle to a player without property', () => {
    const { wrapper } = mountWithSession(PlayersPanel, ownerOfThree())
    expect(toggle(wrapper, C).exists()).toBe(false)
  })

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
