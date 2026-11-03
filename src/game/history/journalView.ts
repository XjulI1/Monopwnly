import type { JournalEntry } from './journal'

/** Number of entries the journal panel shows at once before loading older ones. */
export const JOURNAL_PAGE = 200

/** A turn of the journal panel: its heading and the entries that follow it. */
export type JournalGroup = { key: number; heading: JournalEntry | null; entries: JournalEntry[] }

/** Groups the entries from `start` on under the heading of their turn; the first group takes the last heading before `start`. */
export function journalGroups(journal: readonly JournalEntry[], start = 0): JournalGroup[] {
  const groups: JournalGroup[] = []
  const previous = journal.slice(0, start).findLast((entry) => entry.kind === 'turn') ?? null
  let current: JournalGroup | null = null
  for (const entry of journal.slice(start)) {
    if (entry.kind === 'turn') {
      current = { key: entry.id, heading: entry, entries: [] }
      groups.push(current)
      continue
    }
    if (!current) {
      current = { key: previous?.id ?? 0, heading: previous, entries: [] }
      groups.push(current)
    }
    current.entries.push(entry)
  }
  return groups
}
