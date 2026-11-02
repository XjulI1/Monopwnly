# Tasks

## 1. Dépendances

- [ ] 1.1 Ajouter à `package.json` `three`, `@tresjs/core`, `@tresjs/cientos` et, en dev, `@types/three` (dernières versions stables compatibles entre elles). **Demander à l'utilisateur de lancer `pnpm install`** et attendre sa confirmation ; vérifier ensuite que `pnpm type-check` passe.

## 2. Géométrie pure

- [ ] 2.1 Écrire les tests de `layout.ts` : 40 tuiles, une par index, coins aux index 0, 10, 20 et 30 et plus grands que les cases ordinaires, Boot en bas à droite, cases 0 à 10 alignées sur le même côté, aucune paire de rectangles qui se chevauche, plateau de 100 unités centré sur l'origine, orientation du texte tournée vers l'extérieur sur chaque côté.
- [ ] 2.2 Implémenter `src/board/geometry/layout.ts` ; vérifier que les tests 2.1 passent.
- [ ] 2.3 Écrire les tests de `slots.ts` : 1 à 6 pions sur une case sans chevauchement et à l'intérieur de la tuile, ordre stable selon l'ordre de jeu, zone de quarantaine distincte de la simple visite sur la case 10, 1 à 4 backdoors alignées sur le bandeau, rootkit centré.
- [ ] 2.4 Implémenter `src/board/geometry/slots.ts` ; vérifier que les tests 2.3 passent.
- [ ] 2.5 Écrire les tests de `path.ts` : un point de passage par case de la liste dans l'ordre, passage par Boot (37 → 2), recul (22 → 19), liste à deux éléments pour un envoi direct en quarantaine.
- [ ] 2.6 Implémenter `src/board/geometry/path.ts` ; vérifier que les tests 2.5 passent.

## 3. Modèle de vue et gestes

- [ ] 3.1 Écrire les tests de `boardTheme.ts` : 8 couleurs de famille toutes différentes, 6 couleurs de joueurs distinctes entre elles et des couleurs de famille.
- [ ] 3.2 Implémenter `src/board/boardTheme.ts` ; vérifier que les tests 3.1 passent.
- [ ] 3.3 Écrire les tests de `boardViewModel` : case à la banque sans propriétaire, couleur du propriétaire, indicateur de veille, niveau de construction, pions des joueurs actifs seulement, pion en quarantaine signalé, états aucun/sélectionnable/sélectionné, atténuation des non-sélectionnables seulement quand il existe des sélectionnables.
- [ ] 3.4 Implémenter `src/board/boardViewModel.ts` ; vérifier que les tests 3.3 passent.
- [ ] 3.5 Écrire les tests de `tapDetector` : toucher bref accepté, déplacement au-delà de 6 px refusé, appui de plus de 500 ms refusé.
- [ ] 3.6 Implémenter `src/board/tapDetector.ts` ; vérifier que les tests 3.5 passent.
- [ ] 3.7 Écrire les tests de `cameraFraming.ts` : distance de caméra qui fait tenir le plateau incliné en 1920 × 1080 et en 1024 × 768, centre visé contraint dans le carré du plateau, bornes de zoom, suivi déclenché seulement hors du tiers central et jamais au zoom minimal.
- [ ] 3.8 Implémenter `src/board/cameraFraming.ts` ; vérifier que les tests 3.7 passent.

## 4. Composants 3D

- [ ] 4.1 Créer `GameBoard.vue` (TresCanvas, `dpr` borné à 2, fond sombre à grille néon, lumières, ombres) et `SquareTile.vue` (tuile en relief, bandeau de famille, texture de libellé générée sur canvas, icônes par type) ; vérifier visuellement les 40 cases, la lisibilité des noms depuis chaque bord et les prix en `Ᵽ`.
- [ ] 4.2 Ajouter le liseré du propriétaire et l'aspect atténué en veille dans `SquareTile.vue` ; vérifier visuellement en changeant l'état fourni (achat, veille, retour à la banque) sans rechargement.
- [ ] 4.3 Créer `BuildingStack.vue` (backdoors, rootkit) ; vérifier visuellement les niveaux 0 à 5 sur un système de chaque côté du plateau.
- [ ] 4.4 Créer `PlayerPawn.vue` et `BoardCenter.vue` ; vérifier visuellement 6 pions sur Boot, la Quarantaine avec un pion en quarantaine et un en visite, et la disparition du pion d'un joueur en faillite.
- [ ] 4.5 Implémenter `usePawnAnimation.ts` et exposer `animateMove` depuis `GameBoard` ; vérifier à la main une avance de 7 cases, un passage par Boot, un recul de 3 cases, un envoi en quarantaine et une durée nulle.
- [ ] 4.6 Brancher `MapControls` (rotation désactivée, zoom vers le curseur, bornes), le recentrage et le suivi du pion dans `useBoardCamera.ts` ; vérifier à la souris et au tactile (émulation tablette) le zoom borné, le déplacement borné, l'absence de rotation et le suivi.
- [ ] 4.7 Brancher la sélection (`tapDetector`, désélection au centre, constructions et pions qui renvoient leur case) et le survol avec nom de la case ; vérifier que glisser ne sélectionne pas.

## 5. Écran de démonstration

- [ ] 5.1 Remplacer le contenu de `src/App.vue` par une partie à 4 joueurs affichée dans `GameBoard`, avec un bouton « Tour suivant » qui joue des actions simples via `applyAction` et anime les déplacements de l'événement `moved`, et un clic qui sélectionne une case ; vérifier visuellement achats, constructions et déplacements sur quelques tours.

## 6. Vérification d'ensemble

- [ ] 6.1 Dérouler la check-list visuelle sur ordinateur (1920 × 1080) et en émulation tablette (1024 × 768, densité 2) : plateau entier au chargement, redimensionnement sans déformation, fluidité du zoom, du déplacement et des pions animés, densité de rendu plafonnée à 2.
- [ ] 6.2 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer, et la règle d'isolement du moteur ne doit signaler aucun import de Three.js dans `src/engine/`.
