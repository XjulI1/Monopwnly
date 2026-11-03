# Design

## Context

Le moteur expose `applyAction` et des requêtes en lecture (voir `add-rules-engine/design.md`) ; la
session de jeu de `add-game-ui` centralise `dispatch` et la file de présentation des événements.
L'IA se branche entre les deux : elle lit une vue de l'état, choisit une action, et la session la
soumet comme pour un humain. Motivation : proposal.md ; exigences : `specs/`.

Particularité par rapport à un jeu au tour par tour strict : un joueur peut devoir agir hors de son
tour (mise dans une enchère, dette envers un joueur qui a tiré « Serveur de jeu partagé »). La
boucle IA s'appuie donc sur « qui doit agir », pas sur « à qui est le tour ».

## Goals / Non-Goals

**Goals :**

- Une IA pure : `chooseAction(view, playerId, level) → Action`, testable sans interface, rejouable.
- Une seule boucle automatique, utilisée à l'identique dans l'application et dans le tournoi.
- Des heuristiques lisibles, réglables par constantes regroupées, sans apprentissage.
- Un tournoi qui mesure l'équilibre du plateau, pas seulement la force des niveaux.

**Non-Goals :**

- Pas d'échanges (arrivent avec `add-trading`).
- Pas de recherche arborescente ni de simulation de parties pour décider.
- Pas de prise en compte des options de `add-game-options` (elle y sera ajoutée).

## Decisions

### Arborescence

```
src/ai/
  index.ts                 chooseAction, playUntilHumanOrEnd (boucle automatique)
  playerView.ts            projection de l'état sur l'information visible
  landingOdds.ts           fréquence d'arrivée sur chaque case (chaîne de Markov du plateau)
  valuation.ts             valeur d'une case, d'une famille, d'une construction ; réserve de sécurité
  levels/strategy.ts       règles communes (enchère, dette, quarantaine, choix de construction)
  levels/easy.ts, levels/normal.ts, levels/hard.ts
  constants.ts             seuils et primes de chaque niveau
  worker.ts                Web Worker : reçoit (vue, joueur, niveau), renvoie l'action
  workerProtocol.ts        messages échangés avec le worker
  tournament/
    runTournament.ts       boucle de parties simulées et agrégation des mesures
    balance.test.ts        tournoi d'équilibrage (pnpm test:balance)
    strength.test.ts       tournoi de force des niveaux (pnpm test)
```

`src/ai/**` est ajouté à la règle ESLint qui interdit `vue`, `three` et `@tresjs/*` ; le client du
worker lié à Vue vit dans `src/game/`.

### Qui doit agir

Requête moteur `expectedActor(state)`, déjà présente depuis `add-rules-engine` : joueur courant en
`preRoll`, `buyDecision` et `postRoll` ;
`nextBidder` en `auction` ; `debtor` en `debt` ; `null` en `gameOver`. La session déclenche l'IA
quand ce joueur est une IA et qu'aucune présentation n'est en cours. Ainsi un humain qui refuse un
achat voit les IA miser chacune à son tour, et une IA débitrice hors de son tour règle sa dette.

### Vue joueur : l'anti-triche par le type

`playerView(state)` produit un `PlayerView`, le même pour tous les joueurs, sans `decks` détaillés (remplacés par leur
taille) ni `rngState`. Tout le reste est public dans ce genre de jeu (argent, propriétés,
constructions, Clés détenues, position). Les fonctions de `levels/` ne reçoivent que ce type :
accéder à l'ordre des paquets devient une erreur de typage. Les requêtes moteur utilisées par l'IA
(actions légales, patrimoine disponible) sont typées pour accepter une `PlayerView`.

### Décisions sans aléa

