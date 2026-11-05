## Context

`declareBankruptcy` n'est aujourd'hui accepté qu'en phase `debt` (`ALLOWED_PHASES` dans
`src/engine/index.ts`). `payments.ts` choisit le créancier d'après le premier paiement restant, puis
transfère les biens au créancier ou les rend à la banque. Il enchaîne ensuite sur `checkLastStanding`,
puis sur `finishTurn` si le failli était le joueur courant, ou sur le point de reprise de la dette
sinon. L'interface sait déjà demander une confirmation de faillite : le drapeau
`confirmingBankruptcy` d'`Interaction`, les boutons `confirmBankruptcy` et `cancelBankruptcy` et le
`ConfirmDialog` de `DebtPanel.vue`. Le raccourci clavier F est déjà associé au bouton
`declareBankruptcy`.

Côté IA, `chooseAction` (`src/ai/index.ts`) répartit les décisions entre les stratégies des niveaux
selon la phase. En `preRoll`, la stratégie peut proposer un échange ou gérer ses propriétés avant de
lancer, donc plusieurs décisions `preRoll` peuvent précéder le lancer. Les briques de valorisation
nécessaires existent déjà : `landingOdds()`, une distribution stationnaire mise en cache, `rentAt`,
`expectedRent`, `netWorth` et `liquidationValue`.

Les événements `bankrupt` alimentent le journal (`journal.ts`), les statistiques (`statistics.ts`),
le classement et la ligne de faillite (`summary.ts`), la présentation (`presentation.ts`, bandeau
« <nom> fait faillite » de `GameScreen.vue`) et le tournoi (`runTournament.ts`). La partie de
non-régression `src/ai/__snapshots__/noOptionGame.txt` contient ces événements en JSON.

## Goals / Non-Goals

**Goals:**

- Réutiliser au maximum le chemin de faillite existant, côté moteur comme côté interface.
- Une règle d'abandon de l'IA unique, déterministe, bon marché à calculer et réglable par des
  constantes.
- Garder les tests de parties aléatoires aussi longs qu'aujourd'hui.

**Non-Goals:**

- Calibrer finement les seuils de l'IA par niveau : un seul jeu de seuils, vérifié par les tournois.
- Revoir la présentation d'une faillite (durée, animation) au-delà du libellé du bandeau.

## Decisions

### 1. Étendre `declareBankruptcy` plutôt que créer une action `resign`

`ALLOWED_PHASES.declareBankruptcy` devient `['preRoll', 'postRoll', 'debt']`. Hors dette, le
créancier est la banque et la faillite est marquée volontaire. Une action `resign` distincte aurait
dupliqué le transfert des biens, l'événement, le journal, les statistiques, le protocole du worker
et la validation des sauvegardes, pour un effet identique à une faillite envers la banque.

Dans `payments.ts`, le cœur de `declareBankruptcy` est extrait dans une fonction commune
(débiteur, créancier, volontaire). Elle revend les constructions, transfère l'argent, les cases et
les Clés, marque la faillite et émet `assetsTransferred` puis `bankrupt`. `declareBankruptcy`
choisit ensuite la suite selon la phase :

- en `debt`, comportement inchangé ;
- en `preRoll` ou `postRoll`, `checkLastStanding`, sinon `finishTurn`. Celui-ci vérifie l'objectif
  de patrimoine et la limite de tours, puis passe au joueur suivant. `advanceToNextPlayer` remet
  `doublesInARow` à 0, si bien qu'un double à rejouer est simplement abandonné.

Aucun nouveau code d'erreur n'est nécessaire : `applyAction` rejette déjà les autres phases avec
`WRONG_PHASE` et un autre joueur avec `NOT_YOUR_TURN`.

### 2. Champ `voluntary` obligatoire sur l'événement `bankrupt`

