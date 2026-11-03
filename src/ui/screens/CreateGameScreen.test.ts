import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGame, type GameState } from '../../engine'
import type { GameConfig } from '../../game/setupForm'
import CreateGameScreen from './CreateGameScreen.vue'

vi.mock(import('../../engine'), async (importOriginal) => {
  const engine = await importOriginal()
  return { ...engine, createGame: vi.fn(engine.createGame) }
})

afterEach(() => {
  vi.mocked(createGame).mockClear()
})

type Started = [{ config: GameConfig; state: GameState }]

const rows = (wrapper: VueWrapper) => wrapper.findAll('[data-test="player-row"]')
const nameInput = (wrapper: VueWrapper, index: number) => rows(wrapper)[index]?.get('input[type="text"]')
const nameValue = (wrapper: VueWrapper, index: number) => (nameInput(wrapper, index)?.element as HTMLInputElement).value
const startButton = (wrapper: VueWrapper) => wrapper.get('[data-test="start"]')
const addButton = (wrapper: VueWrapper) => wrapper.get('[data-test="add-player"]')

function selectedColor(wrapper: VueWrapper, index: number) {
  return rows(wrapper)[index]?.get('[aria-pressed="true"]').attributes('data-color')
}

function startedWith(wrapper: VueWrapper) {
  const emitted = wrapper.emitted('start') as Started[] | undefined
  return emitted?.[0]?.[0]
}

describe('CreateGameScreen', () => {
  it('offers three players with default names and distinct colors', () => {
    const wrapper = mount(CreateGameScreen)
    expect(rows(wrapper)).toHaveLength(3)
    expect([0, 1, 2].map((i) => nameValue(wrapper, i))).toEqual(['Joueur 1', 'Joueur 2', 'Joueur 3'])
    expect(new Set([0, 1, 2].map((i) => selectedColor(wrapper, i))).size).toBe(3)
  })

  it('stops adding players at 6', async () => {
    const wrapper = mount(CreateGameScreen)
    for (let i = 0; i < 3; i++) await addButton(wrapper).trigger('click')
    expect(rows(wrapper)).toHaveLength(6)
    expect(addButton(wrapper).attributes('disabled')).toBeDefined()
    expect(new Set([0, 1, 2, 3, 4, 5].map((i) => selectedColor(wrapper, i))).size).toBe(6)
  })

  it('stops removing players at 2', async () => {
    const wrapper = mount(CreateGameScreen)
    await rows(wrapper)[2]?.get('[data-test="remove-player"]').trigger('click')
    expect(rows(wrapper)).toHaveLength(2)
    for (const row of rows(wrapper)) expect(row.get('[data-test="remove-player"]').attributes('disabled')).toBeDefined()
  })

  it('swaps the colors when a color is already taken', async () => {
    const wrapper = mount(CreateGameScreen)
    const first = selectedColor(wrapper, 0)
    const second = selectedColor(wrapper, 1)
    await rows(wrapper)[0]?.get(`[data-color="${second}"]`).trigger('click')
    expect(selectedColor(wrapper, 0)).toBe(second)
    expect(selectedColor(wrapper, 1)).toBe(first)
  })

  it('requires a name', async () => {
    const wrapper = mount(CreateGameScreen)
    await nameInput(wrapper, 1)?.setValue('   ')
    expect(rows(wrapper)[1]?.text()).toContain('Nom obligatoire')
    expect(startButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('refuses two players with the same name', async () => {
    const wrapper = mount(CreateGameScreen)
    await nameInput(wrapper, 0)?.setValue('Alice')
    await nameInput(wrapper, 2)?.setValue('alice ')
    expect(rows(wrapper)[0]?.text()).toContain('Nom déjà utilisé')
    expect(rows(wrapper)[2]?.text()).toContain('Nom déjà utilisé')
    expect(rows(wrapper)[1]?.text()).not.toContain('Nom déjà utilisé')
    expect(startButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('refuses a name longer than 20 characters', async () => {
    const wrapper = mount(CreateGameScreen)
    await nameInput(wrapper, 0)?.setValue('A'.repeat(21))
    expect(rows(wrapper)[0]?.text()).toContain('20 caractères au plus')
    expect(startButton(wrapper).attributes('disabled')).toBeDefined()
  })

  it('creates the game with the auctions enabled by default', async () => {
    const wrapper = mount(CreateGameScreen)
    await nameInput(wrapper, 0)?.setValue(' Alice ')
    await startButton(wrapper).trigger('click')
    const started = startedWith(wrapper)
    expect(started?.state.settings.auctions).toBe(true)
    expect(started?.state.players.map((p) => p.name)).toEqual(['Alice', 'Joueur 2', 'Joueur 3'])
    expect(started?.config.players).toHaveLength(3)
    expect(vi.mocked(createGame)).toHaveBeenCalledWith(expect.objectContaining({ seed: expect.any(Number) }))
  })

  it('creates the game with the auctions disabled', async () => {
    const wrapper = mount(CreateGameScreen)
    expect(wrapper.text()).toContain('mise aux enchères')
    await wrapper.get('[data-test="auctions"]').setValue(false)
    expect(wrapper.text()).toContain('reste à la banque')
    await startButton(wrapper).trigger('click')
    expect(startedWith(wrapper)?.state.settings.auctions).toBe(false)
  })

  it('shows the engine message and keeps the form when the engine refuses', async () => {
    vi.mocked(createGame).mockReturnValueOnce({
      ok: false,
      error: { code: 'DUPLICATE_PLAYER', message: 'Chaque joueur doit avoir un identifiant et une couleur distincts.' },
    })
    const wrapper = mount(CreateGameScreen)
    await nameInput(wrapper, 0)?.setValue('Alice')
    await startButton(wrapper).trigger('click')
    expect(wrapper.emitted('start')).toBeUndefined()
    expect(wrapper.text()).toContain('Chaque joueur doit avoir un identifiant et une couleur distincts.')
    expect(nameValue(wrapper, 0)).toBe('Alice')
  })
})
