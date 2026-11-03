import { afterEach, describe, expect, it } from 'vitest'
import { makeState } from '../../engine/testUtils'
import { appendToFeed, type FeedLine } from '../../game/feed'
import { mountWithSession } from '../testUtils'
import ActivityFeed from './ActivityFeed.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

function history(rounds: number, perRound: number): FeedLine[] {
  let feed: FeedLine[] = []
  let id = 1
  for (let round = 1; round <= rounds; round++) {
    feed = appendToFeed(feed, Array.from({ length: perRound }, (_, i) => ({ id: id++, text: `Tour ${round}, action ${i + 1}` })), round)
  }
  return feed
}

describe('ActivityFeed', () => {
  it('shows every kept line, under a heading for each round', async () => {
    const { wrapper, session } = mountWithSession(ActivityFeed, makeState())
    session.feed.value = history(9, 12)
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('li')).toHaveLength(9 * 12)
    expect(wrapper.findAll('[data-test="feed-round"] > p').map((p) => p.text())).toEqual(
      Array.from({ length: 9 }, (_, i) => `Tour ${i + 1}`),
    )
  })

  it('highlights the latest line only', async () => {
    const { wrapper, session } = mountWithSession(ActivityFeed, makeState())
    session.feed.value = history(2, 3)
    await wrapper.vm.$nextTick()
    const items = wrapper.findAll('li')
    expect(items.at(-1)?.classes()).toContain('text-ink')
    expect(items.slice(0, -1).every((item) => item.classes().includes('text-muted'))).toBe(true)
  })

  it('is a scrollable log that does not skip the animation when touched', () => {
    const { wrapper } = mountWithSession(ActivityFeed, makeState())
    const log = wrapper.get('[data-test="activity-feed"]')
    expect(log.attributes('role')).toBe('log')
    expect(log.classes()).toContain('overflow-y-auto')
    expect(log.element.closest('[data-keep-presenting]')).not.toBeNull()
  })
})
