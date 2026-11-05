import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { cardIdByTitle } from '../../engine'
import { A, B, makeState } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import ActionPanel from './ActionPanel.vue'
import CardReveal from './CardReveal.vue'
import TradeComposer from './TradeComposer.vue'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

describe('keys shown next to the actions', () => {
  it('names the key of each turn action and declares it to assistive technologies', () => {
    const { wrapper } = mountWithSession(ActionPanel, makeState({ ownership: { minitel: { owner: A } } }))
    const buttons = wrapper.findAll('[data-button]')
    expect(buttons.map((b) => b.find('span').text())).toEqual(['Lancer les dés (Entrer)', 'Gérer mes systèmes (G)', 'Échanger (E)', 'Abandonner (F)'])
    expect(buttons.map((b) => b.attributes('aria-keyshortcuts'))).toEqual(['Enter', 'G', 'E', 'F'])
  })

  it('names Enter and Escape in the trade composer', async () => {
    const { wrapper, session } = mountWithSession(TradeComposer, makeState({ ownership: { minitel: { owner: B } } }))
    session.send({ kind: 'button', id: 'trade' })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="trade-propose"]').text()).toBe('Proposer (Entrer)')
    expect(wrapper.get('[data-test="trade-composer"] footer').text()).toContain('Annuler (Échap)')
    expect(wrapper.get('[data-test="trade-close"]').attributes('title')).toBe('Fermer (Échap)')
  })

  it('names Space on a card to continue', () => {
    const wrapper = mount(CardReveal, { props: { cardId: cardIdByTitle('patch', 'Clé de déchiffrement') }, attachTo: document.body })
    expect(wrapper.text()).toContain('Toucher pour continuer (Espace)')
  })
})
