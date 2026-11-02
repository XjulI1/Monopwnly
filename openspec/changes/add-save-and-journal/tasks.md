# Tasks

## 1. Formatage et journal

- [ ] 1.1 Écrire les tests de `src/game/history/format.ts` : montants avec espace insécable et symbole Ᵽ (« 60 Ᵽ », « 1 500 Ᵽ »), noms de cases, accords singulier et pluriel.
- [ ] 1.2 Implémenter `format.ts` ; vérifier que les tests 1.1 passent.
- [ ] 1.3 Écrire les tests de `journal.ts` : une formulation par ligne du tableau de la spec `game-journal`, en-tête de tour, lancer et déplacement en une entrée avec sous-ligne de passage par Boot, mention « (double) », enchère regroupée et dépliable, paiements multiples d'une carte regroupés.
- [ ] 1.4 Implémenter `src/game/history/journal.ts` ; vérifier que les tests 1.3 passent.

## 2. Statistiques

- [ ] 2.1 Écrire les tests de `statistics.ts` : relevé d'argent et de patrimoine au début de chaque tour de table via la requête de patrimoine du moteur, joueur failli absent des relevés suivants, compteurs de loyers perçus et payés, taxes, salaires, achats, enchères, constructions, quarantaines, doubles, faillite datée avec créancier, rentabilité cumulée par case malgré un changement de propriétaire.
- [ ] 2.2 Implémenter `src/game/history/statistics.ts` ; vérifier que les tests 2.1 passent.

## 3. Persistance

- [ ] 3.1 Écrire les tests de `persistence.ts` : aller-retour écriture/lecture identique, JSON invalide → illisible et supprimé, version inconnue → illisible, champs manquants → illisible, case non achetable possédée → illisible, exception d'écriture (quota) signalée sans propagation, exception d'accès au stockage traitée comme « indisponible ».
- [ ] 3.2 Implémenter `src/game/persistence.ts` (clé `monopwnly.savedGame`, gardes de type, `formatVersion: 1`) ; vérifier que les tests 3.1 passent.

## 4. Session de jeu

- [ ] 4.1 Écrire les tests de la session de jeu : journal et statistiques mis à jour à chaque action, entrées visibles seulement après leur étape de présentation, index avancé au bout quand on passe l'animation, sauvegarde écrite après chaque action humaine, écritures d'une rafale d'enchères IA regroupées en une seule, avertissement de stockage affiché une seule fois, restauration d'une sauvegarde sans animation avec reprise du tour d'une IA, d'une enchère et d'un règlement de dette.
- [ ] 4.2 Brancher journal, statistiques et sauvegarde dans la session de jeu, et ajouter la création d'une session depuis une sauvegarde ; vérifier que les tests 4.1 passent.

## 5. Écrans

- [ ] 5.1 Écrire les tests de composant de l'écran d'accueil : « Reprendre la partie » avec résumé si une partie en cours est sauvegardée, « Voir la dernière partie » si elle est terminée, rien sinon, message d'erreur affiché une fois après une sauvegarde illisible.
- [ ] 5.2 Mettre à jour l'écran d'accueil, la confirmation de remplacement avant une nouvelle partie, et « Quitter la partie » qui conserve la sauvegarde sans confirmation ; vérifier que les tests 5.1 passent puis vérifier à la main un rechargement en pleine partie, pendant une décision d'achat, pendant une enchère et pendant le tour d'une IA.
- [ ] 5.3 Supprimer la sauvegarde en quittant l'écran de fin et la marquer terminée à la victoire ; vérifier à la main le rechargement sur l'écran de fin puis le retour à l'accueil.

## 6. Journal dans le HUD

- [ ] 6.1 Implémenter `JournalPanel` (repliable, groupé par tour, couleurs des joueurs, entrées dépliables, défilement automatique sauf lecture en cours, indicateur « Nouvelles actions », 200 dernières entrées puis chargement en remontant) ; vérifier à la main pendant une partie contre deux IA, en 1024 × 768 et en 1920 × 1080.

## 7. Statistiques de fin

- [ ] 7.1 Écrire les tests des fonctions de graphique : bornes des axes, graduations arrondies en Ᵽ, coordonnées des points, courbe interrompue à la faillite, ordre de la légende.
- [ ] 7.2 Implémenter `LineChart` et `StatisticsTab` (deux courbes, tableau ordonné vainqueur puis faillites inverses, cinq cases les plus rentables) dans l'écran de fin ; vérifier que les tests 7.1 passent et vérifier à la main en 1024 × 768 qu'il n'y a aucun défilement horizontal.

## 8. Vérification d'ensemble

- [ ] 8.1 Jouer une partie complète contre deux IA en la rechargeant plusieurs fois, dont une fois en navigation privée avec stockage bloqué ; vérifier la reprise exacte, le journal et les statistiques finales.
- [ ] 8.2 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer.
- [ ] 8.3 Mettre à jour le README (sauvegarde, journal, statistiques) et cocher l'étape dans `TODO.md`.
