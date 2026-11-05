import { describe, expect, it } from 'vitest'
import { cardIdByTitle, type Action, type GameEvent, type GameState } from '../../engine'
import { A, B, C, act, forceDice, makeState, type StateOptions } from '../../engine/testUtils'
import { formatPwn as pwn } from '../format'
import { recordInJournal, startJournal, type JournalEntry } from './journal'

const NAMES = [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }, { name: 'Dave' }]

function game(options: StateOptions = {}): GameState {
  const count = options.players ?? 2
  const overrides = NAMES.slice(0, count).map((name, i) => ({ ...name, ...options.overrides?.[i] }))
  return makeState({ ...options, overrides })
}

function record(journal: JournalEntry[], before: GameState, events: GameEvent[]) {
  return recordInJournal(journal, before, events)
}

function entriesOf(before: GameState, action: Action): JournalEntry[] {
  return record([], before, act(before, action).events).journal
}

function textsOf(before: GameState, action: Action): string[] {
  return entriesOf(before, action).map((entry) => entry.text)
}

function rolling(state: GameState, dice: [number, number]): GameState {
  return forceDice(state, [dice])
}

function rollOf(state: GameState): Action {
  return { type: 'rollDice', playerId: state.players[state.currentPlayerIndex]?.id ?? A }
}

function play(start: GameState, actions: Action[]): JournalEntry[] {
  let state = start
  let journal: JournalEntry[] = []
  for (const action of actions) {
    const { state: next, events } = act(state, action)
    journal = record(journal, state, events).journal
    state = next
  }
  return journal
}

describe('turn headings', () => {
  it('opens the journal on the turn of the first player', () => {
    expect(startJournal(game())).toEqual([{ id: 1, kind: 'turn', turn: 1, actor: A, text: 'Tour 1 — Alice', details: [] }])
  })

  it('opens a heading at the start of the turn of each player, numbered by the round', () => {
    const start = game({ current: 1, phase: { kind: 'postRoll', mayRollAgain: false } })
    expect(entriesOf(start, { type: 'endTurn', playerId: B })).toEqual([
      { id: 1, kind: 'turn', turn: 2, actor: A, text: 'Tour 2 — Alice', details: [] },
    ])
  })

  it('numbers the entries after the last one of the journal', () => {
    const start = game({ phase: { kind: 'postRoll', mayRollAgain: false } })
    const { journal } = record(startJournal(start), start, act(start, { type: 'endTurn', playerId: A }).events)
    expect(journal.map((entry) => entry.id)).toEqual([1, 2])
  })
})

describe('rolls and moves', () => {
  it('describes the roll and the move in one entry', () => {
    const start = rolling(game(), [4, 3])
    expect(entriesOf(start, rollOf(start))).toEqual([
      { id: 1, kind: 'action', turn: 1, actor: A, text: 'Alice lance 4 et 3 et avance sur Frigo connecté', details: [] },
    ])
  })

  it('mentions a double at the end of the roll', () => {
    const start = rolling(game(), [3, 3])
    expect(textsOf(start, rollOf(start))).toEqual(['Alice lance 3 et 3 et avance sur Ampoule Wi‑Fi (double)'])
  })

  it('puts the salary of Boot in a sub-line of the roll', () => {
    const start = rolling(game({ overrides: [{ position: 36 }] }), [3, 4])
    const [entry] = entriesOf(start, rollOf(start))
    expect(entry?.text).toBe('Alice lance 3 et 4 et avance sur Modem 56k')
    expect(entry?.details).toEqual([{ actor: A, text: `Alice passe par Boot et reçoit ${pwn(200)}` }])
  })

  it('reveals the roll only once its move and its salary are presented', () => {
    const start = rolling(game({ overrides: [{ position: 36 }] }), [3, 4])
    const { events } = act(start, rollOf(start))
    expect(record([], start, events).reveals).toEqual([events.length])
  })

  it('reveals each entry after the last event it describes', () => {
    const start = rolling(game({ overrides: [{ position: 4 }], ownership: { intranet: { owner: B, level: 1 } } }), [4, 6])
    const { events } = act(start, rollOf(start))
    expect(events.map((e) => e.type)).toEqual(['diceRolled', 'moved', 'paid'])
    expect(record([], start, events).reveals).toEqual([2, 3])
  })

  it('ends a triple double in quarantine without moving', () => {
    const start = rolling(game({ doublesInARow: 2 }), [5, 5])
    expect(textsOf(start, rollOf(start))).toEqual(['Alice lance 5 et 5 (double)', 'Alice est placé en quarantaine'])
  })
})

