import { describe, expect, it } from 'vitest'
import { cardIdByTitle, type GameState, type Phase } from '../engine'
import { A, B, C, makeState, roll } from '../engine/testUtils'
import {
  bidCheck,
  IDLE,
  reduceInteraction,
  viewOf,
  type ButtonId,
  type Interaction,
  type InteractionInput,
} from './interaction'

const press = (id: ButtonId): InteractionInput => ({ kind: 'button', id })
const tap = (index: number): InteractionInput => ({ kind: 'square', index })

function buttonsOf(state: GameState, interaction: Interaction = IDLE) {
  return viewOf(state, interaction).buttons
}

function button(state: GameState, id: ButtonId, interaction: Interaction = IDLE) {
  return buttonsOf(state, interaction).find((b) => b.id === id)
}

function sequence(state: GameState, inputs: InteractionInput[], start: Interaction = IDLE) {
  let interaction = start
  const actions = []
  for (const input of inputs) {
    const result = reduceInteraction(state, interaction, input)
    interaction = result.interaction
    if (result.action) actions.push(result.action)
  }
  return { interaction, actions }
}

const retroAndBlog = { minitel: { owner: A }, 'modem-56k': { owner: A }, blog: { owner: A }, forum: { owner: B } }

describe('before and after the roll', () => {
  it('offers to roll the dice and to manage before the roll', () => {
    const state = makeState({ ownership: retroAndBlog })
    expect(buttonsOf(state).map((b) => [b.id, b.label, b.enabled])).toEqual([
      ['rollDice', 'Lancer les dés', true],
      ['manage', 'Gérer mes systèmes', true],
    ])
    expect(viewOf(state, IDLE).panel).toBe('turn')
    expect(sequence(state, [press('rollDice')]).actions).toEqual([{ type: 'rollDice', playerId: A }])
  })

  it('offers to roll again after a double', () => {
    const state = makeState({ phase: { kind: 'postRoll', mayRollAgain: true } })
    expect(buttonsOf(state).map((b) => [b.id, b.label])).toEqual([
      ['rollDice', 'Relancer'],
      ['manage', 'Gérer mes systèmes'],
    ])
  })

  it('offers to end the turn otherwise', () => {
    const state = makeState({ phase: { kind: 'postRoll', mayRollAgain: false } })
    expect(buttonsOf(state).map((b) => [b.id, b.label])).toEqual([
      ['endTurn', 'Fin du tour'],
      ['manage', 'Gérer mes systèmes'],
    ])
    expect(sequence(state, [press('endTurn')]).actions).toEqual([{ type: 'endTurn', playerId: A }])
  })

  it('disables management when no action is possible on the squares of the player', () => {
    const manage = button(makeState(), 'manage')
    expect(manage?.enabled).toBe(false)
    expect(manage?.reason).toBe('Aucune action possible sur vos systèmes pour l’instant.')
  })
})

describe('quarantine', () => {
  const quarantined = (keys: string[] = []) =>
    makeState({ overrides: [{ position: 10, quarantine: { failedAttempts: 1 }, keys }] })

  it('offers the three ways out', () => {
    expect(buttonsOf(quarantined()).map((b) => [b.id, b.label])).toEqual([
      ['payFine', 'Payer 50\u00A0Ᵽ'],
      ['useKey', 'Utiliser une Clé'],
      ['rollDice', 'Tenter un double'],
      ['manage', 'Gérer mes systèmes'],
    ])
  })

  it('disables the key without a decryption key', () => {
    const state = quarantined()
    expect(button(state, 'useKey')).toMatchObject({ enabled: false, reason: 'Vous n’avez pas de Clé de déchiffrement.' })
    expect(sequence(state, [press('useKey')]).actions).toEqual([])
  })

  it('enables the key when the player holds one', () => {
    const state = quarantined([cardIdByTitle('patch', 'Clé de déchiffrement')])
    expect(button(state, 'useKey')?.enabled).toBe(true)
    expect(sequence(state, [press('useKey')]).actions).toEqual([{ type: 'useDecryptionKey', playerId: A }])
  })

  it('tells which attempt the roll is', () => {
    expect(viewOf(quarantined(), IDLE).quarantine).toEqual({ attempt: 2, maxAttempts: 3 })
    expect(viewOf(makeState(), IDLE).quarantine).toBeNull()
  })
})

