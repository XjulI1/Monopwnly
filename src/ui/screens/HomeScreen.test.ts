import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { GameState } from '../../engine'
import { A, makeState } from '../../engine/testUtils'
import { SAVED_GAME_KEY } from '../../game/persistence'
import type { SavedGame } from '../../game/savedGame'
import { savedGameFor } from '../testUtils'
import HomeScreen from './HomeScreen.vue'

const UNREADABLE = 'La sauvegarde précédente n’a pas pu être chargée'

function store(game: SavedGame) {
  localStorage.setItem(SAVED_GAME_KEY, JSON.stringify(game))
}

function inRound(turnNumber: number): GameState {
  const state = makeState({ players: 3 })
  state.turnNumber = turnNumber
  return state
}

function home(props: { updateReady?: boolean } = {}) {
  return mount(HomeScreen, { props, attachTo: document.body })
}

function blockStorage(): () => void {
  const own = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  })
  return () => (own ? Object.defineProperty(globalThis, 'localStorage', own) : Reflect.deleteProperty(globalThis, 'localStorage'))
}

afterEach(() => {
  localStorage.clear()
  document.body.innerHTML = ''
})

describe('HomeScreen', () => {
  it('offers to resume a game in progress, with its players, its round and the date of the save', async () => {
    const game = savedGameFor(inRound(12))
    store(game)
    const wrapper = home()
    const summary = wrapper.get('[data-test="saved-game"]').text()
    for (const name of ['Joueur 1', 'Joueur 2', 'Joueur 3']) expect(summary).toContain(name)
    expect(summary).toContain('Tour 12')
    expect(summary).toContain('3 novembre 2026')
    expect(wrapper.find('[data-test="review"]').exists()).toBe(false)
    await wrapper.get('[data-test="resume"]').trigger('click')
    expect(wrapper.get('[data-test="resume"]').text()).toBe('Reprendre la partie')
    expect(wrapper.emitted('resume')).toEqual([[game]])
  })

  it('offers to see the last game when it is over', async () => {
    const won = inRound(30)
    won.phase = { kind: 'gameOver' }
    won.winner = A
    const game = savedGameFor(won, 'finished')
    store(game)
    const wrapper = home()
    expect(wrapper.find('[data-test="resume"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="saved-game"]').text()).toContain('Joueur 1 a gagné')
    await wrapper.get('[data-test="review"]').trigger('click')
    expect(wrapper.get('[data-test="review"]').text()).toBe('Voir la dernière partie')
    expect(wrapper.emitted('review')).toEqual([[game]])
  })

  it('offers neither without a save', () => {
    const wrapper = home()
    expect(wrapper.find('[data-test="saved-game"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="resume"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="review"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(UNREADABLE)
  })

  it('says once that the previous save could not be loaded, and forgets it', () => {
    localStorage.setItem(SAVED_GAME_KEY, '{"formatVersion": 1, ')
    const first = home()
    expect(first.get('[role="status"]').text()).toBe(UNREADABLE)
    expect(first.find('[data-test="resume"]').exists()).toBe(false)
    expect(localStorage.getItem(SAVED_GAME_KEY)).toBeNull()
    first.unmount()
    expect(home().text()).not.toContain(UNREADABLE)
  })

  it('asks before replacing a game in progress, and keeps it when cancelled', async () => {
    store(savedGameFor(inRound(4)))
    const saved = localStorage.getItem(SAVED_GAME_KEY)
    const wrapper = home()
    await wrapper.get('[data-test="new-game"]').trigger('click')
    expect(wrapper.get('[role="alertdialog"]').text()).toContain('Remplacer la partie en cours ?')
    await wrapper.get('[data-test="cancel"]').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.emitted('create')).toBeUndefined()
    expect(localStorage.getItem(SAVED_GAME_KEY)).toBe(saved)
    await wrapper.get('[data-test="new-game"]').trigger('click')
    await wrapper.get('[data-test="confirm"]').trigger('click')
    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('creates a new game at once when the saved game is over', async () => {
    const won = inRound(30)
    won.phase = { kind: 'gameOver' }
    won.winner = A
    store(savedGameFor(won, 'finished'))
    const wrapper = home()
    await wrapper.get('[data-test="new-game"]').trigger('click')
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('announces a new version with a reload button when an update is ready', async () => {
    const wrapper = home({ updateReady: true })
    const banner = wrapper.get('[data-test="update-banner"]')
    expect(banner.text()).toContain('Nouvelle version disponible')
    const reload = banner.get('[data-test="reload"]')
    expect(reload.text()).toBe('Recharger')
    await reload.trigger('click')
    expect(wrapper.emitted('reload')).toHaveLength(1)
  })

  it('shows no update banner while no new version is ready', async () => {
    expect(home().find('[data-test="update-banner"]').exists()).toBe(false)
    const wrapper = home({ updateReady: false })
    expect(wrapper.find('[data-test="update-banner"]').exists()).toBe(false)
    await wrapper.setProps({ updateReady: true })
    expect(wrapper.find('[data-test="update-banner"]').exists()).toBe(true)
  })

  it('shows up without resume when the storage is blocked, and still lets a game be created', async () => {
    const restore = blockStorage()
    try {
      const wrapper = home()
      expect(wrapper.find('[data-test="resume"]').exists()).toBe(false)
      expect(wrapper.text()).not.toContain(UNREADABLE)
      await wrapper.get('[data-test="new-game"]').trigger('click')
      expect(wrapper.emitted('create')).toHaveLength(1)
    } finally {
      restore()
    }
  })
})