describe('purchases and auctions', () => {
  it('describes a purchase', () => {
    const start = game({ overrides: [{ position: 16 }], phase: { kind: 'buyDecision', squareId: 'forum' } })
    expect(textsOf(start, { type: 'buyProperty', playerId: A })).toEqual([`Alice achète Forum pour ${pwn(180)}`])
  })

  it('describes a refusal without auction', () => {
    const start = game({ settings: { auctions: false }, overrides: [{ position: 16 }], phase: { kind: 'buyDecision', squareId: 'forum' } })
    expect(textsOf(start, { type: 'declineProperty', playerId: A })).toEqual(['Alice n’achète pas Forum'])
  })

  it('sums an auction up in one entry that unfolds into one line per bid or withdrawal', () => {
    const start = game({ overrides: [{ position: 25 }], phase: { kind: 'buyDecision', squareId: 'proxy-node' } })
    const journal = play(start, [
      { type: 'declineProperty', playerId: A },
      { type: 'placeBid', playerId: A, amount: 10 },
      { type: 'placeBid', playerId: B, amount: 50 },
      { type: 'placeBid', playerId: A, amount: 120 },
      { type: 'passBid', playerId: B },
    ])
    expect(journal.map((entry) => entry.text)).toEqual([
      'Alice n’achète pas Nœud Proxy',
      `Alice remporte Nœud Proxy aux enchères pour ${pwn(120)}`,
    ])
    expect(journal[1]).toMatchObject({ kind: 'action', actor: A })
    expect(journal[1]?.details).toEqual([
      { actor: A, text: `Alice mise ${pwn(10)}` },
      { actor: B, text: `Bob mise ${pwn(50)}` },
      { actor: A, text: `Alice mise ${pwn(120)}` },
      { actor: B, text: 'Bob passe' },
    ])
  })

  it('keeps the auction open while bids come in', () => {
    const start = game({ overrides: [{ position: 25 }], phase: { kind: 'buyDecision', squareId: 'proxy-node' } })
    const journal = play(start, [
      { type: 'declineProperty', playerId: A },
      { type: 'placeBid', playerId: A, amount: 10 },
    ])
    expect(journal[1]).toMatchObject({ kind: 'auction', actor: null, text: 'Enchère sur Nœud Proxy' })
    expect(journal[1]?.details).toHaveLength(1)
  })

  it('reports an auction without taker', () => {
    const start = game({ overrides: [{ position: 25 }], phase: { kind: 'buyDecision', squareId: 'proxy-node' } })
    const journal = play(start, [
      { type: 'declineProperty', playerId: A },
      { type: 'passBid', playerId: A },
      { type: 'passBid', playerId: B },
    ])
    expect(journal.at(-1)).toMatchObject({ kind: 'action', actor: null, text: 'Personne ne prend Nœud Proxy aux enchères' })
  })

  it('opens the entry of an auction that started before the journal', () => {
    const start = game({ phase: { kind: 'auction', squareId: 'forum', highBid: 150, highBidder: B, bidders: [A, B], nextBidder: A } })
    expect(entriesOf(start, { type: 'passBid', playerId: A })).toMatchObject([
      { kind: 'action', text: `Bob remporte Forum aux enchères pour ${pwn(150)}`, details: [{ actor: A, text: 'Alice passe' }] },
    ])
  })
})

