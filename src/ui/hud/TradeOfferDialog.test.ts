import { afterEach, describe, expect, it } from 'vitest'
import type { GameState, TradeOffer } from '../../engine'
import { A, B, act, makeState } from '../../engine/testUtils'
import { formatPwn } from '../../game/format'
import { mountWithSession } from '../testUtils'
import TradeOfferDialog from './TradeOfferDialog.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

const ai = { kind: 'ai', level: 'normal' } as const

function offered(offer: TradeOffer, bAi = true): GameState {
  const start = makeState({
    current: 1,
    overrides: [{ name: 'Alice' }, { name: 'Nyx', ...(bAi ? { controller: ai } : {}) }],
    ownership: { satellite: { owner: A }, minitel: { owner: A, mortgaged: true }, forum: { owner: B } },
  })
  return act(start, { type: 'proposeTrade', playerId: B, offer }).state
}

const satelliteFor400: TradeOffer = {
  from: B,
  to: A,
  give: { squares: [], cash: 400, keys: [] },
  receive: { squares: ['satellite'], cash: 0, keys: [] },
}

describe('TradeOfferDialog', () => {
  it('names the author and the recipient, with what the recipient receives and gives', () => {
    const { wrapper } = mountWithSession(TradeOfferDialog, offered(satelliteFor400))
    expect(wrapper.get('#trade-offer-title').text()).toBe('Nyx vous propose un échange')
    expect(wrapper.get('[data-test="trade-recipient"]').text()).toContain('Alice')
    expect(wrapper.get('[data-test="offer-receive"]').text()).toContain('400 Ᵽ')
    const given = wrapper.get('[data-test="offer-give"]').text()
    expect(given).toContain('Satellite')
    expect(given).toContain('Infrastructure')
  })

  it('flags a mortgaged square', () => {
    const offer = { ...satelliteFor400, receive: { squares: ['minitel'], cash: 0, keys: [] } }
    expect(mountWithSession(TradeOfferDialog, offered(offer)).wrapper.get('[data-test="offer-give"]').text()).toContain('en veille')
  })

  it('addresses the recipient by name when both players are human', () => {
    const { wrapper } = mountWithSession(TradeOfferDialog, offered(satelliteFor400, false))
    expect(wrapper.get('[data-test="trade-recipient"]').text()).toBe('Pour Alice')
  })

  it('accepts, counters or refuses, with no other game command meanwhile', async () => {
    const accepting = mountWithSession(TradeOfferDialog, offered(satelliteFor400))
    expect(accepting.session.view.value.buttons.map((b) => b.id)).toEqual(['acceptTrade', 'counterTrade', 'rejectTrade'])
    expect(accepting.wrapper.findAll('[data-button]').map((b) => b.text())).toEqual(['Accepter (Entrer)', 'Contre-proposer (C)', 'Refuser (R)'])
    await accepting.wrapper.get('[data-button="acceptTrade"]').trigger('click')
    expect(accepting.session.engineState.value.ownership.satellite?.owner).toBe(B)
    const refusing = mountWithSession(TradeOfferDialog, offered(satelliteFor400))
    await refusing.wrapper.get('[data-button="rejectTrade"]').trigger('click')
    expect(refusing.session.engineState.value.ownership.satellite?.owner).toBe(A)
    expect(refusing.session.engineState.value.phase.kind).toBe('preRoll')
  })

  it('stays hidden when the recipient is an AI', () => {
    const toAi = { ...satelliteFor400, from: A, to: B, give: { squares: ['satellite'], cash: 0, keys: [] }, receive: { squares: [], cash: 100, keys: [] } }
    const start = makeState({ overrides: [{}, { controller: ai }], ownership: { satellite: { owner: A } } })
    const state = act(start, { type: 'proposeTrade', playerId: A, offer: toAi }).state
    expect(mountWithSession(TradeOfferDialog, state).wrapper.find('[data-test="trade-offer"]').exists()).toBe(false)
  })
})

describe('TradeOfferDialog for a counter-offer', () => {
  const forumFor150: TradeOffer = { from: A, to: B, give: { squares: ['forum'], cash: 0, keys: [] }, receive: { squares: [], cash: 150, keys: [] } }
  const forumFor200: TradeOffer = { from: B, to: A, give: { squares: [], cash: 200, keys: [] }, receive: { squares: ['forum'], cash: 0, keys: [] } }

  function countered(): GameState {
    const start = makeState({ overrides: [{ name: 'Joueur 1' }, { name: 'Nyx', controller: ai }], ownership: { forum: { owner: A } } })
    const offeredToNyx = act(start, { type: 'proposeTrade', playerId: A, offer: forumFor150 }).state
    return act(offeredToNyx, { type: 'counterTrade', playerId: B, offer: forumFor200 }).state
  }

  it('names the counter-offer, reminds the offer it answers, and only accepts or refuses', () => {
    const { wrapper } = mountWithSession(TradeOfferDialog, countered())
    expect(wrapper.get('#trade-offer-title').text()).toBe('Nyx vous fait une contre-proposition')
    expect(wrapper.get('[data-test="offer-original"]').text()).toBe(`Votre offre : Forum contre ${formatPwn(150)}`)
    expect(wrapper.get('[data-test="offer-receive"]').text()).toContain(formatPwn(200))
    expect(wrapper.get('[data-test="offer-give"]').text()).toContain('Forum')
    expect(wrapper.findAll('[data-button]').map((b) => b.attributes('data-button'))).toEqual(['acceptTrade', 'rejectTrade'])
  })

  it('shows no reminder for an offer that answers nothing', () => {
    expect(mountWithSession(TradeOfferDialog, offered(satelliteFor400)).wrapper.find('[data-test="offer-original"]').exists()).toBe(false)
  })

  it('hides while the recipient composes a counter-offer, and shows again when the composer is closed', async () => {
    const { wrapper, session } = mountWithSession(TradeOfferDialog, offered(satelliteFor400))
    await wrapper.get('[data-button="counterTrade"]').trigger('click')
    expect(session.view.value.trade?.draft.counter).toBe(true)
    expect(wrapper.find('[data-test="trade-offer"]').exists()).toBe(false)
    session.send({ kind: 'button', id: 'closeTrade' })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-test="trade-offer"]').exists()).toBe(true)
  })
})
