import { describe, expect, it } from 'vitest'
import { cardIdByTitle, type GameState, type Phase, type TradeOffer } from '../engine'
import { A, B, act, makeState } from '../engine/testUtils'
import { IDLE, reduceInteraction, viewOf, type ButtonId, type Interaction, type InteractionInput } from './interaction'
import { shortcutCommand, shortcutName, shortcutOfKey } from './shortcuts'

const ai = { kind: 'ai', level: 'normal' } as const
const pressed = (id: ButtonId) => ({ kind: 'press', id })
const button = (id: ButtonId): InteractionInput => ({ kind: 'button', id })

function commandOf(key: string, state: GameState, interaction: Interaction = IDLE, presenting = false) {
  return shortcutCommand(shortcutOfKey(key), viewOf(state, interaction), presenting)
}

function shortcutsOf(state: GameState, interaction: Interaction = IDLE) {
  return viewOf(state, interaction).buttons.map((b) => [b.id, b.shortcut])
}

function after(state: GameState, inputs: InteractionInput[]): Interaction {
  return inputs.reduce((interaction, input) => reduceInteraction(state, interaction, input).interaction, IDLE)
}

const owned = { minitel: { owner: A }, 'modem-56k': { owner: A } }
const debt: Phase = { kind: 'debt', debtor: A, payments: [{ to: B, amount: 400, reason: 'rent' }], resume: { kind: 'postRoll' } }
const side = { squares: [], cash: 0, keys: [] }
const offer: TradeOffer = { from: A, to: B, give: { ...side, cash: 50 }, receive: { ...side, squares: ['minitel'] } }

describe('keys of the turn', () => {
  it('binds Enter to the roll, G to the management and E to the trade before the roll', () => {
    const state = makeState({ ownership: owned })
    expect(shortcutsOf(state)).toEqual([
      ['rollDice', 'Enter'],
      ['manage', 'G'],
      ['trade', 'E'],
    ])
    expect(commandOf('Enter', state)).toEqual(pressed('rollDice'))
    expect(commandOf('g', state)).toEqual(pressed('manage'))
    expect(commandOf('E', state)).toEqual(pressed('trade'))
  })

  it('binds Enter to the end of the turn after the roll, and to the new roll after a double', () => {
    expect(commandOf('Enter', makeState({ phase: { kind: 'postRoll', mayRollAgain: false } }))).toEqual(pressed('endTurn'))
    expect(commandOf('Enter', makeState({ phase: { kind: 'postRoll', mayRollAgain: true } }))).toEqual(pressed('rollDice'))
  })

  it('binds P to the fine, C to the key and Enter to the attempt at a double in quarantine', () => {
    const state = makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 0 }, keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }] })
    expect(shortcutsOf(state)).toEqual([
      ['payFine', 'P'],
      ['useKey', 'C'],
      ['rollDice', 'Enter'],
      ['manage', 'G'],
      ['trade', 'E'],
    ])
  })

  it('leaves the management mode on Enter or Escape', () => {
    const state = makeState({ ownership: owned })
    const managing = after(state, [button('manage')])
    expect(shortcutsOf(state, managing)).toEqual([['doneManaging', 'Enter']])
    expect(commandOf('Escape', state, managing)).toEqual(pressed('doneManaging'))
  })

  it('does nothing for a key bound to a disabled button', () => {
    expect(commandOf('g', makeState())).toBeNull()
  })

  it('does nothing for a key bound to no button', () => {
    expect(commandOf('x', makeState())).toBeNull()
    expect(commandOf(' ', makeState())).toBeNull()
  })
})

