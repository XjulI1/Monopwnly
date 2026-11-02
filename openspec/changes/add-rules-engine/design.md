# Design

## Context

Dépôt vierge (voir proposal.md, section Why). Ce change pose le socle technique et le moteur de
règles sur lequel les changes suivants (plateau 3D, UI, IA, sauvegarde, échanges, options)
viendront se brancher. Les exigences fonctionnelles sont dans `specs/` ; ce document ne décrit que
la manière de les implémenter. Le contenu du plateau (noms, valeurs, cartes) est la référence de
`docs/plateau.md`.

Contraintes structurantes :

- le moteur ne dépend ni de Vue ni de Three.js, pour être testé seul et réutilisé tel quel par l'IA ;
- l'état doit être du JSON pur pour la sauvegarde en localStorage prévue dans `add-save-and-journal` ;
- l'IA (`add-heuristic-ai`) simulera des parties entières, y compris en tournoi pour équilibrer les
  loyers : le moteur doit rester rapide et sans effet de bord.

## Goals / Non-Goals

**Goals :**

- Une API unique et étroite : créer une partie, appliquer une action, interroger l'état.
- Des erreurs de règle typées que l'UI pourra afficher et que l'IA pourra ignorer.
- Des événements assez riches pour piloter les animations (dés, déplacement case par case, cartes,
  paiements) et le journal.
- Des points d'extension prévus pour les échanges et les options, sans les implémenter.

**Non-Goals :**

- Aucune réactivité Vue ni store : l'intégration à Vue viendra avec `add-game-ui`.
- Aucune géométrie du plateau (coordonnées 3D) : elle viendra avec `add-3d-board`.
- Pas d'annulation de coup (undo).
- Pas d'échanges entre joueurs (`add-trading`) ni de règles optionnelles hors enchères
  (`add-game-options`).

## Decisions

### Arborescence

```
src/
  engine/
    index.ts            API publique (createGame, applyAction, requêtes)
    types.ts            GameState, Phase, Action, GameEvent, RuleError, GameSettings
    rng.ts              générateur à graine
    board/
      squares.ts        les 40 cases et leurs valeurs
      cards.ts          cartes Exploit et Patch
    setup.ts            création d'une partie
    movement.ts         dés, déplacement, Boot, arrivée sur une case
    quarantine.ts
    acquisition.ts      achat et enchère
    rent.ts             calcul des loyers et des taxes
    cards.ts            pioche et résolution des cartes
    development.ts      constructions, revente, mise en veille
    payments.ts         paiements, dettes, faillite
    turn.ts             transitions de phase, fin de tour, victoire
    queries.ts          requêtes en lecture pour l'UI et l'IA (patrimoine, actions possibles…)
    *.test.ts           tests colocalisés
  App.vue
  main.ts
```

### Modèle « réducteur » : `applyAction(state, action) → ActionResult`

```ts
type ActionResult =
  | { ok: true; state: GameState; events: GameEvent[] }
  | { ok: false; error: RuleError }
```

Les actions forment une union discriminée, chacune portant le `playerId` de son auteur :

| Action | Phase | Auteur |
|---|---|---|
| `rollDice` | `preRoll` (y compris en quarantaine, pour tenter un double), `postRoll` après un double | joueur courant |
| `payQuarantineFine`, `useDecryptionKey` | `preRoll` en quarantaine | joueur courant |
| `buyProperty`, `declineProperty` | `buyDecision` | joueur courant |
| `placeBid { amount }`, `passBid` | `auction` | enchérisseur attendu |
| `buildBackdoor`, `sellBackdoor { squareId }` | `preRoll`, `postRoll`, `debt` (revente seulement) | joueur courant ou débiteur |
| `mortgage`, `unmortgage { squareId }` | `preRoll`, `postRoll`, `debt` (mise en veille seulement) | joueur courant ou débiteur |
| `payDebt`, `declareBankruptcy` | `debt` | débiteur |
| `endTurn` | `postRoll` sans double à rejouer | joueur courant |

`buildBackdoor` ajoute une backdoor, ou un rootkit si le système en a déjà 4 ; `sellBackdoor` fait
l'inverse (un rootkit revendu redevient 4 backdoors si le stock le permet, sinon la revente est
refusée). Un seul couple d'actions pour les deux niveaux de construction garde l'API étroite.