`{ type: 'bankrupt'; playerId; creditor; voluntary: boolean }`. Le journal et les statistiques ne
voient que les événements : sans ce champ, ils ne pourraient pas distinguer un abandon d'une
faillite pour une taxe, puisque les deux ont la banque pour créancier. Le champ est obligatoire
plutôt qu'optionnel, pour que le compilateur signale chaque consommateur à mettre à jour.

### 3. `declareBankruptcy` parmi les actions légales avant et après le lancer

`flowCandidates` ajoute `declareBankruptcy` en dernier en `preRoll` et `postRoll`, car
`legalActions` doit lister ce que le joueur peut faire. Les deux tests de parties aléatoires
(`fullGame.test.ts`, `presentation.test.ts`) excluent l'abandon de leurs tirages : sinon une partie
y finirait en quelques tours et ne testerait plus rien. Écarter l'abandon de `legalActions` aurait
fait diverger la liste de ce que le moteur accepte vraiment.

### 4. Critère d'abandon de l'IA dans un module dédié, appliqué avant la stratégie

Nouveau module `src/ai/resignation.ts` :

- `expectedLossPerRound(view, playerId)` calcule trois termes et renvoie le premier moins les deux
  autres :
  - `rentPaid` : somme, sur les cases actives des adversaires, de `landingOdds()[index] ×
    rentAt(view, case, propriétaire)` ;
  - `rentEarned` : somme de `expectedRent(view, case, playerId)` sur ses cases actives
    (`expectedRent` multiplie déjà par le nombre d'adversaires) ;
  - `salaryPerRoll` : `SALARY × 7 / BOARD_SIZE`, soit 35 Ᵽ, Boot étant passé en moyenne une fois
    tous les 40 / 7 lancers.
- `gameLost(view, playerId)` est vrai quand `netWorth(moi) ≤ RESIGN_NET_WORTH_SHARE ×
  max(netWorth(adversaires))`, que la perte espérée est positive et que `liquidationValue(moi) <
  RESIGN_RUIN_ROUNDS × perte`.
- Nouvelles constantes dans `src/ai/constants.ts` : `RESIGN_NET_WORTH_SHARE = 0.15` et
  `RESIGN_RUIN_ROUNDS = 5`. La part de 20 % prévue au départ faisait tomber à 89 % les parties à
  4 IA normales terminées par un objectif de 6 000 Ᵽ, sous le seuil de 90 % du tournoi
  d'équilibrage (96,5 % sans abandon). À 15 %, elles remontent à 94 %. Garder 20 % avec 4 tours
  de table au lieu de 5 ne donnait que 90,5 %.

`chooseAction` teste `gameLost` en `preRoll`, avant d'appeler la stratégie du niveau, et renvoie
alors `declareBankruptcy`. Le test passe avant la stratégie, sinon l'IA pourrait proposer un
échange ou construire avant d'abandonner. Il est commun aux trois niveaux, car l'abandon sert le
rythme de la partie et non la force de l'IA. Une IA facile qui ne lâcherait jamais une partie perdue
imposerait justement à l'humain la fin interminable que ce change veut éviter.

La chance moyenne d'arrêt (`landingOdds`) est préférée au risque du prochain lancer (`rentRisk`,
depuis la position courante). Le critère porte sur plusieurs tours de table : la position du moment
ferait osciller la décision d'un tour à l'autre. Les options de partie (pas de loyer en quarantaine,
bonus double de Boot, cagnotte) sont ignorées : ce sont des approximations de second ordre, et les
deux seuils gardent une marge.

Le calcul parcourt au plus 28 cases sur une distribution déjà en cache, ce qui laisse une large
marge sous le budget de 20 ms par décision du test de robustesse.

### 5. Interface : même bouton et même confirmation, présentés à l'écart

`turnButtons` ajoute en dernier, hors mode gestion, le bouton `declareBankruptcy` intitulé
« Abandonner ». En `preRoll` et `postRoll`, quand `confirmingBankruptcy` est vrai, les boutons
deviennent `confirmBankruptcy` et `cancelBankruptcy`, comme en dette. La réduction de l'interaction
existante transmet déjà `declareBankruptcy` à la confirmation. Le raccourci F s'applique sans
changement : il ouvre la confirmation sans rien transmettre.