Les règles de chaque niveau sont déterministes et les égalités se départagent dans l'ordre du
plateau : une IA n'a pas besoin d'aléa propre. Même vue → même décision ; le générateur de la partie
n'est jamais consommé par l'IA. (Un générateur dérivé d'un hachage de la vue, prévu au départ, a été
retiré faute d'usage.)

### Fréquences d'arrivée

`landingOdds` calcule une fois, à partir des seules données du plateau (40 cases, déplacements des
cartes, quarantaine, triple double), la distribution stationnaire de la position d'un pion par
itération de la chaîne de Markov. Elle est mémorisée et sert au calcul du loyer espéré par tour :
`loyerEspéré(case) = fréquence(case) × loyer(case) × nombre d'adversaires`. C'est public et
déterministe : aucune triche.

### Valeur d'une case

`valuation.ts` estime en PwnCoins ce que vaut une case pour un joueur donné :

- valeur de base : prix de la case ;
- prime de famille : si la case complète ou approche une famille (pour soi), ou empêche un
  adversaire de la compléter (blocage) ;
- rendement espéré : loyer espéré par tour au niveau de construction atteignable, sur un horizon de
  tours restants estimé d'après l'argent total en jeu.

Le niveau facile n'utilise que la valeur de base, le normal ajoute la prime de famille pour soi,
le difficile ajoute le blocage et le rendement espéré. Les niveaux normal et difficile décotent un
système d'une famille dont un adversaire possède déjà un système, et refusent de l'acheter : sans
échanges, elle ne peut pas être complétée, et le laisser aux enchères permet à celui qui a commencé
la famille de la compléter. Sans cette règle, mesurée par le tournoi, les familles s'éparpillaient
et la plupart des parties atteignaient la limite de 300 tours.

### Réserve de sécurité

`reserve(view, player)` = loyer maximal que le joueur risque de payer au prochain tour, pondéré par
les fréquences d'arrivée des cases adverses à portée (2 à 12 cases), multiplié par un facteur de
prudence propre au niveau. Une IA ne dépense (achat, mise, construction, réactivation) que l'argent
au-dessus de cette réserve, sauf exception du niveau (achat qui complète une famille).

### Structure d'une décision

Chaque niveau implémente une fonction par phase : `preRoll` (gestion puis lancer ou sortie de
quarantaine), `buyDecision`, `auction`, `debt`, `postRoll` (gestion puis `endTurn` ou relance).
`chooseAction` aiguille sur la phase. La gestion (construire, réactiver) se fait une action à la fois :
l'IA renvoie la prochaine construction utile, et la boucle la rappelle jusqu'à ce qu'elle renvoie
l'action de sortie (`rollDice` ou `endTurn`). Garde-fou : 40 actions de gestion par phase au plus.

### Dettes

En `debt`, toutes les IA appliquent l'ordre : revendre d'abord les backdoors des familles au plus
faible loyer espéré, puis mettre en veille les cases isolées (hors famille complète), puis les
familles complètes sans constructions, en finissant par les plus rentables ; `payDebt` dès que le
premier paiement est couvert ; `declareBankruptcy` seulement quand le patrimoine disponible ne
suffit pas. Le niveau facile prend les cases dans l'ordre du plateau, sans pondération.

### Rythme et worker

`worker.ts` exécute `chooseAction` et renvoie l'action. La session envoie la vue, attend la réponse,
attend le délai de la vitesse courante (aucun en « instantanée »), puis appelle `dispatch`. Si l'état
a changé entre-temps (partie quittée), la réponse est ignorée. Les tests appellent `chooseAction`
directement, sans worker. Raison du worker : le niveau difficile recalcule loyers espérés et réserves
à chaque décision ; cumulés dans un tour chargé (plusieurs constructions), ces calculs pourraient
dépasser une frame sur tablette, et le worker garantit des animations fluides sans avoir à le
mesurer d'abord.

La table des vitesses gagne deux durées : la pause avant chaque action d'une IA (`aiPause` :
600 ms en normale, 250 ms en rapide, 0 en instantanée) et l'affichage d'une carte tirée par une IA
(`aiCard` : 2,4 s et 1,4 s), qui se ferme seule alors que celle d'un humain attend son toucher.
Tant que le joueur attendu est une IA, `viewOf` ne propose aucune commande de jeu et nomme l'IA qui
réfléchit. `dispose()`, appelé quand l'écran de partie se démonte, ignore toute réponse en vol et
annule pauses, attentes et badges.

### Tournoi

`runTournament({ games, players, levels, seeds, maxTurns })` joue des parties avec
`playUntilHumanOrEnd` sans interface et agrège : tours par partie (moyenne, médiane, 90e centile),
parties interrompues par la limite de sécurité, taux de victoire par place dans l'ordre de jeu et par
niveau, revenu de loyers par famille. Deux usages :

- `strength.test.ts` (dans `pnpm test`) : court, vérifie l'ordre des niveaux ;
- `balance.test.ts` (`pnpm test:balance`, activé par `MONOPWNLY_BALANCE=1`) : plusieurs centaines de
  parties, imprime un rapport et échoue si les critères d'équilibre de la spec ne sont pas tenus.

La limite de sécurité (300 tours de table par défaut) n'est pas une règle du jeu : une partie
interrompue est comptée comme telle et pèse dans les critères.

### Moteur et création de partie

Le joueur du moteur reçoit `controller: { kind: 'human' } | { kind: 'ai'; level: 'easy' | 'normal' | 'hard' }`.
Le formulaire de création ajoute un choix Humain / IA par joueur et un niveau unique pour toutes les
IA ; chaque IA reçoit un pseudonyme tiré d'une liste d'une vingtaine de pseudonymes de hackers
inventés (`AI_NAMES` dans `src/game/setupForm.ts`), sans doublon dans la partie. Le moteur garde un
niveau par joueur pour que le tournoi mélange les niveaux.

## Risks / Trade-offs

- [Parties trop longues entre IA prudentes] → le tournoi mesure les interruptions ; ajuster d'abord
  les facteurs de prudence, puis les loyers de `docs/plateau.md` si nécessaire.
- [Le tournoi ne montre pas la progression attendue entre niveaux] → constantes centralisées dans
  `constants.ts`, tournoi de force rapide.
- [Enchères interminables entre IA] → chaque IA mise au plus sa valeur estimée, par paliers d'au
  moins 10 Ᵽ ; l'enchère converge en un nombre borné de tours.
- [Worker indisponible en test] → `chooseAction` reste une fonction pure appelée directement ; seul
  le client du worker est testé avec un faux worker.
- [Valeurs de loyers réajustées par le tournoi] → toute modification met à jour `docs/plateau.md` et
  `board/squares.ts` ensemble, avec les tests d'invariants du plateau.

## Migration Plan

Sans objet. Les parties créées avant ce change n'existent pas encore en sauvegarde
(`add-save-and-journal` vient après).