describe('management mode', () => {
  it('highlights the manageable squares of the player', () => {
    const state = makeState({ ownership: retroAndBlog })
    const { interaction } = sequence(state, [press('manage')])
    const view = viewOf(state, interaction)
    expect(view.managing).toBe(true)
    expect(view.highlights).toEqual({ 1: 'selectable', 3: 'selectable', 17: 'selectable' })
    expect(view.buttons.map((b) => [b.id, b.label])).toEqual([['doneManaging', 'Terminer']])
  })

  it('leaves the management mode on Terminer', () => {
    const state = makeState({ ownership: retroAndBlog })
    const { interaction } = sequence(state, [press('manage'), tap(1), press('doneManaging')])
    expect(interaction).toEqual(IDLE)
    expect(viewOf(state, interaction).highlights).toEqual({})
  })

  it('opens the sheet of an own square with the management buttons', () => {
    const state = makeState({ ownership: retroAndBlog })
    const { interaction } = sequence(state, [press('manage'), tap(1)])
    const view = viewOf(state, interaction)
    expect(view.sheet?.squareId).toBe('minitel')
    expect(view.sheet?.buttons.map((b) => [b.id, b.label, b.enabled])).toEqual([
      ['build', 'Construire', true],
      ['sell', 'Revendre', false],
      ['mortgage', 'Mettre en veille', true],
    ])
    expect(view.highlights[1]).toBe('selected')
  })

  it('transmits a construction from the sheet', () => {
    const state = makeState({ ownership: retroAndBlog })
    expect(sequence(state, [press('manage'), tap(1), press('build')]).actions).toEqual([
      { type: 'buildBackdoor', playerId: A, squareId: 'minitel' },
    ])
  })

  it('opens the sheet of another player without management buttons', () => {
    const state = makeState({ ownership: retroAndBlog })
    const { interaction } = sequence(state, [press('manage'), tap(16)])
    expect(viewOf(state, interaction).sheet).toEqual({ squareId: 'forum', buttons: [] })
  })

  it('opens a read-only sheet outside the management mode', () => {
    const state = makeState({ ownership: retroAndBlog })
    const { interaction, actions } = sequence(state, [tap(1), press('build')])
    expect(viewOf(state, interaction).sheet).toEqual({ squareId: 'minitel', buttons: [] })
    expect(actions).toEqual([])
  })

  it('closes the sheet on a tap outside the squares', () => {
    const state = makeState({ ownership: retroAndBlog })
    const { interaction } = sequence(state, [press('manage'), tap(1), { kind: 'outside' }])
    expect(interaction).toEqual({ ...IDLE, managing: true })
  })
})

describe('buy decision', () => {
  const deciding = (squareId: string, options: Parameters<typeof makeState>[0] = {}) =>
    makeState({ ...options, phase: { kind: 'buyDecision', squareId } })

  it('offers to buy or to put up for auction', () => {
    const state = deciding('ip-camera', { overrides: [{ cash: 500 }] })
    const view = viewOf(state, IDLE)
    expect(view.panel).toBe('buy')
    expect(view.buy).toEqual({ squareId: 'ip-camera', price: 120, cash: 500 })
    expect(view.buttons.map((b) => [b.id, b.label, b.enabled])).toEqual([
      ['buy', 'Acheter', true],
      ['decline', 'Mettre aux enchères', true],
    ])
    expect(view.highlights).toEqual({ 9: 'selected' })
    expect(sequence(state, [press('buy')]).actions).toEqual([{ type: 'buyProperty', playerId: A }])
  })

  it('names the refusal after the auction setting', () => {
    const state = deciding('ip-camera', { settings: { auctions: false } })
    expect(button(state, 'decline')?.label).toBe('Ne pas acheter')
    expect(sequence(state, [press('decline')]).actions).toEqual([{ type: 'declineProperty', playerId: A }])
  })

  it('disables the purchase without enough cash', () => {
    const state = deciding('ai-kernel', { overrides: [{ cash: 300 }] })
    expect(button(state, 'buy')).toMatchObject({ enabled: false, reason: 'Il vous faut 400 Ᵽ pour acheter ce système.' })
    expect(button(state, 'decline')?.enabled).toBe(true)
    expect(sequence(state, [press('buy')]).actions).toEqual([])
  })
})