`RuleError` porte un `code` littéral (`NOT_YOUR_TURN`, `WRONG_PHASE`, `NOT_OWNER`,
`INSUFFICIENT_FUNDS`, `GROUP_INCOMPLETE`, `UNEVEN_BUILDING`, `NO_STOCK`, `MORTGAGED`,
`HAS_BUILDINGS`, `NOT_BUILDABLE`, `MUST_ROLL_AGAIN`, `INVALID_BID`, `NO_KEY`,
`DEBT_NOT_COVERED`, `GAME_OVER`, …) et un message en
français affichable tel quel.

Alternatives écartées :

- **Classe `Game` avec méthodes mutables** : incompatible avec la sérialisation directe et dangereux
  pour l'IA qui explore des branches.
- **Machine à états XState** : dépendance lourde ; un champ `phase` en union discriminée suffit et
  reste du JSON.

### Immutabilité par copie à l'entrée

`applyAction` fait un `structuredClone` de l'état puis les fonctions de règles modifient cette copie.
L'état fait quelques kilo-octets : le coût est négligeable. Un test vérifie que l'état d'entrée n'est
jamais modifié.

### Forme de l'état

```ts
type GameState = {
  settings: GameSettings
  boardId: 'monopwnly'
  players: Player[]
  ownership: Record<SquareId, { owner: PlayerId; mortgaged: boolean; level: 0 | 1 | 2 | 3 | 4 | 5 }>
  bankStock: { backdoors: number; rootkits: number }
  decks: { exploit: CardId[]; patch: CardId[] }
  currentPlayerIndex: number
  doublesInARow: number
  turnNumber: number
  lastRoll: [number, number] | null
  phase: Phase
  rngState: number
  winner: PlayerId | null
}

type Player = {
  id: PlayerId
  name: string
  color: PlayerColor
  cash: number
  position: number
  quarantine: { failedAttempts: number } | null
  keys: CardId[]
  bankrupt: boolean
}
```

`ownership` ne contient que les cases achetables possédées : une case absente est à la banque.
`level` vaut 0 à 4 backdoors, 5 pour un rootkit (toujours 0 pour un nœud ou un service).

`Phase` est une union discriminée qui porte ses propres données :

- `{ kind: 'preRoll' }` : avant le lancer (gestion, puis lancer ou sortie de quarantaine) ;
- `{ kind: 'buyDecision'; squareId }` ;
- `{ kind: 'auction'; squareId; highBid; highBidder; bidders: PlayerId[]; nextBidder }` ;
- `{ kind: 'debt'; debtor; payments: Payment[]; resume: ResumePoint }` où
  `Payment = { to: PlayerId | 'bank'; amount }` et `resume` dit où reprendre une fois la dette
  réglée : `postRoll`, `moveAfterFine` pour l'amende forcée au troisième échec de quarantaine (le
  joueur avance ensuite du total de ce lancer), ou `collectFrom { payers: PlayerId[] }` quand une
  carte fait payer chaque autre joueur à tour de rôle (le payeur suivant est débité une fois la
  dette en cours réglée ou soldée par une faillite) ;
- `{ kind: 'postRoll'; mayRollAgain: boolean }` ;
- `{ kind: 'gameOver' }`.

Le plateau et les cartes ne sont pas copiés dans l'état : `boardId` les référence. Pas de `Map` ni de
`Set` : `JSON.parse(JSON.stringify(state))` est l'identité.

### Déroulé d'un lancer

`rollDice` tire deux dés, puis enchaîne en une seule action : contrôle du triple double, déplacement
case par case (salaire au passage de Boot), résolution de l'arrivée (achat, loyer, taxe, carte,
Détecté !). La résolution peut s'arrêter sur une phase en attente (`buyDecision`, `auction`,
`debt`) ; la reprise se fait par les actions correspondantes, puis la partie passe en `postRoll`.
Une carte qui déplace le joueur relance la résolution de l'arrivée sur la nouvelle case, avec ses
modificateurs (double loyer du « Tunnel chiffré », loyer × 10 du « Ping »).

L'événement `moved` porte la liste des cases traversées pour que le plateau anime le pion case par
case, et `passedBoot` est émis au passage.

