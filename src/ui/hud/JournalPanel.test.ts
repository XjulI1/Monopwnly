import { flushPromises } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { A, B, makeState } from '../../engine/testUtils'
import type { JournalEntry } from '../../game/history/journal'
import type { GameSession } from '../../game/useGameSession'
import { mountWithSession } from '../testUtils'
import JournalPanel from './JournalPanel.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

function heading(id: number, turn: number, actor = A): JournalEntry {
  return { id, kind: 'turn', turn, actor, text: `Tour ${turn} — ${actor === A ? 'Joueur 1' : 'Joueur 2'}`, details: [] }
}

function action(id: number, turn: number, actor = A, details: JournalEntry['details'] = []): JournalEntry {
  return { id, kind: 'action', turn, actor, text: `Action ${id}`, details }
}

function history(turns: number, perTurn: number): JournalEntry[] {
  const entries: JournalEntry[] = []
  let id = 1
  for (let turn = 1; turn <= turns; turn++) {
    entries.push(heading(id++, turn))
    for (let i = 0; i < perTurn; i++) entries.push(action(id++, turn))
  }
  return entries
}

function show(session: GameSession, entries: JournalEntry[], shown = entries.length) {
  session.journal.value = entries
  session.journalShown.value = shown
}

function scrolledUp(element: Element) {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 1000 })
  Object.defineProperty(element, 'clientHeight', { configurable: true, value: 150 })
  element.scrollTop = 400
}

describe('JournalPanel', () => {
  it('shows the entries already presented, under the heading of their turn, in the color of their author', async () => {
    const { wrapper, session } = mountWithSession(JournalPanel, makeState())
    show(session, [heading(1, 1), action(2, 1), heading(3, 1, B), action(4, 1, B), action(5, 1, B)], 4)
    await wrapper.vm.$nextTick()
    const turns = wrapper.findAll('[data-test="journal-turn"]')
    expect(turns.map((turn) => turn.find('p').text())).toEqual(['Tour 1 — Joueur 1', 'Tour 1 — Joueur 2'])
    expect(turns[1]?.find('p').attributes('style')).toContain('color: blue')
    const entries = wrapper.findAll('[data-test="journal-entry"]')
    expect(entries.map((entry) => entry.text())).toEqual(['Action 2', 'Action 4'])
    expect(entries[0]?.attributes('style')).toContain('border-color: red')
  })

  it('unfolds the details of an entry', async () => {
    const { wrapper, session } = mountWithSession(JournalPanel, makeState())
    show(session, [heading(1, 1), action(2, 1, A, [{ actor: A, text: 'Joueur 1 mise 10 Ᵽ' }, { actor: B, text: 'Joueur 2 passe' }])])
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="journal-details"]').exists()).toBe(false)
    const unfold = wrapper.get('[data-test="journal-unfold"]')
    expect(unfold.attributes('aria-expanded')).toBe('false')
    await unfold.trigger('click')
    expect(unfold.attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('[data-test="journal-details"] li').map((li) => li.text())).toEqual(['Joueur 1 mise 10 Ᵽ', 'Joueur 2 passe'])
  })

  it('folds away', async () => {
    const { wrapper } = mountWithSession(JournalPanel, makeState())
    const toggle = wrapper.get('[data-test="journal-toggle"]')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('[data-test="journal"]').isVisible()).toBe(false)
    await toggle.trigger('click')
    expect(wrapper.get('[data-test="journal"]').isVisible()).toBe(true)
  })

  it('shows the last 200 entries and loads the older ones on demand', async () => {
    const { wrapper, session } = mountWithSession(JournalPanel, makeState())
    show(session, history(30, 9))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-test="journal-entry"]')).toHaveLength(200 - 20)
    expect(wrapper.findAll('[data-test="journal-turn"]').at(0)?.find('p').text()).toBe('Tour 11 — Joueur 1')
    await wrapper.get('[data-test="journal-older"]').trigger('click')
    expect(wrapper.findAll('[data-test="journal-entry"]')).toHaveLength(270)
    expect(wrapper.find('[data-test="journal-older"]').exists()).toBe(false)
  })

  it('keeps the reading position and announces the new actions while the user reads the history', async () => {
    const { wrapper, session } = mountWithSession(JournalPanel, makeState())
    show(session, history(3, 5))
    await flushPromises()
    const log = wrapper.get('[data-test="journal"]')
    scrolledUp(log.element)
    await log.trigger('scroll')
    expect(wrapper.get('[data-test="journal-to-end"]').text()).toBe('')
    show(session, [...history(3, 5), action(100, 3)])
    await flushPromises()
    expect(log.element.scrollTop).toBe(400)
    expect(wrapper.get('[data-test="journal-to-end"]').text()).toBe('Nouvelles actions')
    await wrapper.get('[data-test="journal-to-end"]').trigger('click')
    expect(wrapper.find('[data-test="journal-to-end"]').exists()).toBe(false)
  })

  it('is a log that does not skip the animation when touched', () => {
    const { wrapper } = mountWithSession(JournalPanel, makeState())
    const log = wrapper.get('[data-test="journal"]')
    expect(log.attributes('role')).toBe('log')
    expect(log.element.closest('[data-keep-presenting]')).not.toBeNull()
  })
})
