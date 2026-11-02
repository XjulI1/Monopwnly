import type { Card, CardEffect, CardId, DeckKind } from '../types'

function card(deck: DeckKind, n: number, title: string, text: string, effect: CardEffect): Card {
  return { id: `${deck}-${String(n).padStart(2, '0')}`, deck, title, text, effect }
}

const KEY_TEXT = 'Conservez cette carte pour sortir de quarantaine, ou échangez-la.'

/** Exploit cards, mostly movements (see docs/plateau.md). */
export const EXPLOIT_CARDS: readonly Card[] = [
  card('exploit', 1, 'Redémarrage à chaud', 'Avancez jusqu’à Boot et encaissez le salaire.', { kind: 'moveTo', target: 0 }),
  card('exploit', 2, 'Escalade de privilèges', 'Avancez jusqu’au Noyau de l’IA.', { kind: 'moveTo', target: 39 }),
  card('exploit', 3, 'Pivot latéral', 'Avancez jusqu’à la Boutique en ligne ; salaire si vous passez par Boot.', {
    kind: 'moveTo',
    target: 19,
  }),
  card('exploit', 4, 'Ingénierie sociale', 'Avancez jusqu’au Fil d’actualité ; salaire si vous passez par Boot.', {
    kind: 'moveTo',
    target: 21,
  }),
  card('exploit', 5, 'Routage onion', 'Avancez jusqu’au Nœud Tor ; salaire si vous passez par Boot.', {
    kind: 'moveTo',
    target: 18,
  }),
  card(
    'exploit',
    6,
    'Tunnel chiffré',
    'Avancez jusqu’au nœud suivant. Libre : vous pouvez l’acheter. Possédé par un autre joueur : payez le double du loyer.',
    { kind: 'nextNode' },
  ),
  card(
    'exploit',
    7,
    'Tunnel chiffré',
    'Avancez jusqu’au nœud suivant. Libre : vous pouvez l’acheter. Possédé par un autre joueur : payez le double du loyer.',
    { kind: 'nextNode' },
  ),
  card(
    'exploit',
    8,
    'Ping',
    'Avancez jusqu’au service suivant. Libre : vous pouvez l’acheter. Possédé par un autre joueur : lancez les dés et payez 10 × le total.',
    { kind: 'nextService' },
  ),
  card('exploit', 9, 'Rollback', 'Reculez de 3 cases.', { kind: 'moveBack', steps: 3 }),
  card('exploit', 10, 'Bug bounty', 'Recevez 150 Ᵽ.', { kind: 'gain', amount: 150 }),
  card('exploit', 11, 'Minage chanceux', 'Recevez 50 Ᵽ.', { kind: 'gain', amount: 50 }),
  card('exploit', 12, 'Mise à jour forcée', 'Payez 25 Ᵽ par backdoor et 100 Ᵽ par rootkit.', {
    kind: 'payPerBuilding',
    perBackdoor: 25,
    perRootkit: 100,
  }),
  card('exploit', 13, 'Phishing raté', 'Payez 15 Ᵽ.', { kind: 'pay', amount: 15 }),
  card('exploit', 14, 'Repéré par l’antivirus', 'Allez en quarantaine, sans passer par Boot.', {
    kind: 'goToQuarantine',
  }),
  card('exploit', 15, 'Clé de déchiffrement', KEY_TEXT, { kind: 'decryptionKey' }),
  card('exploit', 16, 'Conférence de sécurité', 'Payez 50 Ᵽ à chaque autre joueur.', {
    kind: 'payEachPlayer',
    amount: 50,
  }),
]

/** Patch cards, mostly money (see docs/plateau.md). */
export const PATCH_CARDS: readonly Card[] = [
  card('patch', 1, 'Réinitialisation d’usine', 'Avancez jusqu’à Boot et encaissez le salaire.', {
    kind: 'moveTo',
    target: 0,
  }),
  card('patch', 2, 'Divulgation responsable', 'Recevez 200 Ᵽ.', { kind: 'gain', amount: 200 }),
  card('patch', 3, 'Abonnement oublié remboursé', 'Recevez 100 Ᵽ.', { kind: 'gain', amount: 100 }),
  card('patch', 4, 'Levée de fonds', 'Recevez 100 Ᵽ.', { kind: 'gain', amount: 100 }),
  card('patch', 5, 'Revente de vieux matériel', 'Recevez 50 Ᵽ.', { kind: 'gain', amount: 50 }),
  card('patch', 6, 'Victoire au CTF', 'Recevez 25 Ᵽ.', { kind: 'gain', amount: 25 }),
  card('patch', 7, 'Dons open source', 'Recevez 10 Ᵽ.', { kind: 'gain', amount: 10 }),
  card('patch', 8, 'Serveur de jeu partagé', 'Chaque autre joueur vous verse 10 Ᵽ.', {
    kind: 'collectFromEachPlayer',
    amount: 10,
  }),
  card('patch', 9, 'Facture du fournisseur cloud', 'Payez 100 Ᵽ.', { kind: 'pay', amount: 100 }),
  card('patch', 10, 'Assurance cyber', 'Payez 50 Ᵽ.', { kind: 'pay', amount: 50 }),
  card('patch', 11, 'Licence expirée', 'Payez 50 Ᵽ.', { kind: 'pay', amount: 50 }),
  card('patch', 12, 'Formation obligatoire', 'Payez 20 Ᵽ.', { kind: 'pay', amount: 20 }),
  card('patch', 13, 'Audit de sécurité', 'Payez 40 Ᵽ par backdoor et 115 Ᵽ par rootkit.', {
    kind: 'payPerBuilding',
    perBackdoor: 40,
    perRootkit: 115,
  }),
  card('patch', 14, 'Alerte du SOC', 'Allez en quarantaine, sans passer par Boot.', { kind: 'goToQuarantine' }),
  card('patch', 15, 'Clé de déchiffrement', KEY_TEXT, { kind: 'decryptionKey' }),
  card('patch', 16, 'Cache vidé', 'Reculez jusqu’au Minitel (sans passer par Boot).', {
    kind: 'moveBackTo',
    target: 1,
  }),
]

/** All 32 cards. */
export const CARDS: readonly Card[] = [...EXPLOIT_CARDS, ...PATCH_CARDS]

const byId = new Map(CARDS.map((c) => [c.id, c]))

/** Returns the card with the given identifier; throws for an unknown identifier. */
export function cardById(id: CardId): Card {
  const found = byId.get(id)
  if (!found) throw new Error(`Unknown card ${id}`)
  return found
}

/** Returns the identifier of the card with the given title in a deck (first match). */
export function cardIdByTitle(deck: DeckKind, title: string): CardId {
  const found = CARDS.find((c) => c.deck === deck && c.title === title)
  if (!found) throw new Error(`Unknown card ${title}`)
  return found.id
}
