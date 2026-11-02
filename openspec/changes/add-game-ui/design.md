# Design

## Context

Disponibles à ce stade : le moteur (`createGame`, `applyAction` qui renvoie état + événements,
requêtes en lecture de `queries.ts`) et le composant `GameBoard` (props état + surbrillances,
événement de sélection de case, méthode exposée `animateMove`). Ce change les relie et ajoute toute
l'interface 2D. Motivation : proposal.md ; exigences : `specs/`.

La difficulté principale n'est pas l'affichage mais la **coordination dans le temps** : une seule
action `rollDice` du moteur calcule instantanément le lancer, le déplacement, le passage par Boot,
la carte piochée, un second déplacement et le loyer payé, alors que l'écran doit montrer chaque
étape dans l'ordre.

## Goals / Non-Goals

**Goals :**

- Toute la logique d'interface décisionnelle en fonctions pures testées (quel panneau, quels
  boutons actifs, quelles cases en surbrillance, quelle action moteur), les composants ne faisant
  qu'afficher et relayer.
- Un point d'entrée unique pour agir sur la partie, que l'IA réutilisera dans `add-heuristic-ai`.

**Non-Goals :**

- Pas de vue-router : 4 écrans sans URL partageable ni historique utile.
- Pas de Pinia : un composable et `provide`/`inject` suffisent pour une seule session de jeu.
- Pas d'écran de passage de main : argent, systèmes et Clés sont publics, comme autour d'une table.

## Decisions

### Arborescence

```
src/
  game/
    useGameSession.ts        session : état moteur, état affiché, dispatch, file de présentation
    interaction.ts           contrôleur d'interaction pur
    presentation.ts          événements moteur → étapes d'animation, projection sur l'état affiché
    animationSpeed.ts        vitesses, durées, préférence mémorisée
    legalActions.ts          actions légales d'un joueur sur une case, enchère, dette
    format.ts                montants en PwnCoins, noms de phase
  ui/
    screens/HomeScreen.vue, CreateGameScreen.vue, GameScreen.vue, GameOverOverlay.vue
    hud/StatusBar.vue, PlayersPanel.vue, TurnActions.vue, DiceTray.vue, CardReveal.vue,
        PropertySheet.vue, BuyPanel.vue, AuctionPanel.vue, DebtPanel.vue, SpeedPicker.vue,
        ConfirmDialog.vue, Toast.vue
  App.vue                    bascule d'écran
```

### Session de jeu : deux états

`useGameSession` détient :

- `engineState` : la vérité, mise à jour dès que le moteur accepte une action ;
- `displayedState` : ce que montrent le plateau et le HUD, qui rattrape `engineState` au rythme des
  animations ;
- une file d'étapes de présentation et un indicateur `isPresenting`.

`dispatch(action)` appelle `applyAction` ; en cas de succès, il remplace `engineState`, convertit les
événements en étapes (`presentation.ts`) et les joue une à une. Chaque étape applique sa projection
sur `displayedState` (par exemple : position du pion à l'arrivée, argent débité et crédité d'un
paiement). À la fin de la file, `displayedState` reçoit `engineState` tel quel ; en développement, un
contrôle signale toute divergence entre la projection et l'état réel. Les entrées utilisateur sont
ignorées tant que `isPresenting` est vrai, sauf le toucher qui passe l'animation (la file est vidée
et `displayedState` reçoit directement `engineState`).

Alternative écartée : faire produire par le moteur un état intermédiaire par étape. Les événements
contiennent déjà toutes les données nécessaires ; l'API du moteur reste étroite.

Les états sont des `shallowRef` ; la session est fournie par `provide` dans `GameScreen`.

### Présentation des événements

`presentation.ts` associe à chaque événement du moteur une étape :

| Événement du moteur | Étape |
|---|---|
| lancer de dés | dés qui roulent puis s'arrêtent sur les valeurs, double signalé |
| `moved` | `GameBoard.animateMove(joueur, cases, duréeParCase)` |
| `passedBoot` | salaire crédité, petit badge « +200 Ᵽ » sur le joueur |
| carte piochée | `CardReveal` : type (Exploit ou Patch), titre et effet ; attente d'un toucher ou d'un délai selon la vitesse |
| `paid` | argent du payeur débité et du bénéficiaire crédité, flèche animée dans le panneau des joueurs |
| achat, enchère gagnée, construction, revente, mise en veille | mise à jour de la case sur le plateau |
| entrée et sortie de quarantaine | déplacement direct du pion vers la case 10, marqueur dans le panneau |
| faillite, victoire | bandeau de faillite, puis écran de fin |