`TurnActions.vue` retire ce bouton de la grille des actions et l'affiche seul en dessous, en
variante `danger`. La grille garde ainsi sa disposition actuelle, où le premier bouton occupe toute
la largeur quand leur nombre est impair, et l'abandon reste loin de « Lancer les dés ».
`TurnActions.vue` affiche le `ConfirmDialog` avec le titre « Abandonner la partie ? », le message
« <nom>, vous vous déclarez en faillite et quittez la partie : vos constructions sont revendues et
vos systèmes retournent à la banque. » et le bouton « Confirmer l'abandon ».

L'étape de présentation `bankrupt` porte `voluntary`, et le bandeau de `GameScreen.vue` affiche
« <nom> abandonne » ou « <nom> fait faillite ».

### 6. Journal, statistiques, sauvegarde

- `journal.ts` : `onBankruptcy` écrit « <joueur> abandonne et se déclare en faillite » quand
  `voluntary` est vrai. Les sous-lignes de revente, d'argent cédé, de cases et de Clés sont
  inchangées.
- `statistics.ts` : `Bankruptcy` gagne `voluntary: boolean`. `summary.ts` : `bankruptcyLine`
  renvoie « Abandon au tour <n> » pour un abandon. Le classement par rang de faillite ne change pas.
- `savedGame.ts` : `SAVE_FORMAT_VERSION = 5`, `FORMAT_BEFORE_RESIGNATION = 4`. Une migration
  ajoute `voluntary: false` à chaque `bankruptcy` non nulle des statistiques, et `isCounters` exige
  ce booléen. Le journal est stocké sous forme de texte et l'état du moteur ne contient pas
  d'événements : rien d'autre à migrer.

### 7. Tournoi et non-régression

`TournamentReport` gagne `resignations`, le nombre d'événements `bankrupt` volontaires. Le rapport
imprimé l'affiche. Les tournois de force (`strength.test.ts`) et d'équilibrage (`test:balance`)
sont relancés. La capture `noOptionGame.txt` est reprise : les événements `bankrupt` portent
désormais `voluntary`, et une IA peut y abandonner plus tôt. Le diff est relu avant d'accepter la
nouvelle capture.

## Risks / Trade-offs

- [Seuils trop prudents, l'IA n'abandonne jamais en pratique, ou trop hâtifs, l'IA abandonne une
  partie encore jouable] → les scénarios de `ai-strategy` bornent les deux côtés. Le compteur
  d'abandons du tournoi montre la fréquence réelle, et les seuils restent deux constantes à ajuster.
- [Une IA qui abandonne rend ses cases à la banque. À 3 joueurs ou plus, cela peut profiter à un
  adversaire plutôt qu'à un autre et déplacer l'écart de force entre niveaux] → les tests de force
  doivent rester verts. Sinon, on resserre les seuils plutôt que de différencier les niveaux.
- [Abandon par erreur d'un humain] → bouton séparé des actions du tour, style destructif et
  confirmation obligatoire. Le raccourci F n'ouvre que la confirmation.
- [Tests de parties aléatoires raccourcis par l'abandon] → exclusion explicite de l'abandon dans
  leurs tirages (décision 3).
- [Critère approximatif : options ignorées, doubles non comptés, chance d'arrêt moyenne plutôt que
  position réelle] → acceptable pour une décision d'abandon. Les deux conditions doivent être
  réunies, et la première, un écart de patrimoine d'un facteur 5, protège contre un faux positif de
  la seconde.

## Migration Plan

Format de sauvegarde 5 avec la migration du format 4 (décision 6). Les sauvegardes des formats 1 à
3 enchaînent les migrations existantes, puis celle-ci. Aucun retour arrière n'est prévu : une
version antérieure de l'application refuse une sauvegarde au format 5 comme incompatible, ce qui
est déjà le cas pour chaque nouveau format.
