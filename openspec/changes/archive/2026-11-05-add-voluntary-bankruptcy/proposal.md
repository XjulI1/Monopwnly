## Why

Aujourd'hui, on ne quitte une partie que par une faillite subie, au moment où un loyer ou une taxe
ne peut plus être payé. Un joueur distancé, humain ou IA, doit donc jouer des dizaines de tours
dont l'issue est connue, en attendant le coup de grâce. Un humain qui écrase une IA en duel subit la
même attente. L'abandon, c'est-à-dire la faillite déclarée de soi-même, raccourcit ces fins de
partie, et une IA qui sait reconnaître une partie perdue la rend plus crédible.

## What Changes

- **Moteur** : `declareBankruptcy` est aussi accepté pendant son propre tour, avant le lancer
  (quarantaine comprise) ou après, même s'il reste un double à rejouer. Hors dette, il n'y a pas de
  créancier : l'abandon est une faillite envers la banque. Les constructions sont revendues à la
  banque, l'argent lui revient, les systèmes redeviennent libres et actifs, sans enchère, et les
  Clés retournent sous leur paquet. La partie passe au joueur suivant ou se termine s'il ne reste
  qu'un joueur. L'événement `bankrupt` indique si la faillite était volontaire.
- **IA** : au début de son tour, une IA de n'importe quel niveau abandonne quand sa partie est
  perdue, c'est-à-dire quand deux conditions sont réunies. D'une part, son patrimoine ne dépasse pas
  15 % de celui de l'adversaire le plus riche. D'autre part, les loyers qu'elle s'attend à
  payer à chaque tour de table dépassent ce qu'elle s'attend à gagner, au point de vider en moins de
  cinq tours de table tout ce qu'elle peut réunir. Dans tous les autres cas, elle continue de jouer.
- **Interface** : pendant son tour, un humain dispose d'un bouton « Abandonner », placé à l'écart
  des actions du tour. Une confirmation lui rappelle que ses systèmes retournent à la banque. Le
  plateau annonce « <nom> abandonne » quand un joueur abandonne, humain ou IA.
- **Journal et statistiques** : « <joueur> abandonne et se déclare en faillite », dépliable comme
  une faillite. Les statistiques et l'écran de fin affichent « Abandon au tour <n> » au lieu de
  « Faillite au tour <n> au profit de la banque ».
- **Sauvegarde** : nouveau format. À la migration, les faillites déjà enregistrées sont marquées
  comme subies.
- **Tournois** : le rapport compte les abandons. Les critères de force des niveaux et d'équilibre du
  plateau doivent rester tenus.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `debt-and-bankruptcy` : nouvelle exigence d'abandon pendant son tour, qui est une faillite envers
  la banque marquée comme volontaire.
- `turn-controls` : bouton « Abandonner » et sa confirmation pendant le tour, annonce de l'abandon
  sur le plateau.
- `ai-strategy` : nouvelle exigence d'abandon d'une partie perdue, avec son critère.
- `game-journal` : entrée d'abandon, dépliable comme une faillite.
- `game-statistics` : le compteur de faillite indique si elle était volontaire.
- `game-screens` : l'écran de fin affiche « Abandon au tour <n> » pour un joueur qui a abandonné.
- `game-persistence` : migration des sauvegardes au format précédant l'abandon.
- `ai-balance-tournament` : le rapport compte les abandons.

## Hors périmètre

- Abandon hors de son tour : pendant le tour d'un autre joueur, une enchère ou une offre d'échange.
  Le moteur ne fait agir que le joueur attendu, et le joueur peut abandonner dès son tour suivant.
- Abandon au profit d'un autre joueur, ou mise aux enchères des systèmes abandonnés : les biens
  retournent à la banque, comme pour une faillite envers la banque.
- Abandon d'une IA pendant un règlement de dette : elle garde sa règle actuelle (payer, lever des
  fonds, ou déclarer faillite si son patrimoine disponible ne suffit pas).
- Réglage à la création pour empêcher les IA d'abandonner, ou pour régler leur seuil.
- Fin de partie quand le dernier humain abandonne : comme après une faillite subie aujourd'hui, les
  IA restantes finissent la partie entre elles. Aucun arrêt anticipé ni résultat simulé n'est prévu.
- Partie nulle ou abandon collectif par consentement.

## Impact

- Moteur (`src/engine/index.ts`, `payments.ts`, `queries.ts`, `types.ts`) : phases autorisées de
  `declareBankruptcy`, faillite volontaire envers la banque, champ `voluntary` de l'événement
  `bankrupt`, actions légales avant et après le lancer.
- IA (`src/ai/`) : critère de partie perdue (patrimoine, pertes espérées par tour de table) et
  abandon au début du tour, pour les trois niveaux, avec des seuils dans `constants.ts`.
- Interface (`src/game/interaction.ts`, `presentation.ts`, `TurnActions.vue`, `GameScreen.vue`) :
  bouton « Abandonner », confirmation, annonce de l'abandon.
- Journal et statistiques (`src/game/history/`) : entrée d'abandon, champ `voluntary` de la
  faillite, ligne « Abandon au tour <n> ».
- Sauvegarde (`src/game/savedGame.ts`) : format 5, migration du format 4.
- Tournois (`src/ai/tournament/`) : comptage des abandons, relance des tournois de force et
  d'équilibrage, nouvelle capture de la partie de non-régression.
- Tests de parties aléatoires (`fullGame.test.ts`, `presentation.test.ts`) : les joueurs aléatoires
  n'abandonnent jamais.
- Aucune nouvelle dépendance.
