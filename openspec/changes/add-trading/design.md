# Design

## Context

Le moteur (`add-rules-engine/design.md`) a prévu ce point d'extension : une phase `tradeOffer` et
les actions `proposeTrade`, `acceptTrade`, `rejectTrade`, autorisées depuis `preRoll`, `postRoll` et
`debt`. L'IA (`add-heuristic-ai`) dispose de `PlayerView`, `valuation.ts`, `landingOdds.ts` et de la
requête `actingPlayerId`. La sauvegarde et le journal (`add-save-and-journal`) sérialisent l'état et
consignent les événements. Motivation : proposal.md ; exigences : `specs/`.

## Goals / Non-Goals

**Goals :**

- Un échange est une seule transaction atomique et validée par le moteur, à la proposition comme à
  l'acceptation.
- Une IA qui ne se laisse pas dépouiller par une offre déséquilibrée et qui ne donne pas une famille
  complète à un adversaire sans contrepartie à la hauteur.
- Une interface qui rend un échange lisible d'un coup d'œil, à la souris comme au tactile.

**Non-Goals :**

- Pas de contre-proposition, pas de négociation en plusieurs allers-retours.
- Pas d'échange de constructions, ni de promesse future (« loyer gratuit pendant 3 tours »).

## Decisions

### Modèle de l'offre

```ts
type TradeSide = { squares: SquareId[]; cash: number; keys: CardId[] }
type TradeOffer = { from: PlayerId; to: PlayerId; give: TradeSide; receive: TradeSide }
```

`give` est ce que `from` donne, `receive` ce qu'il demande à `to`. Actions :

| Action | Phase | Auteur |
|---|---|---|
| `proposeTrade { offer }` | `preRoll`, `postRoll` (joueur courant) ; `debt` (débiteur) | `offer.from` |
| `acceptTrade`, `rejectTrade` | `tradeOffer` | `offer.to` |

Nouvelle phase : `{ kind: 'tradeOffer'; offer: TradeOffer; resume: Phase }`. `resume` est la phase
d'origine, restaurée telle quelle après la réponse (une dette en cours reste en cours, avec ses
paiements). `actingPlayerId` renvoie `offer.to` dans cette phase.

### Validation

Contrôlée à la proposition, et de nouveau à l'acceptation (l'état n'a pas pu changer entre les deux,
mais la double validation coûte peu et protège d'une sauvegarde altérée) :

- `from` ≠ `to`, `to` non en faillite ;
- au moins un élément au total dans l'offre ;
- chaque case appartient au bon côté, et aucune case de sa famille ne porte de construction
  (`HAS_BUILDINGS`) ;
- montants entiers, positifs ou nuls, au plus égaux à l'argent du joueur concerné
  (`INSUFFICIENT_FUNDS`) ;
- Clés détenues par le bon côté (`NO_KEY`) ;
- limite de propositions (`TRADE_LIMIT_REACHED`) et proposition déjà refusée (`TRADE_ALREADY_REJECTED`).

### Limites par tour

`GameState` gagne `tradeLimits: { turnNumber: number; byPlayer: Record<PlayerId, { count: number; rejected: string[] }> }`,
remis à zéro quand `turnNumber` change. La clé d'une offre refusée est sa forme canonique sérialisée
(listes triées) pour qu'un réordonnancement des cases ne contourne pas la règle. Le compteur est par
auteur : un débiteur hors de son tour a ses propres trois propositions.

### Transfert

`acceptTrade` transfère cases (avec leur état de veille), argent et Clés en une fois, puis émet
`tradeAccepted { offer }`. Aucun paiement ne passe par `charge` : un échange ne peut pas créer de
dette, puisque les montants sont plafonnés par l'argent disponible. `proposeTrade` émet
`tradeProposed`, `rejectTrade` émet `tradeRejected`.

### Journal et sauvegarde

Les trois événements sont rendus dans le journal par le formateur existant de
`add-save-and-journal` (« Nyx propose à Joueur 1 : Forum contre 150 Ᵽ », « … accepte », « … refuse »).
La version du format de sauvegarde est incrémentée ; une sauvegarde antérieure, sans `tradeLimits`,
reçoit une valeur vide au chargement.

### IA : évaluation d'une offre

`src/ai/trade/evaluateOffer.ts` calcule pour le destinataire un gain net en PwnCoins :

