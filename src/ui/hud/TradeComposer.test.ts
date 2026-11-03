import { afterEach, describe, expect, it } from 'vitest'
import { squareById, type GameState } from '../../engine'
import { A, B, C, makeState } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import TradeComposer from './TradeComposer.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

function composing(state: GameState) {
  const mounted = mountWithSession(TradeComposer, state)
  mounted.session.send({ kind: 'button', id: 'trade' })
  return mounted
}

const start = () =>
  makeState({
    players: 3,
    overrides: [{ cash: 120 }],
    ownership: {
      forum: { owner: A, level: 1 },
      blog: { owner: A },
      'online-shop': { owner: A },
      minitel: { owner: A, mortgaged: true },
      'modem-56k': { owner: B },
      satellite: { owner: C },
    },
  })

describe('TradeComposer', () => {
  it('stays closed until the player asks to trade', () => {
    const { wrapper } = mountWithSession(TradeComposer, start())
    expect(wrapper.find('[data-test="trade-composer"]').exists()).toBe(false)
  })

  it('lets the player choose a partner, whose squares then show in the second column', async () => {
    const { wrapper } = composing(start())
    await wrapper.vm.$nextTick()
    const partners = wrapper.findAll('[data-test="trade-partner"]')
    expect(partners.map((p) => p.text())).toEqual(['Joueur 2', 'Joueur 3'])
    expect(partners[0]?.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('[data-test="receive-column"]').text()).toContain('Modem 56k')
    await partners[1]?.trigger('click')
    expect(wrapper.get('[data-test="receive-column"]').text()).toContain('Satellite')
    expect(wrapper.get('[data-test="receive-column"]').text()).not.toContain('Modem 56k')
  })

  it('greys out the systems of a built family with the reason, and flags a mortgaged square', async () => {
    const { wrapper } = composing(start())
    await wrapper.vm.$nextTick()
    const squares = wrapper.findAll('[data-test="give-column"] [data-test="trade-square"]')
    const forum = squares.find((s) => s.text().includes('Forum'))
    const blog = squares.find((s) => s.text().includes('Blog'))
    expect(forum?.attributes('disabled')).toBeDefined()
    expect(forum?.text()).toContain('famille construite')
    expect(blog?.attributes('disabled')).toBeDefined()
    expect(squares.find((s) => s.text().includes('Minitel'))?.text()).toContain('en veille')
  })

  it('raises the PwnCoins by steps of 10 up to the cash of the side that pays', async () => {
    const { wrapper } = composing(start())
    await wrapper.vm.$nextTick()
    const plus = wrapper.get('[data-test="give-cash-plus"]')
    for (let i = 0; i < 15; i++) await plus.trigger('click')
    expect(wrapper.get('[data-test="give-cash"]').text()).toBe('120 Ᵽ')
    expect(plus.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="give-cash-minus"]').trigger('click')
    expect(wrapper.get('[data-test="give-cash"]').text()).toBe('110 Ᵽ')
  })

  it('only offers to propose a valid offer', async () => {
    const { wrapper } = composing(start())
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="trade-propose"]').attributes('disabled')).toBeDefined()
    await wrapper.findAll('[data-test="receive-column"] [data-test="trade-square"]')[0]?.trigger('click')
    expect(wrapper.get('[data-test="trade-propose"]').attributes('disabled')).toBeUndefined()
  })

  it('shows the selected squares on the board', async () => {
    const { wrapper, session } = composing(start())
    await wrapper.vm.$nextTick()
    await wrapper.findAll('[data-test="give-column"] [data-test="trade-square"]').find((s) => s.text().includes('Minitel'))?.trigger('click')
    expect(session.view.value.highlights[squareById('minitel').index]).toBe('selected')
  })

  it('closes without proposing anything', async () => {
    const { wrapper, session } = composing(start())
    await wrapper.vm.$nextTick()
    const before = session.engineState.value
    await wrapper.get('[data-test="trade-close"]').trigger('click')
    expect(wrapper.find('[data-test="trade-composer"]').exists()).toBe(false)
    expect(session.engineState.value).toBe(before)
  })

  it('sends the offer to the engine and closes', async () => {
    const { wrapper, session } = composing(start())
    await wrapper.vm.$nextTick()
    await wrapper.findAll('[data-test="give-column"] [data-test="trade-square"]').find((s) => s.text().includes('Minitel'))?.trigger('click')
    await wrapper.findAll('[data-test="receive-column"] [data-test="trade-square"]').find((s) => s.text().includes('Modem 56k'))?.trigger('click')
    await wrapper.get('[data-test="trade-propose"]').trigger('click')
    expect(session.engineState.value.phase).toMatchObject({
      kind: 'tradeOffer',
      offer: { from: A, to: B, give: { squares: ['minitel'], cash: 0, keys: [] }, receive: { squares: ['modem-56k'], cash: 0, keys: [] } },
    })
    expect(wrapper.find('[data-test="trade-composer"]').exists()).toBe(false)
  })
})