describe('payments', () => {
  it('names the payer, the amount, the owner and the square of a rent', () => {
    const before = game({ overrides: [{}, { position: 28 }], ownership: { neobank: { owner: A } } })
    const events: GameEvent[] = [{ type: 'paid', from: B, to: A, amount: 1365, reason: 'rent' }]
    expect(record([], before, events).journal.map((entry) => entry.text)).toEqual([`Bob paie ${pwn(1365)} de loyer à Alice pour Néobanque`])
  })

  it('names the square of a tax', () => {
    const start = rolling(game(), [2, 3])
    expect(textsOf(start, rollOf(start))).toEqual(['Alice lance 2 et 3 et avance sur Rançongiciel', `Alice paie ${pwn(200)} : Rançongiciel`])
  })

  it('tells how much a player must raise', () => {
    const start = rolling(game({ overrides: [{ cash: 50 }] }), [2, 3])
    expect(textsOf(start, rollOf(start)).at(-1)).toBe(`Alice doit réunir ${pwn(200)}`)
  })
})

describe('cards', () => {
  function onCard(deck: 'exploit' | 'patch', title: string, options: StateOptions = {}): GameState {
    const position = deck === 'exploit' ? 10 : 3
    const overrides = [{ position }, ...(options.overrides ?? []).slice(1)]
    return rolling(game({ ...options, overrides, decks: { [deck]: [cardIdByTitle(deck, title)] } }), [2, 3])
  }

  it('gives the deck, the title and the effect of the card', () => {
    const start = rolling(
      game({ players: 3, current: 2, overrides: [{}, {}, { position: 5 }], decks: { patch: [cardIdByTitle('patch', 'Victoire au CTF')] } }),
      [1, 2],
    )
    expect(textsOf(start, rollOf(start)).at(-1)).toBe(`Carol pioche Patch : Victoire au CTF — reçoit ${pwn(25)}`)
  })

  it('groups the payments of a card to every other player in one entry', () => {
    const start = onCard('exploit', 'Conférence de sécurité', { players: 4 })
    const card = entriesOf(start, rollOf(start)).at(-1)
    expect(card?.text).toBe(`Alice pioche Exploit : Conférence de sécurité — verse ${pwn(50)} à chaque autre joueur`)
    expect(card?.details).toEqual([
      { actor: A, text: `Alice verse ${pwn(50)} à Bob` },
      { actor: A, text: `Alice verse ${pwn(50)} à Carol` },
      { actor: A, text: `Alice verse ${pwn(50)} à Dave` },
    ])
  })

  it('groups the payments of every other player to the card holder', () => {
    const start = onCard('patch', 'Serveur de jeu partagé', { players: 3 })
    const card = entriesOf(start, rollOf(start)).at(-1)
    expect(card?.text).toBe(`Alice pioche Patch : Serveur de jeu partagé — reçoit ${pwn(10)} de chaque autre joueur`)
    expect(card?.details.map((d) => d.actor)).toEqual([B, C])
  })

  it('tells where a card moves the player', () => {
    const start = onCard('exploit', 'Rollback')
    expect(textsOf(start, rollOf(start)).at(-1)).toBe('Alice pioche Exploit : Rollback — recule sur Messagerie pro')
  })

  it('puts the salary of a card that passes Boot in a sub-line of the card', () => {
    const start = onCard('exploit', 'Redémarrage à chaud')
    const card = entriesOf(start, rollOf(start)).at(-1)
    expect(card?.text).toBe('Alice pioche Exploit : Redémarrage à chaud — avance sur Boot')
    expect(card?.details).toEqual([{ actor: A, text: `Alice passe par Boot et reçoit ${pwn(200)}` }])
  })

  it('computes the amount of a card that charges per building', () => {
    const start = onCard('exploit', 'Mise à jour forcée', {
      ownership: { minitel: { owner: A, level: 2 }, 'modem-56k': { owner: A, level: 5 } },
    })
    expect(textsOf(start, rollOf(start)).at(-1)).toBe(`Alice pioche Exploit : Mise à jour forcée — paie ${pwn(150)}`)
  })

  it('tells when a card that charges per building costs nothing', () => {
    const start = onCard('exploit', 'Mise à jour forcée')
    expect(textsOf(start, rollOf(start)).at(-1)).toBe('Alice pioche Exploit : Mise à jour forcée — n’a rien à payer')
  })

  it('keeps a decryption key', () => {
    const start = onCard('patch', 'Clé de déchiffrement')
    expect(textsOf(start, rollOf(start)).at(-1)).toBe('Alice pioche Patch : Clé de déchiffrement — garde une Clé de déchiffrement')
  })

  it('sends the player to quarantine without a second entry', () => {
    const start = onCard('patch', 'Alerte du SOC')
    expect(textsOf(start, rollOf(start)).slice(1)).toEqual(['Alice pioche Patch : Alerte du SOC — est placé en quarantaine'])
  })
})