### Paiements et dettes

Tout paiement passe par une fonction unique `charge(state, debtor, payments, resume)` : si l'argent
suffit, les paiements sont faits dans l'ordre et des événements `paid` sont émis ; sinon la partie
passe en `debt` avec les paiements restants. `payDebt` règle les paiements tant que l'argent suffit ;
il est refusé (`DEBT_NOT_COVERED`) si le premier paiement restant n'est pas couvert.
`declareBankruptcy` transfère les biens au créancier du premier paiement restant (joueur ou banque)
puis abandonne les paiements suivants. Le patrimoine disponible (argent + reventes + mises en
veille possibles) est exposé par une requête pour que l'UI et l'IA sachent si la faillite est
inévitable.

### Enchère

L'enchère est une phase et non une action atomique, pour que l'UI montre chaque mise et que l'IA
enchérisse comme un joueur. `bidders` est la liste des joueurs encore en lice, dans l'ordre de jeu à
partir de celui qui a refusé l'achat ; `nextBidder` tourne parmi eux. Elle se termine quand il ne
reste qu'un enchérisseur ayant misé, ou quand tous ont passé sans mise.

### Générateur aléatoire

mulberry32 avec état entier stocké dans `rngState`. Mélanges par Fisher-Yates sur ce générateur.
`Math.random` n'est utilisé nulle part dans le moteur ; seul l'appelant choisit la graine. Les tests
de règles qui ont besoin de dés précis passent par une fonction utilitaire de test qui construit un
état avec une graine produisant le lancer voulu, ou appellent directement les fonctions pures
(`moveBy`, `resolveLanding`) avec un lancer fixé.

### Points d'extension

- **Échanges** (`add-trading`) : ajouteront une phase `tradeOffer` et les actions `proposeTrade`,
  `acceptTrade`, `rejectTrade`, autorisées depuis `preRoll`, `postRoll` et `debt`.
- **Options** (`add-game-options`) : `GameSettings` est un objet plat (`{ auctions: boolean }` ici) ;
  les options y ajouteront leurs champs avec valeurs par défaut. Le calcul des loyers, l'arrivée
  sur Boot et la DMZ, la règle d'uniformité et l'évaluation de la victoire sont chacun dans une
  fonction dédiée, pour que l'option s'y branche sans toucher au reste.
- **Victoire** évaluée par une fonction de `turn.ts` appelée après chaque faillite ; les fins
  alternatives s'y ajouteront.

### Garde-fou d'architecture

Une règle ESLint `no-restricted-imports` interdit d'importer `vue`, `three` ou `@tresjs/*` depuis
`src/engine/**`.

### Outillage

- Vite + `@vitejs/plugin-vue`, TypeScript `strict` avec `noUncheckedIndexedAccess`.
- Vitest en environnement `node` pour le moteur.
- `vue-tsc --noEmit` pour la vérification de types.
- ESLint en configuration « flat » avec `typescript-eslint` et `eslint-plugin-vue`.
- Scripts : `dev`, `build`, `test`, `test:watch`, `lint`, `type-check`.
- Champ `packageManager` dans `package.json` pour figer la version de pnpm.

Tailwind et TresJS ne sont pas installés ici : ils arrivent avec les changes qui les utilisent.

## Risks / Trade-offs

- [Valeurs du plateau mal recopiées depuis `docs/plateau.md`] → tests d'invariants (40 cases,
  décomptes par type, loyers croissants, valeur de veille = moitié du prix) et test de quelques
  lignes de référence.
- [Loyers déséquilibrés : parties trop longues ou trop courtes] → valeurs isolées dans
  `board/squares.ts` ; mesure par tournoi d'IA dans `add-heuristic-ai`.
- [Partie qui ne se termine jamais entre IA prudentes] → le tournoi d'IA impose une limite de tours
  de sécurité côté test ; la limite de tours jouable arrive avec `add-game-options`.
- [Le modèle de phases ne couvre pas un cas découvert plus tard] → phases en union discriminée :
  ajouter un cas fait échouer le typage partout où il faut le traiter.
- [Simplifications de règles] → listées et à valider dans `TODO.md`, section « Décisions de règles ».

## Migration Plan

Sans objet (projet vierge).