describe('keys of the decisions', () => {
  it('binds Enter to the purchase and M to the auction', () => {
    const state = makeState({ phase: { kind: 'buyDecision', squareId: 'ip-camera' } })
    expect(shortcutsOf(state)).toEqual([
      ['buy', 'Enter'],
      ['decline', 'M'],
    ])
  })

  it('binds N to the refusal when auctions are off', () => {
    const state = makeState({ settings: { auctions: false }, phase: { kind: 'buyDecision', squareId: 'ip-camera' } })
    expect(commandOf('n', state)).toEqual(pressed('decline'))
  })

  it('binds P to passing in an auction and leaves Enter to the bid of the panel', () => {
    const state = makeState({ phase: { kind: 'auction', squareId: 'blog', highBid: 0, highBidder: null, bidders: [A, B], nextBidder: A } })
    expect(commandOf('p', state)).toEqual(pressed('pass'))
    expect(commandOf('Enter', state)).toBeNull()
  })

  it('binds Enter to the payment, F to the bankruptcy and E to the trade during a debt', () => {
    const state = makeState({ overrides: [{ cash: 500 }], phase: debt })
    expect(shortcutsOf(state)).toEqual([
      ['payDebt', 'Enter'],
      ['declareBankruptcy', 'F'],
      ['trade', 'E'],
    ])
  })

  it('binds no key to the confirmation of the bankruptcy', () => {
    const state = makeState({ overrides: [{ cash: 500 }], phase: debt })
    const confirming = after(state, [button('declareBankruptcy')])
    expect(shortcutsOf(state, confirming)).toEqual([
      ['confirmBankruptcy', null],
      ['cancelBankruptcy', null],
    ])
  })

  it('binds Enter to the acceptance, C to the counter-offer and R to the refusal of an offer received', () => {
    const offered = act(makeState({ ownership: { minitel: { owner: B } } }), { type: 'proposeTrade', playerId: A, offer }).state
    expect(shortcutsOf(offered)).toEqual([
      ['acceptTrade', 'Enter'],
      ['counterTrade', 'C'],
      ['rejectTrade', 'R'],
    ])
  })
})

describe('keys of the trade composer', () => {
  const state = makeState({ ownership: { minitel: { owner: B } } })
  const composing = after(state, [button('trade')])

  it('sends the offer on Enter once it is valid', () => {
    expect(commandOf('Enter', state, composing)).toBeNull()
    const draft = { partner: B, give: { ...side, cash: 50 }, receive: { ...side, squares: ['minitel'] }, counter: false }
    const filled = after(state, [button('trade'), { kind: 'tradeDraft', draft }])
    expect(commandOf('Enter', state, filled)).toEqual(pressed('proposeTrade'))
  })

  it('ignores the keys of the turn while composing', () => {
    expect(commandOf('e', state, composing)).toBeNull()
    expect(commandOf('g', state, composing)).toBeNull()
  })

  it('closes the composer on Escape', () => {
    expect(commandOf('Escape', state, composing)).toEqual(pressed('closeTrade'))
  })
})

describe('escape and space', () => {
  it('closes the sheet before the composer', () => {
    const state = makeState({ ownership: { minitel: { owner: B } } })
    const both = after(state, [button('trade'), { kind: 'square', index: 1 }])
    expect(commandOf('Escape', state, both)).toEqual(pressed('closeSheet'))
  })

  it('does nothing on Escape when nothing is open', () => {
    expect(commandOf('Escape', makeState())).toBeNull()
  })

  it('only continues the presentation while it plays', () => {
    const state = makeState()
    expect(commandOf(' ', state, IDLE, true)).toEqual({ kind: 'continue' })
    expect(commandOf('Enter', state, IDLE, true)).toBeNull()
    expect(commandOf('Escape', state, after(state, [{ kind: 'square', index: 1 }]), true)).toBeNull()
  })

  it('offers no key while an AI acts, except closing the sheet', () => {
    const state = makeState({ overrides: [{ controller: ai }] })
    expect(commandOf('Enter', state)).toBeNull()
    expect(commandOf('Escape', state, after(state, [{ kind: 'square', index: 1 }]))).toEqual(pressed('closeSheet'))
  })
})

describe('names of the keys', () => {
  it('reads the keys of the keyboard as shortcuts', () => {
    expect(shortcutOfKey(' ')).toBe('Space')
    expect(shortcutOfKey('g')).toBe('G')
    expect(shortcutOfKey('Enter')).toBe('Enter')
  })

  it('names the keys in French', () => {
    expect(shortcutName('Enter')).toBe('Entrer')
    expect(shortcutName('Escape')).toBe('Échap')
    expect(shortcutName('Space')).toBe('Espace')
    expect(shortcutName('G')).toBe('G')
  })
})
