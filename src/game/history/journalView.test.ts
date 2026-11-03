import { describe, expect, it } from 'vitest'
import type { JournalEntry } from './journal'
import { JOURNAL_PAGE, journalGroups } from './journalView'

function heading(id: number, turn: number): JournalEntry {
  return { id, kind: 'turn', turn, actor: 'p1', text: `Tour ${turn} — Joueur 1`, details: [] }
}

function action(id: number, turn: number): JournalEntry {
  return { id, kind: 'action', turn, actor: 'p1', text: `Action ${id}`, details: [] }
}

const journal = [heading(1, 1), action(2, 1), action(3, 1), heading(4, 1), action(5, 1), heading(6, 2), action(7, 2)]

describe('journalGroups', () => {
  it('groups the entries under the heading of their turn', () => {
    expect(journalGroups(journal).map((group) => [group.heading?.text, group.entries.map((entry) => entry.id)])).toEqual([
      ['Tour 1 — Joueur 1', [2, 3]],
      ['Tour 1 — Joueur 1', [5]],
      ['Tour 2 — Joueur 1', [7]],
    ])
  })

  it('keeps a heading without entry yet', () => {
    expect(journalGroups([heading(1, 1)])).toEqual([{ key: 1, heading: heading(1, 1), entries: [] }])
  })

  it('gives the first group of a partial window the heading found before it', () => {
    const [first] = journalGroups(journal, 2)
    expect(first).toEqual({ key: 1, heading: heading(1, 1), entries: [action(3, 1)] })
  })

  it('shows 200 entries at a time', () => {
    expect(JOURNAL_PAGE).toBe(200)
  })
})