Les événements sans rendu propre (début de tour, changement de phase) ne produisent pas d'étape et
sont appliqués à la projection directement.

### Contrôleur d'interaction pur

```ts
type Interaction =
  | { kind: 'idle' }
  | { kind: 'manage' }
  | { kind: 'sheet'; squareId: SquareId }

reduceInteraction(game, interaction, input) → { interaction; action?: Action }
viewOf(game, interaction) → { highlights; panel; enabledButtons }
```

`input` vaut un toucher de case, un toucher hors des cases ou un bouton du HUD. La phase du moteur
détermine le panneau principal (`TurnActions` en `preRoll` et `postRoll`, `BuyPanel` en
`buyDecision`, `AuctionPanel` en `auction`, `DebtPanel` en `debt`). L'interaction n'ajoute que le
mode « gérer » (cases gérables du joueur en surbrillance) et la fiche ouverte. Un toucher de case
hors du mode « gérer » ouvre la fiche en lecture seule.

### Actions légales

`legalActions.ts` dit quels boutons activer : pour une case et un joueur, construire, revendre,
mettre en veille ou réactiver ; pour l'enchère, la mise minimale et maximale ; pour la dette, si
`payDebt` est couvert. Il s'appuie sur les requêtes du moteur quand elles existent, sinon sur un
essai à blanc de `applyAction` (le moteur ne modifie jamais l'état d'entrée et coûte un
`structuredClone`), ce qui garantit qu'un bouton actif ne sera jamais rejeté. Le message d'erreur
de l'essai à blanc sert d'infobulle d'un bouton désactivé (« Famille incomplète », « Construction
non uniforme »…).

### Dés : cubes CSS 3D

`DiceTray` affiche deux cubes en transformations CSS 3D au-dessus du plateau : animation de
roulement, arrêt forcé sur les faces de l'événement, total affiché, mention « Double ! » le cas
échéant. Alternative écartée : dés dans la scène TresJS, qui dépendraient de la caméra.

### Vitesses d'animation

Une table unique dans `animationSpeed.ts` donne, par vitesse, la durée du roulement des dés, d'une
case de déplacement, de l'affichage d'une carte et d'un paiement ; « instantanée » vaut 0 partout et
remplace les animations par une ligne de texte dans le HUD. La préférence est mémorisée dans
`localStorage` (accès protégés par `try/catch`, valeur par défaut si indisponible), avec repli sur
`prefers-reduced-motion`.

### Montants

`formatPwn(1500)` renvoie `1 500 Ᵽ` avec une espace fine insécable comme séparateur de milliers et
une espace insécable avant le symbole, via `Intl.NumberFormat('fr-FR')`. Toute somme affichée passe
par cette fonction.

### Style

Tailwind CSS v4 via `@tailwindcss/vite`. Thème sombre néon cohérent avec le plateau : variables CSS
de thème, couleurs des joueurs et des familles reprises de `boardTheme.ts` et appliquées en style en
ligne. Mise en page pour l'écran paysage d'au moins 1024 × 768 : plateau à gauche, panneau latéral à
droite (joueurs en haut, panneau d'action en bas), dés et carte révélée en surimpression au centre du
plateau. Zones tactiles d'au moins 44 × 44 px.

### Tests

Vitest est découpé en deux projets : `engine` en environnement `node` (inchangé) et `ui` en
environnement `happy-dom` pour `src/game` et `src/ui`. Les modules purs (`interaction`,
`presentation`, `legalActions`, `animationSpeed`, `format`) sont testés en premier ; quelques tests de
composants avec `@vue/test-utils` couvrent le formulaire de création, le panneau d'enchère et le
panneau de dette. Le rendu 3D et les animations restent vérifiés visuellement.

## Risks / Trade-offs

- [Divergence entre l'état projeté et l'état réel] → la fin de file réaligne toujours sur
  `engineState`, et le contrôle de développement rend toute divergence visible tout de suite.
- [Interactions pendant une animation] → entrées ignorées pendant `isPresenting`, sauf passer
  l'animation.
- [Enchère entre humains sur le même écran : chacun voit la mise des autres] → c'est le
  fonctionnement d'une enchère ouverte, aucune information n'est à cacher.
- [Essais à blanc coûteux pour griser les boutons] → au plus quelques dizaines de `structuredClone`
  d'un état de quelques kilo-octets par rendu du panneau de gestion ; mesurer si besoin.
- [Panneau latéral trop étroit en 1024 px] → panneau de 320 px, systèmes d'un joueur affichés en
  pastilles de couleur, détails dans la fiche.
