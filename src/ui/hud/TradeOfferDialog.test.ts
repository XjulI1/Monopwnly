import { afterEach, describe, expect, it } from 'vitest'
import type { GameState, TradeOffer } from '../../engine'
import { A, B, act, makeState } from '../../engine/testUtils'
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

  it('accepts or refuses, with no other game command meanwhile', async () => {
    const accepting = mountWithSession(TradeOfferDialog, offered(satelliteFor400))
    expect(accepting.session.view.value.buttons.map((b) => b.id)).toEqual(['acceptTrade', 'rejectTrade'])
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
