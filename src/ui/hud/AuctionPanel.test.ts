import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { Phase } from '../../engine'
import { A, B, C, makeState } from '../../engine/testUtils'
import AuctionPanel from './AuctionPanel.vue'
import JournalPanel from './JournalPanel.vue'
import { mountOnSession, mountWithSession } from '../testUtils'

type AuctionPhase = Extract<Phase, { kind: 'auction' }>

function auction(phase: Partial<AuctionPhase> = {}) {
  return makeState({
    players: 3,
    overrides: [{ cash: 400 }, { cash: 1500 }, { cash: 1500 }],
    phase: { kind: 'auction', squareId: 'forum', highBid: 0, highBidder: null, bidders: [A, B, C], nextBidder: A, ...phase },
  })
}

enableAutoUnmount(afterEach)

afterEach(() => {
  document.body.innerHTML = ''
})

function pressEnter() {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
  document.body.dispatchEvent(event)
  return event
}

describe('AuctionPanel', () => {
  it('shows the square, the absence of bid and whose turn it is', () => {
    const { wrapper } = mountWithSession(AuctionPanel, auction())
    expect(wrapper.text()).toContain('Forum')
    expect(wrapper.text()).toContain('Aucune mise')
    expect(wrapper.text()).toContain('À Joueur 1 d’enchérir')
    expect(wrapper.findAll('[data-test="bidder"]').map((b) => b.text())).toEqual(['Joueur 1', 'Joueur 2', 'Joueur 3'])
  })

  it('shows the players who passed as withdrawn', () => {
    const { wrapper } = mountWithSession(AuctionPanel, auction({ bidders: [A, C], nextBidder: C, highBid: 120, highBidder: A }))
    const withdrawn = wrapper.findAll('[data-test="bidder"][data-withdrawn]')
    expect(withdrawn.map((b) => b.text())).toEqual(['Joueur 2'])
    expect(wrapper.text()).toContain('120\u00A0Ᵽ par Joueur 1')
    expect(wrapper.text()).toContain('À Joueur 3 d’enchérir')
  })

  it('proposes the minimum bid and adjusts it with the shortcuts', async () => {
    const { wrapper } = mountWithSession(AuctionPanel, auction({ highBid: 120, highBidder: B }))
    const input = wrapper.get('input[type="number"]')
    expect((input.element as HTMLInputElement).value).toBe('121')
    await wrapper.get('[data-shortcut="+50"]').trigger('click')
    expect((input.element as HTMLInputElement).value).toBe('170')
  })

  it('disables the bid above the cash of the bidder', async () => {
    const { wrapper } = mountWithSession(AuctionPanel, auction({ highBid: 120, highBidder: B }))
    await wrapper.get('input[type="number"]').setValue(401)
    expect(wrapper.get('[data-test="place-bid"]').attributes('disabled')).toBeDefined()
    await wrapper.get('input[type="number"]').setValue(400)
    expect(wrapper.get('[data-test="place-bid"]').attributes('disabled')).toBeUndefined()
  })

  it('places the bid and moves on to the next bidder', async () => {
    const { wrapper, session } = mountWithSession(AuctionPanel, auction())
    await wrapper.get('[data-shortcut="+50"]').trigger('click')
    await wrapper.get('[data-test="place-bid"]').trigger('click')
    expect(session.engineState.value.phase).toMatchObject({ highBid: 50, highBidder: A, nextBidder: B })
    expect(wrapper.text()).toContain('À Joueur 2 d’enchérir')
    expect((wrapper.get('input[type="number"]').element as HTMLInputElement).value).toBe('51')
  })

  it('places the bid on Enter, and passes on P', async () => {
    const { wrapper, session } = mountWithSession(AuctionPanel, auction())
    expect(wrapper.get('[data-test="place-bid"]').text()).toBe('Enchérir (Entrer)')
    expect(wrapper.get('[data-button="pass"]').text()).toBe('Passer (P)')
    await wrapper.get('[data-shortcut="+50"]').trigger('click')
    expect(pressEnter().defaultPrevented).toBe(true)
    expect(session.engineState.value.phase).toMatchObject({ highBid: 50, highBidder: A, nextBidder: B })
  })

  it('leaves Enter alone while an AI must bid', () => {
    const state = auction({ nextBidder: B })
    const bidder = state.players.find((p) => p.id === B)
    if (bidder) bidder.controller = { kind: 'ai', level: 'normal' }
    const { session } = mountWithSession(AuctionPanel, state)
    expect(pressEnter().defaultPrevented).toBe(false)
    expect(session.engineState.value.phase).toMatchObject({ highBid: 0, nextBidder: B })
  })

  it('passes', async () => {
    const { wrapper, session } = mountWithSession(AuctionPanel, auction())
    await wrapper.get('[data-button="pass"]').trigger('click')
    expect(session.engineState.value.phase).toMatchObject({ bidders: [B, C], nextBidder: B })
  })

  it('announces the winner', async () => {
    const { wrapper, session } = mountWithSession(AuctionPanel, auction({ bidders: [A, B], highBid: 150, highBidder: B }))
    const journal = mountOnSession(JournalPanel, session)
    await wrapper.get('[data-button="pass"]').trigger('click')
    expect(journal.text()).toContain('Joueur 2 remporte Forum aux enchères pour 150\u00A0Ᵽ')
  })

  it('announces an auction without bid', async () => {
    const { wrapper, session } = mountWithSession(AuctionPanel, auction({ bidders: [A] }))
    const journal = mountOnSession(JournalPanel, session)
    await wrapper.get('[data-button="pass"]').trigger('click')
    expect(journal.text()).toContain('Personne ne prend Forum aux enchères')
  })
})