describe('quarantine', () => {
  const inQuarantine = { position: 10, quarantine: { failedAttempts: 0 } }

  it('describes the arrival in quarantine', () => {
    const start = rolling(game({ overrides: [{ position: 25 }] }), [2, 3])
    expect(textsOf(start, rollOf(start))).toEqual(['Alice lance 2 et 3 et avance sur Détecté !', 'Alice est placé en quarantaine'])
  })

  it('describes a failed attempt', () => {
    const start = rolling(game({ overrides: [inQuarantine] }), [1, 2])
    expect(textsOf(start, rollOf(start))).toEqual(['Alice lance 1 et 2 sans faire de double (tentative 1 sur 3)'])
  })

  it('tells how the player left the quarantine', () => {
    const fine = game({ overrides: [inQuarantine] })
    expect(textsOf(fine, { type: 'payQuarantineFine', playerId: A })).toEqual(['Alice sort de quarantaine (amende)'])
    const key = game({ overrides: [{ ...inQuarantine, keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }] })
    expect(textsOf(key, { type: 'useDecryptionKey', playerId: A })).toEqual(['Alice sort de quarantaine (clé)'])
  })

  it('leaves the quarantine with a double, then moves', () => {
    const start = rolling(game({ overrides: [inQuarantine] }), [2, 2])
    expect(textsOf(start, rollOf(start))).toEqual(['Alice sort de quarantaine (double)', 'Alice lance 2 et 2 et avance sur Intranet'])
  })

  it('pays the fine after the third failure, then moves', () => {
    const start = rolling(game({ overrides: [{ position: 10, quarantine: { failedAttempts: 2 } }] }), [1, 2])
    expect(textsOf(start, rollOf(start))).toEqual([
      'Alice lance 1 et 2 sans faire de double (tentative 3 sur 3)',
      'Alice sort de quarantaine (amende après trois échecs)',
      'Alice avance sur Datacenter',
    ])
  })
})