describe('auction', () => {
  const auction = (phase: Partial<Extract<Phase, { kind: 'auction' }>> = {}) =>
    makeState({
      players: 3,
      overrides: [{ cash: 400 }, { cash: 1500 }, { cash: 1500 }],
      phase: { kind: 'auction', squareId: 'forum', highBid: 0, highBidder: null, bidders: [A, B, C], nextBidder: A, ...phase },
    })

  it('waits for the next bidder and proposes the minimum bid', () => {
    const view = viewOf(auction(), IDLE)
    expect(view.panel).toBe('auction')
    expect(view.actor).toBe(A)
    expect(view.auction).toMatchObject({
      squareId: 'forum',
      highBid: 0,
      highBidder: null,
      bidders: [A, B, C],
      withdrawn: [],
      nextBidder: A,
      min: 10,
      max: 400,
      defaultBid: 10,
    })
  })

  it('lists the players who passed as withdrawn', () => {
    const view = viewOf(auction({ bidders: [A, C], nextBidder: C, highBid: 120, highBidder: A }), IDLE)
    expect(view.auction?.withdrawn).toEqual([B])
    expect(view.auction?.defaultBid).toBe(121)
  })

  it('offers shortcuts from the best bid', () => {
    const view = viewOf(auction({ highBid: 120, highBidder: B }), IDLE)
    expect(view.auction?.shortcuts).toEqual([
      { label: '+10', amount: 130, enabled: true },
      { label: '+50', amount: 170, enabled: true },
      { label: '+100', amount: 220, enabled: true },
    ])
  })

  it('disables a shortcut above the cash of the bidder', () => {
    const view = viewOf(auction({ highBid: 360, highBidder: B }), IDLE)
    expect(view.auction?.shortcuts.map((s) => s.enabled)).toEqual([true, false, false])
  })

  it('checks the typed bid against the engine limits', () => {
    const state = auction({ highBid: 120, highBidder: B })
    expect(bidCheck(state, 121).allowed).toBe(true)
    expect(bidCheck(state, 120).allowed).toBe(false)
    expect(bidCheck(state, 401)).toEqual({ allowed: false, reason: 'Vous ne pouvez pas miser plus que votre argent.' })
    expect(bidCheck(state, 150.5).allowed).toBe(false)
  })

  it('emits placeBid for a valid bid and nothing otherwise', () => {
    const state = auction({ highBid: 120, highBidder: B })
    expect(sequence(state, [{ kind: 'bid', amount: 170 }]).actions).toEqual([{ type: 'placeBid', playerId: A, amount: 170 }])
    expect(sequence(state, [{ kind: 'bid', amount: 500 }]).actions).toEqual([])
  })

  it('emits passBid', () => {
    expect(buttonsOf(auction()).map((b) => b.id)).toEqual(['pass'])
    expect(sequence(auction(), [press('pass')]).actions).toEqual([{ type: 'passBid', playerId: A }])
  })
})

