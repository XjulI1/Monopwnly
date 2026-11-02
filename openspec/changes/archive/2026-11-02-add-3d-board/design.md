# Design

## Context

Le moteur (`add-rules-engine`) expose un `GameState` sérialisable (`players` avec `position` et
`quarantine`, `ownership` avec `owner`, `mortgaged` et `level`) et les données statiques du plateau
(`board/squares.ts` : 40 cases, types, familles, noms, prix), mais aucune géométrie. Ce change ajoute
la représentation visuelle. Motivation : proposal.md ; exigences : `specs/`.

## Goals / Non-Goals

**Goals :**

- Un composant `GameBoard` sans état de jeu propre : `props` en entrée, événements en sortie.
- Une géométrie entièrement calculée à partir de l'index de case : aucun fichier à éditer à la main.
- Toute la logique calculable (disposition des cases, position des pions, des constructions,
  chemin d'un déplacement, modèle de vue, surbrillances, distinction clic/glisser, cadrage) en
  fonctions pures testées avec Vitest.

**Non-Goals :**

- Tests automatisés du rendu WebGL : vérification visuelle manuelle selon une check-list.
- Orchestration des animations à partir des événements du moteur : `add-game-ui`. Le plateau expose
  seulement une primitive « faire avancer ce pion le long de ces cases ».

## Decisions

### Arborescence

```
src/
  board/
    geometry/layout.ts        index de case → rectangle, orientation, côté (pur)
    geometry/slots.ts         positions des pions et des constructions dans une case (pur)
    geometry/path.ts          liste de cases → points de passage d'un pion (pur)
    boardTheme.ts             couleurs des familles, néons, couleurs des joueurs
    boardViewModel.ts         GameState + surbrillances → données d'affichage (pur)
    tapDetector.ts            distinction toucher bref / glisser (pur)
    cameraFraming.ts          cadrage et bornes (pur)
    GameBoard.vue             TresCanvas, caméra, lumières, fond
    SquareTile.vue            tuile, bandeau, libellés, liseré du propriétaire
    BuildingStack.vue         backdoors et rootkit
    PlayerPawn.vue
    BoardCenter.vue           logo et emplacements des paquets
    useBoardCamera.ts
    usePawnAnimation.ts
```

### Géométrie : plateau carré calculé

Le plateau mesure 100 unités monde de côté, centré sur l'origine, dans le plan XZ. Un coin mesure
`c × c` et une case ordinaire `w × c`, avec `2c + 9w = 100` et `c ≈ 1,6 w` (proportion classique d'un
plateau de société). La case 0 (Boot) est le coin en bas à droite vu de la caméra ; les cases
avancent ensuite vers la gauche sur le côté bas, puis montent, et ainsi de suite dans le sens horaire
vu du dessus, de sorte que le déplacement se lit naturellement. `layout(index)` renvoie le centre,
la taille, le côté (0 à 3) et l'angle de rotation de la tuile : le bandeau de famille et le texte
sont tournés vers l'extérieur du plateau, lisibles depuis le bord correspondant.

Alternative écartée : un modèle glTF ou un SVG du plateau. Le plateau est une grille régulière ; le
calcul est plus court qu'un fichier, se teste et suit automatiquement toute retouche de données.

### Contenu d'une tuile

- Système : bandeau de la couleur de sa famille côté intérieur, nom sur deux lignes au plus, prix.
- Nœud, service, taxe, carte, coin : icône vectorielle simple (géométrie plate ou texture générée
  sur un `CanvasTexture`), nom, prix ou montant le cas échéant.
- Les textes sont rendus une fois dans des `CanvasTexture` (une par tuile) appliquées sur la face
  supérieure : 40 textures statiques, nettes au zoom maximal et sans coût DOM. Alternative écartée :
  `Html` de cientos pour 40 libellés, coûteux pendant les mouvements de caméra et difficile à
  incliner avec le plateau.
- Le propriétaire est montré par un liseré émissif à sa couleur autour de la tuile ; une case en
  veille garde le liseré mais en pointillés et sa tuile est désaturée.

### Thème

`boardTheme.ts` regroupe les 8 couleurs de famille (Rétro, Objets connectés, Bureautique, Web,
Social, Finance, Infrastructure, Cœur), la palette de 6 couleurs de joueurs distinctes de ces
couleurs de famille, et les teintes du fond. Fond quasi noir avec une grille néon discrète, tuiles
gris anthracite, matériaux `MeshStandardMaterial` mats, liserés en `emissive`. Un léger
post-traitement de halo (bloom) est écarté pour la V1 : coûteux sur tablette, l'émissif suffit.

### Constructions

`slots.ts` place jusqu'à 4 backdoors alignées sur le bandeau de famille, ou un rootkit unique centré
sur le bandeau. Géométries low-poly générées en code (petit bloc biseauté pour une backdoor, tour
plus haute avec arête lumineuse pour un rootkit), à la couleur du propriétaire. `level` du moteur
pilote directement le rendu (0 à 4 backdoors, 5 rootkit).

### Pions et disposition sur une case

Chaque joueur a un pion low-poly (socle et tête) à sa couleur. `slots.ts` répartit jusqu'à 6 pions
présents sur une même case sur une grille 2 × 3 dans la zone libre de la tuile, dans l'ordre de jeu.
Sur la case Quarantaine (10), les pions en quarantaine (`quarantine !== null`) sont placés dans la
zone « cellule » de la tuile et ceux en simple visite sur la bande extérieure. Un joueur en faillite
n'a plus de pion.

### Déplacement case par case

`path.ts` transforme une liste d'index de cases (celle de l'événement `moved`) en points de passage
dans le monde. `usePawnAnimation` expose `animateMove(playerId, squares, msPerSquare)` qui renvoie une
promesse résolue à l'arrivée : le pion saute de case en case avec un petit arc ; un déplacement en
arrière (« Rollback », « Cache vidé ») parcourt les cases dans l'ordre donné ; un envoi en quarantaine
est un déplacement direct (liste à deux éléments). Une durée de 0 place le pion directement. Le
pion animé est rendu à une position surchargée ; à la résolution, il reprend la position de l'état
fourni.