```
gain = Σ valeur(cases reçues) − Σ valeur(cases données) + argent reçu − argent donné
       + valeur(Clés reçues) − valeur(Clés données) − danger(offre)
```

- `valeur` réutilise `valuation.ts` du niveau, calculée sur l'état **après** l'échange, pour que la
  prime de famille complète n'apparaisse que si l'échange la complète réellement.
- `danger` (normal et difficile) : pour chaque famille que l'échange complète chez l'autre joueur,
  le loyer espéré de cette famille à trois backdoors (difficile : au niveau que l'autre peut payer
  avec son argent après l'échange) sur un horizon de tours, multiplié par le nombre de joueurs
  exposés ; le niveau facile l'ignore.
- Le niveau difficile ajoute une pénalité quand l'échange fait passer l'autre joueur en tête du
  patrimoine.

Décision : accepter si `gain ≥ seuil(niveau) × valeur totale échangée` (facile 0 % sur les prix
seuls, normal 10 %, difficile 20 %), refuser sinon.

### IA : génération d'offres

`src/ai/trade/proposeOffers.ts`, appelé en `preRoll` et `postRoll` avant le lancer ou la fin du tour :

- facile : ne propose jamais ;
- normal : quand il lui manque une seule case pour compléter une famille et qu'un autre joueur la
  détient sans en tirer de famille, propose de l'acheter contre de l'argent, à un prix croissant
  (prix de la case, puis +50 %, puis +100 %) dans la limite de sa réserve ;
- difficile : en plus, cherche des échanges croisés où chacun complète une famille, et ne les
  propose que si sa famille obtenue a un loyer espéré supérieur à celle qu'il cède ; ajoute de
  l'argent pour rendre l'offre acceptable selon sa propre estimation de l'évaluation adverse (avec
  le seuil du niveau normal, faute de connaître le niveau d'un humain).

En `debt`, normal et difficile proposent la vente d'une case hors famille complète contre de l'argent
(au moins 1,5 × sa valeur de veille) au joueur le plus riche qui n'est pas le créancier, avant de
mettre en veille.

Une IA respecte les limites du moteur, ne répète jamais une offre refusée et propose au plus une
offre par destinataire et par tour. Comme pour toute décision, l'offre est dérivée de la vue et de
`aiRandom` : même vue, même offre.

### Interface

- **Bouton « Échanger »** dans le HUD en `preRoll`, `postRoll` et `debt`, quand le joueur qui agit
  est humain ; indique les propositions restantes du tour.
- **Panneau de composition** (`TradeComposer.vue`) : choix du partenaire, deux colonnes « Vous
  donnez » / « Vous demandez » listant les cases de chacun (cases non échangeables grisées avec la
  raison), saisie de PwnCoins par pas de 10 Ᵽ avec plafond, Clés ; bouton « Proposer » actif
  seulement si l'offre est valide (validation par une requête moteur `validateTrade`).
- **Fenêtre de réception** (`TradeOfferDialog.vue`) : titre « <nom> vous propose un échange »,
  résumé en deux colonnes, cases concernées mises en avant sur le plateau, boutons « Accepter » et
  « Refuser ». Entre deux humains, la fenêtre s'adresse nommément au destinataire, sans écran de
  passage de main (aucune information n'est cachée dans ce jeu).
- Quand un humain propose à une IA : « <nom> étudie votre offre… », puis un message de résultat.

### Tournois

Le tournoi de force et le tournoi d'équilibrage (`add-heuristic-ai`) sont relancés avec les échanges
activés : les échanges raccourcissent les parties, et les critères de durée doivent rester tenus.

## Risks / Trade-offs

- [Un humain exploite l'IA facile par des offres déséquilibrées sur la valeur stratégique] → assumé :
  c'est le niveau facile ; les niveaux normal et difficile intègrent le danger.
- [Boucle de propositions entre deux IA] → limites du moteur (trois par tour, pas de répétition) et
  une offre par destinataire et par tour côté IA.
- [L'IA trop méfiante n'accepte jamais rien] → le tournoi mesure le nombre d'échanges acceptés par
  partie ; seuils ajustables dans `constants.ts`.
- [Parties raccourcies au point de sortir des critères d'équilibre] → relance de `pnpm test:balance`
  dans les tâches ; ajuster les seuils d'échange avant les loyers.

## Migration Plan

Sauvegardes antérieures : chargées avec `tradeLimits` vide, version de format incrémentée. Aucune
autre migration.