describe('debt', () => {
  function rentDebt(cash: number) {
    const start = makeState({
      overrides: [{ position: 3, cash }],
      ownership: {
        'smart-fridge': { owner: B, level: 5 },
        'wifi-bulb': { owner: B, level: 5 },
        'ip-camera': { owner: B, level: 5 },
        minitel: { owner: A, level: 1 },
        'modem-56k': { owner: A, level: 1 },
        blog: { owner: A, mortgaged: true },
      },
    })
    return roll(start, [2, 2]).state
  }

  it('opens the management mode limited to sales and mortgages', () => {
    const state = rentDebt(200)
    const view = viewOf(state, IDLE)
    expect(view.panel).toBe('debt')
    expect(view.managing).toBe(true)
    expect(view.highlights).toEqual({ 1: 'selectable', 3: 'selectable' })
    const sheet = viewOf(state, reduceInteraction(state, IDLE, tap(1)).interaction).sheet
    expect(sheet?.buttons.map((b) => [b.id, b.enabled])).toEqual([
      ['sell', true],
      ['mortgage', false],
    ])
  })

  it('describes the debt', () => {
    expect(viewOf(rentDebt(200), IDLE).debt).toMatchObject({
      debtor: A,
      payment: { to: B, amount: 250, reason: 'rent' },
      cash: 200,
      raisable: 110,
      covered: false,
      unavoidable: false,
      confirming: false,
    })
  })

  it('enables Payer only when the current payment is covered', () => {
    expect(button(rentDebt(200), 'payDebt')).toMatchObject({ enabled: false, label: 'Payer', amount: 250 })
    const covered = rentDebt(200)
    const debtor = covered.players.find((p) => p.id === A)
    if (debtor) debtor.cash = 400
    expect(button(covered, 'payDebt')?.enabled).toBe(true)
    expect(sequence(covered, [press('payDebt')]).actions).toEqual([{ type: 'payDebt', playerId: A }])
  })

  it('flags an unavoidable bankruptcy', () => {
    expect(viewOf(rentDebt(100), IDLE).debt?.unavoidable).toBe(true)
  })

  it('asks for a confirmation before declaring bankruptcy', () => {
    const state = rentDebt(100)
    const asked = sequence(state, [press('declareBankruptcy')])
    expect(asked.actions).toEqual([])
    expect(viewOf(state, asked.interaction).debt?.confirming).toBe(true)
    expect(viewOf(state, asked.interaction).buttons.map((b) => [b.id, b.label])).toEqual([
      ['confirmBankruptcy', 'Confirmer la faillite'],
      ['cancelBankruptcy', 'Annuler'],
    ])
    expect(sequence(state, [press('confirmBankruptcy')], asked.interaction).actions).toEqual([
      { type: 'declareBankruptcy', playerId: A },
    ])
  })

  it('goes back to the debt when the bankruptcy is cancelled', () => {
    const state = rentDebt(100)
    const { interaction, actions } = sequence(state, [press('declareBankruptcy'), press('cancelBankruptcy')])
    expect(actions).toEqual([])
    expect(viewOf(state, interaction).debt?.confirming).toBe(false)
  })
})

describe('while an AI acts', () => {
  const ai = { kind: 'ai', level: 'normal' } as const

  it('offers no game command, highlights nothing and names the AI who is thinking', () => {
    const state = makeState({ overrides: [{ controller: ai }], ownership: retroAndBlog })
    const view = viewOf(state, IDLE)
    expect(view.thinking).toBe(A)
    expect(view.buttons).toEqual([])
    expect(view.highlights).toEqual({})
    expect(sequence(state, [press('rollDice'), press('manage')]).actions).toEqual([])
  })

  it('still opens the sheet of a square, without management buttons', () => {
    const state = makeState({ overrides: [{ controller: ai }], ownership: retroAndBlog })
    const { interaction } = sequence(state, [tap(1)])
    expect(viewOf(state, interaction).sheet).toEqual({ squareId: 'minitel', buttons: [] })
  })

  it('ignores a bid typed by the human while an AI must bid', () => {
    const phase: Phase = { kind: 'auction', squareId: 'blog', highBid: 20, highBidder: A, bidders: [A, B], nextBidder: B }
    const state = makeState({ overrides: [{}, { controller: ai }], phase })
    expect(viewOf(state, IDLE).thinking).toBe(B)
    expect(reduceInteraction(state, IDLE, { kind: 'bid', amount: 40 }).action).toBeUndefined()
  })

  it('gives the commands back when a human must act', () => {
    const state = makeState({ overrides: [{}, { controller: ai }] })
    expect(viewOf(state, IDLE).thinking).toBeNull()
    expect(button(state, 'rollDice')?.enabled).toBe(true)
  })
})