`GameBoard` expose cette méthode via `defineExpose` ; c'est `add-game-ui` qui l'appellera au rythme
des événements du moteur.

### Modèle de vue

`boardViewModel(state, highlights)` renvoie, pour chaque case, le propriétaire et sa couleur, l'état
de veille, le niveau de construction, l'état de surbrillance et l'indicateur « atténué », et pour
chaque joueur actif sa case et sa position dans la case. `GameBoard` ne fait qu'appliquer ces valeurs
aux matériaux et aux positions. L'état est fourni dans une `shallowRef` côté appelant.

### Rendu

- TresJS (`<TresCanvas>`), `dpr` borné à `[1, 2]`, antialiasing actif.
- Une instance de matériau par tuile pour la colorer individuellement (40 objets : pas
  d'instanciation nécessaire).
- Éclairage : hémisphérique froide + une directionnelle avec ombres douces (carte d'ombre 2048).

### Caméra

`PerspectiveCamera` à 45° de champ, inclinée à 55°, regardant le centre. `MapControls` (addons de
Three.js), rotation désactivée, zoom vers le curseur, distance bornée, centre visé contraint dans le
carré du plateau. Le cadrage initial calcule la distance qui fait tenir le carré du plateau incliné
dans le cône de vue selon le ratio de la zone d'affichage ; fonction pure testée. Le suivi du pion,
activable par l'appelant, recentre en douceur la vue sur le pion animé si ce dernier sort du
tiers central de l'écran ; il est sans effet au zoom minimal (tout le plateau est visible).

### Sélection

Les événements de pointeur TresJS sur les tuiles donnent l'index de la case touchée. `tapDetector`
compare position et durée entre appui et relâchement : au-delà de 6 px ou de 500 ms, c'est un geste
de caméra. Un clic hors du plateau ou sur le centre signale une désélection.

### Écran de démonstration

`App.vue` crée une partie à 4 joueurs avec le moteur et propose un bouton « Tour suivant » qui joue
des actions simples (lancer, acheter si possible, construire si possible, terminer le tour) et anime
les déplacements. Un clic sur une case la marque sélectionnée. Cet écran sera remplacé par
`add-game-ui`.

## Risks / Trade-offs

- [Textes illisibles sur les cases au zoom minimal sur tablette 1024 × 768] → nom court sur deux
  lignes, police grasse, et fiche détaillée au survol ou au toucher dans `add-game-ui`.
- [Les couleurs des joueurs se confondent avec celles des familles] → palettes choisies ensemble
  dans `boardTheme.ts` ; le propriétaire est signalé par un liseré, pas par la couleur de la tuile.
- [Ombres et textures trop coûteuses sur tablette] → réglage de qualité automatique selon
  `devicePixelRatio` et le type de pointeur ; ombres coupées si besoin.
- [Pions superposés à 6 joueurs sur la même case] → grille de 6 emplacements par case, test pur.

## Open Questions

- Teintes exactes des familles et des joueurs : à ajuster visuellement pendant l'implémentation,
  sans impact sur les specs.
