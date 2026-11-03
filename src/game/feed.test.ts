import { describe, expect, it } from 'vitest'
import { appendToFeed, FEED_ROUNDS_KEPT, feedByRound, type FeedLine } from './feed'

function linesOf(round: number, count: number, firstId: number): { id: number; text: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: firstId + i, text: `tour ${round} ligne ${i + 1}` }))
}

describe('appendToFeed', () => {
  it('tags the new lines with their round', () => {
    expect(appendToFeed([], linesOf(3, 2, 1), 3)).toEqual([
      { id: 1, text: 'tour 3 ligne 1', round: 3 },
      { id: 2, text: 'tour 3 ligne 2', round: 3 },
    ])
  })

  it('keeps every line of the current round and of the 8 rounds before, however many lines they hold', () => {
    let feed: FeedLine[] = []
    let id = 1
    for (let round = 1; round <= 20; round++) {
      feed = appendToFeed(feed, linesOf(round, 30, id), round)
      id += 30
    }
    const rounds = [...new Set(feed.map((line) => line.round))]
    expect(FEED_ROUNDS_KEPT).toBe(8)
    expect(rounds).toEqual([12, 13, 14, 15, 16, 17, 18, 19, 20])
    expect(feed).toHaveLength(9 * 30)
  })
})

describe('feedByRound', () => {
  it('groups the lines by round, oldest first', () => {
    const feed = appendToFeed(appendToFeed([], linesOf(1, 2, 1), 1), linesOf(2, 1, 3), 2)
    expect(feedByRound(feed).map((group) => [group.round, group.lines.map((line) => line.id)])).toEqual([
      [1, [1, 2]],
      [2, [3]],
    ])
  })
})
