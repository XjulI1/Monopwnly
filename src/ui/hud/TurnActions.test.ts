import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { A, makeState, player } from '../../engine/testUtils'
import { mountWithSession } from '../testUtils'
import TurnActions from './TurnActions.vue'

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

const turn = () => makeState({ players: 3, ownership: { minitel: { owner: A } } })

function dialog(): HTMLElement | null {
  return document.body.querySelector('[role="alertdialog"]')
}

describe('TurnActions', () => {
  it('keeps the actions of the turn in the grid, the first one on the whole width', () => {
    const { wrapper } = mountWithSession(TurnActions, turn())
    const grid = wrapper.get('[data-test="turn-actions"]')
    expect(grid.findAll('[data-button]').map((b) => b.attributes('data-button'))).toEqual(['rollDice', 'manage', 'trade'])
    expect(grid.element.firstElementChild?.classList.contains('col-span-2')).toBe(true)
  })

  it('shows the button to give up apart from the actions of the turn, as a destructive action', () => {
    const { wrapper } = mountWithSession(TurnActions, turn())
    const giveUp = wrapper.get('[data-test="give-up"] [data-button="declareBankruptcy"]')
    expect(giveUp.text()).toContain('Abandonner')
    expect(giveUp.classes()).toContain('btn-danger')
  })

  it('gives up after a confirmation reminding that the systems go back to the bank', async () => {
    const { wrapper, session } = mountWithSession(TurnActions, turn())
    await wrapper.get('[data-button="declareBankruptcy"]').trigger('click')
    expect(dialog()?.querySelector('#confirm-title')?.textContent?.trim()).toBe('Abandonner la partie ?')
    expect(dialog()?.textContent).toContain('Joueur 1, vous vous déclarez en faillite et quittez la partie')
    expect(dialog()?.textContent).toContain('vos systèmes retournent à la banque')
    expect(dialog()?.querySelector('[data-test="confirm"]')?.textContent?.trim()).toBe('Confirmer l’abandon')
    ;(dialog()?.querySelector('[data-test="confirm"]') as HTMLButtonElement).click()
    await wrapper.vm.$nextTick()
    const state = session.engineState.value
    expect(player(state, A).bankrupt).toBe(true)
    expect(state.ownership.minitel).toBeUndefined()
  })

  it('goes back to the turn when giving up is cancelled', async () => {
    const { wrapper, session } = mountWithSession(TurnActions, turn())
    await wrapper.get('[data-button="declareBankruptcy"]').trigger('click')
    ;(dialog()?.querySelector('[data-test="cancel"]') as HTMLButtonElement).click()
    await wrapper.vm.$nextTick()
    expect(dialog()).toBeNull()
    expect(player(session.engineState.value, A).bankrupt).toBe(false)
    expect(wrapper.find('[data-button="rollDice"]').exists()).toBe(true)
  })
})
