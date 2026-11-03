import { afterEach, describe, expect, it } from 'vitest'
import { cardIdByTitle, type GameState } from '../../engine'
import { A, B, makeState, player, roll } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import DebtPanel from './DebtPanel.vue'

function rentDebt(cash: number, players = 2): GameState {
  const start = makeState({
    players,
    overrides: [{ position: 3, cash }],
    ownership: {
      'smart-fridge': { owner: B, level: 5 },
      'wifi-bulb': { owner: B, level: 5 },
      'ip-camera': { owner: B, level: 5 },
      minitel: { owner: A, level: 1 },
      'modem-56k': { owner: A, level: 1 },
    },
  })
  return roll(start, [2, 2]).state
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('DebtPanel', () => {
  it('shows the amount due, the creditor, the cash and what can still be raised', () => {
    const { wrapper } = mountWithSession(DebtPanel, rentDebt(300))
    expect(wrapper.text()).toContain('Joueur 1 doit 370\u00A0Ᵽ à Joueur 2')
    expect(wrapper.get('[data-test="debt-cash"]').text()).toContain('300\u00A0Ᵽ')
    expect(wrapper.get('[data-test="debt-raisable"]').text()).toContain('110\u00A0Ᵽ')
    expect(wrapper.find('[data-test="debt-remaining"]').exists()).toBe(false)
  })

  it('names the bank as creditor', () => {
    const start = makeState({ overrides: [{ position: 3, cash: 100 }] })
    const { wrapper } = mountWithSession(DebtPanel, roll(start, [1, 1]).state)
    expect(wrapper.text()).toContain('Joueur 1 doit 200\u00A0Ᵽ à la banque')
  })

  it('lists the payments left after the current one', () => {
    const start = makeState({
      players: 4,
      overrides: [{ position: 25, cash: 40 }],
      decks: { exploit: [cardIdByTitle('exploit', 'Conférence de sécurité')] },
    })
    const { wrapper } = mountWithSession(DebtPanel, roll(start, [1, 1]).state)
    expect(wrapper.text()).toContain('Joueur 1 doit 50\u00A0Ᵽ à Joueur 2')
    expect(wrapper.get('[data-test="debt-remaining"]').text()).toContain('2 paiements restants')
  })

  it('enables Payer once the cash covers the payment', async () => {
    const { wrapper, session } = mountWithSession(DebtPanel, rentDebt(300))
    expect(wrapper.get('[data-button="payDebt"]').attributes('disabled')).toBeDefined()
    session.dispatch({ type: 'sellBackdoor', playerId: A, squareId: 'minitel' })
    session.dispatch({ type: 'sellBackdoor', playerId: A, squareId: 'modem-56k' })
    session.dispatch({ type: 'mortgage', playerId: A, squareId: 'minitel' })
    session.dispatch({ type: 'mortgage', playerId: A, squareId: 'modem-56k' })
    await wrapper.vm.$nextTick()
    expect(wrapper.get('[data-test="debt-cash"]').text()).toContain('410\u00A0Ᵽ')
    await wrapper.get('[data-button="payDebt"]').trigger('click')
    expect(player(session.engineState.value, A).cash).toBe(40)
    expect(session.engineState.value.phase.kind).toBe('postRoll')
  })

  it('warns when the bankruptcy cannot be avoided', () => {
    const { wrapper } = mountWithSession(DebtPanel, rentDebt(100))
    expect(wrapper.get('[data-test="debt-unavoidable"]').text()).toContain('faillite est inévitable')
    expect(mountWithSession(DebtPanel, rentDebt(300)).wrapper.find('[data-test="debt-unavoidable"]').exists()).toBe(false)
  })

  it('declares the bankruptcy after a confirmation naming the creditor', async () => {
    const { wrapper, session } = mountWithSession(DebtPanel, rentDebt(100, 3))
    await wrapper.get('[data-button="declareBankruptcy"]').trigger('click')
    const dialog = document.body.querySelector('[role="alertdialog"]')
    expect(dialog?.textContent).toContain('Vos biens iront à Joueur 2.')
    expect(session.engineState.value.phase.kind).toBe('debt')
    ;(document.body.querySelector('[data-test="confirm"]') as HTMLButtonElement).click()
    await wrapper.vm.$nextTick()
    const state = session.engineState.value
    expect(player(state, A).bankrupt).toBe(true)
    expect(state.ownership.minitel?.owner).toBe(B)
  })

  it('goes back to the debt when the bankruptcy is cancelled', async () => {
    const { wrapper, session } = mountWithSession(DebtPanel, rentDebt(100))
    await wrapper.get('[data-button="declareBankruptcy"]').trigger('click')
    ;(document.body.querySelector('[data-test="cancel"]') as HTMLButtonElement).click()
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('[role="alertdialog"]')).toBeNull()
    expect(session.engineState.value.phase.kind).toBe('debt')
    expect(player(session.engineState.value, A).bankrupt).toBe(false)
  })

  it('names the bank in the confirmation of a bankruptcy towards the bank', async () => {
    const start = makeState({ overrides: [{ position: 3, cash: 100 }] })
    const { wrapper } = mountWithSession(DebtPanel, roll(start, [1, 1]).state)
    await wrapper.get('[data-button="declareBankruptcy"]').trigger('click')
    expect(document.body.querySelector('[role="alertdialog"]')?.textContent).toContain('Vos biens iront à la banque.')
  })
})