describe('buildings and mortgages', () => {
  const web = { forum: { owner: A }, blog: { owner: A }, 'online-shop': { owner: A } }
  const intranet = { 'network-printer': { owner: A, level: 5 as const }, 'work-mail': { owner: A, level: 5 as const }, intranet: { owner: A, level: 5 as const } }

  it('describes a backdoor and a rootkit', () => {
    expect(textsOf(game({ ownership: web }), { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toEqual([
      'Alice installe une backdoor sur Forum',
    ])
    const almost = game({ ownership: { forum: { owner: A, level: 4 }, blog: { owner: A, level: 4 }, 'online-shop': { owner: A, level: 4 } } })
    expect(textsOf(almost, { type: 'buildBackdoor', playerId: A, squareId: 'forum' })).toEqual(['Alice installe un rootkit sur Forum'])
  })

  it('describes the sale of a backdoor and of a rootkit', () => {
    const built = game({ ownership: { forum: { owner: A, level: 1 }, blog: { owner: A }, 'online-shop': { owner: A } } })
    expect(textsOf(built, { type: 'sellBackdoor', playerId: A, squareId: 'forum' })).toEqual(['Alice revend une backdoor de Forum'])
    expect(textsOf(game({ ownership: intranet }), { type: 'sellBackdoor', playerId: A, squareId: 'intranet' })).toEqual([
      'Alice revend le rootkit d’Intranet',
    ])
  })

  it('describes a mortgage and a reactivation with their amounts', () => {
    expect(textsOf(game({ ownership: { forum: { owner: A } } }), { type: 'mortgage', playerId: A, squareId: 'forum' })).toEqual([
      `Alice met Forum en veille et reçoit ${pwn(90)}`,
    ])
    const mortgaged = game({ ownership: { forum: { owner: A, mortgaged: true } } })
    expect(textsOf(mortgaged, { type: 'unmortgage', playerId: A, squareId: 'forum' })).toEqual([`Alice réactive Forum pour ${pwn(99)}`])
  })
})

describe('bankruptcy and victory', () => {
  it('names the creditor of the bankruptcy and the winner', () => {
    const start = game({
      overrides: [{}, { cash: 10 }],
      ownership: { forum: { owner: B } },
      phase: { kind: 'debt', debtor: B, payments: [{ to: A, amount: 500, reason: 'rent' }], resume: { kind: 'postRoll' } },
    })
    const entries = entriesOf(start, { type: 'declareBankruptcy', playerId: B })
    expect(entries.map((entry) => entry.text)).toEqual(['Bob fait faillite au profit d’Alice', 'Alice remporte la partie : dernier hacker solvable'])
    expect(entries[0]?.details).toEqual([
      { actor: B, text: `Bob cède ${pwn(10)} à Alice` },
      { actor: B, text: 'Forum passe à Alice' },
    ])
    expect(entries.map((entry) => entry.actor)).toEqual([B, A])
  })

  it('tells what goes back to the bank', () => {
    const start = game({
      players: 3,
      overrides: [{ cash: 10, keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }],
      ownership: { forum: { owner: A, level: 2 }, blog: { owner: A, level: 2 }, 'online-shop': { owner: A, level: 2 } },
      phase: { kind: 'debt', debtor: A, payments: [{ to: 'bank', amount: 2000, reason: 'tax' }], resume: { kind: 'postRoll' } },
    })
    const [ruin] = entriesOf(start, { type: 'declareBankruptcy', playerId: A })
    expect(ruin?.text).toBe('Alice fait faillite au profit de la banque')
    expect(ruin?.details.map((d) => d.text)).toEqual([
      `Alice revend ses constructions pour ${pwn(300)}`,
      `Alice cède ${pwn(310)} à la banque`,
      'Forum, Blog et Boutique en ligne retournent à la banque',
      '1 Clé de déchiffrement retourne sous son paquet',
    ])
  })

  it('tells a player giving up during their turn, unfolded like a bankruptcy', () => {
    const start = game({
      players: 3,
      overrides: [{ cash: 300, keys: [cardIdByTitle('patch', 'Clé de déchiffrement')] }],
      ownership: { minitel: { owner: A, level: 1 }, 'modem-56k': { owner: A, level: 1 } },
    })
    const [ruin, heading] = entriesOf(start, { type: 'declareBankruptcy', playerId: A })
    expect(ruin).toMatchObject({ actor: A, text: 'Alice abandonne et se déclare en faillite' })
    expect(ruin?.details.map((d) => d.text)).toEqual([
      `Alice revend ses constructions pour ${pwn(50)}`,
      `Alice cède ${pwn(350)} à la banque`,
      'Minitel et Modem 56k retournent à la banque',
      '1 Clé de déchiffrement retourne sous son paquet',
    ])
    expect(heading?.text).toBe('Tour 1 — Bob')
  })
})

describe('authors and rounds', () => {
  it('ties each entry to its author and to the round, even out of turn', () => {
    const start = game({
      players: 3,
      overrides: [{}, { cash: 5 }],
      ownership: { blog: { owner: B } },
      phase: { kind: 'debt', debtor: B, payments: [{ to: A, amount: 10, reason: 'card' }], resume: { kind: 'postRoll' } },
    })
    const mortgaged = act(start, { type: 'mortgage', playerId: B, squareId: 'blog' })
    const entries = record([], start, mortgaged.events).journal
    expect(entries).toMatchObject([{ actor: B, turn: 1 }])
    const paid = act(mortgaged.state, { type: 'payDebt', playerId: B })
    expect(record([], mortgaged.state, paid.events).journal).toMatchObject([{ actor: B, text: `Bob paie ${pwn(10)} à Alice` }])
  })

  it('writes the round of the engine on every entry', () => {
    const start = game({ current: 1, phase: { kind: 'postRoll', mayRollAgain: false } })
    const next = act(start, { type: 'endTurn', playerId: B }).state
    const rolled = rolling(next, [4, 3])
    expect(entriesOf(rolled, rollOf(rolled))).toMatchObject([{ turn: 2 }])
  })
})

describe('trades', () => {
  const KEY = cardIdByTitle('patch', 'Clé de déchiffrement')
  const start = game({
    overrides: [{ name: 'Nyx', keys: [KEY] }, { name: 'Joueur 1' }],
    ownership: { forum: { owner: A }, minitel: { owner: B, mortgaged: true }, blog: { owner: A } },
  })
  const offer = { from: A, to: B, give: { squares: ['forum'], cash: 0, keys: [] }, receive: { squares: [], cash: 150, keys: [] } }

  it('names the author, the recipient and the content of a proposal', () => {
    expect(entriesOf(start, { type: 'proposeTrade', playerId: A, offer })).toMatchObject([
      { actor: A, text: `Nyx propose à Joueur 1 : Forum contre ${pwn(150)}` },
    ])
  })

  it('lists several squares, PwnCoins and keys, and flags a mortgaged square', () => {
    const rich = {
      from: A,
      to: B,
      give: { squares: ['forum', 'blog'], cash: 50, keys: [KEY] },
      receive: { squares: ['minitel'], cash: 0, keys: [] },
    }
    expect(textsOf(start, { type: 'proposeTrade', playerId: A, offer: rich })).toEqual([
      `Nyx propose à Joueur 1 : Forum, Blog, ${pwn(50)} et 1\u00A0Clé de déchiffrement contre Minitel (en veille)`,
    ])
  })

  it('writes « rien » for an empty side', () => {
    const gift = { from: A, to: B, give: { squares: [], cash: 100, keys: [] }, receive: { squares: [], cash: 0, keys: [] } }
    expect(textsOf(start, { type: 'proposeTrade', playerId: A, offer: gift })).toEqual([`Nyx propose à Joueur 1 : ${pwn(100)} contre rien`])
  })

  it('writes the answer of the recipient with the content of the offer', () => {
    const proposed = act(start, { type: 'proposeTrade', playerId: A, offer }).state
    expect(entriesOf(proposed, { type: 'acceptTrade', playerId: B })).toMatchObject([
      { actor: B, text: `Joueur 1 accepte l’offre de Nyx : Forum contre ${pwn(150)}` },
    ])
    expect(entriesOf(proposed, { type: 'rejectTrade', playerId: B })).toMatchObject([
      { actor: B, text: `Joueur 1 refuse l’offre de Nyx : Forum contre ${pwn(150)}` },
    ])
  })

  it('names a counter-offer, then the answer to it as an answer to a counter-offer', () => {
    const proposed = act(start, { type: 'proposeTrade', playerId: A, offer }).state
    const counterOffer = { from: B, to: A, give: { squares: [], cash: 120, keys: [] }, receive: { squares: ['forum'], cash: 0, keys: [] } }
    const counter: Action = { type: 'counterTrade', playerId: B, offer: counterOffer }
    expect(entriesOf(proposed, counter)).toMatchObject([{ actor: B, text: `Joueur 1 fait une contre-proposition à Nyx : ${pwn(120)} contre Forum` }])
    const countered = act(proposed, counter).state
    expect(entriesOf(countered, { type: 'acceptTrade', playerId: A })).toMatchObject([
      { actor: A, text: `Nyx accepte la contre-proposition de Joueur 1 : ${pwn(120)} contre Forum` },
    ])
    expect(textsOf(countered, { type: 'rejectTrade', playerId: A })).toEqual([`Nyx refuse la contre-proposition de Joueur 1 : ${pwn(120)} contre Forum`])
  })

  it('elides « de » before the name of an author starting with a vowel', () => {
    const alice = game({ ownership: { forum: { owner: A } } })
    const proposed = act(alice, { type: 'proposeTrade', playerId: A, offer }).state
    expect(textsOf(proposed, { type: 'rejectTrade', playerId: B })).toEqual([`Bob refuse l’offre d’Alice : Forum contre ${pwn(150)}`])
  })
})

describe('game options', () => {
  const allTexts = (entries: JournalEntry[]) => entries.flatMap((entry) => [entry.text, ...entry.details.map((d) => d.text)])
  const withCard = (state: GameState, deck: 'exploit' | 'patch', title: string) => {
    const id = cardIdByTitle(deck, title)
    state.decks[deck] = [id, ...state.decks[deck].filter((c) => c !== id)]
    return state
  }

  it('tells who feeds the DMZ pot with a tax or a card', () => {
    const taxed = rolling(game({ settings: { dmzJackpot: true }, overrides: [{ position: 0 }] }), [2, 3])
    expect(allTexts(entriesOf(taxed, rollOf(taxed)))).toContain(`Alice alimente la cagnotte de ${pwn(200)}`)
    const billed = rolling(withCard(game({ settings: { dmzJackpot: true }, overrides: [{ position: 6 }] }), 'patch', 'Facture du fournisseur cloud'), [1, 1])
    expect(allTexts(entriesOf(billed, rollOf(billed)))).toContain(`Alice alimente la cagnotte de ${pwn(100)}`)
  })

  it('tells who wins the DMZ pot', () => {
    const start = rolling(game({ settings: { dmzJackpot: true }, overrides: [{ position: 17 }] }), [1, 2])
    start.dmzPot = 300
    expect(allTexts(entriesOf(start, rollOf(start)))).toContain(`Alice remporte la cagnotte de la DMZ : ${pwn(300)}`)
  })

  it('tells the double bonus of Boot once, after the salary', () => {
    const start = rolling(game({ settings: { doubleBootBonus: true }, overrides: [{ position: 35 }] }), [2, 3])
    const texts = allTexts(entriesOf(start, rollOf(start)))
    expect(texts.filter((text) => text.includes('passe par Boot'))).toEqual([`Alice passe par Boot et reçoit ${pwn(200)}`])
    expect(texts).toContain('Alice reçoit le bonus double de Boot')
  })

  it('tells the rent the owner in quarantine does not collect', () => {
    const start = rolling(
      game({
        settings: { noRentInQuarantine: true },
        current: 1,
        overrides: [{ position: 10, quarantine: { failedAttempts: 0 } }, { position: 14 }],
        ownership: { forum: { owner: A } },
      }),
      [1, 1],
    )
    const entries = entriesOf(start, rollOf(start))
    const waived = entries.find((entry) => entry.text === 'Alice ne perçoit pas de loyer (en quarantaine)')
    expect(waived?.actor).toBe(A)
  })

  it('gives the reason of the victory', () => {
    const start = game({ settings: { turnLimit: 30 }, current: 1, phase: { kind: 'postRoll', mayRollAgain: false } })
    start.turnNumber = 30
    const texts = textsOf(start, { type: 'endTurn', playerId: B })
    expect(texts.at(-1)).toMatch(/remporte la partie : limite de 30 tours atteinte$/)
  })
})

