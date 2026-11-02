# Tasks

## 1. Réglages et état

- [ ] 1.1 Écrire les tests de création : six nouveaux réglages avec leurs valeurs par défaut, options cumulées acceptées, limite de tours et objectif hors liste rejetés avec `INVALID_SETTINGS`, cagnotte à 0, état toujours sérialisable en JSON.
- [ ] 1.2 Ajouter les champs à `GameSettings`, `dmzPot` à `GameState`, `winReason` et les nouveaux événements à `types.ts`, et la validation dans `setup.ts` ; vérifier que les tests 1.1 passent.
- [ ] 1.3 Écrire le test de non-régression : partie complète entre IA avec une graine fixe et sans option, dont la suite d'événements et l'état final sont comparés à un instantané pris **avant** toute autre modification du moteur.

## 2. Règles optionnelles (`house-rules`)

- [ ] 2.1 Écrire les tests de la cagnotte : taxes et paiements à la banque des sept cartes listées détournés vers la cagnotte, achats, enchères, constructions, réactivations et amende de quarantaine non détournés, faillite envers la banque sans effet, versement sur la DMZ et remise à 0, cagnotte vide sans événement, aucun effet sans l'option.
- [ ] 2.2 Ajouter l'origine des paiements à la banque dans `payments.ts` et le versement sur la DMZ dans la résolution de l'arrivée ; vérifier que les tests 2.1 passent.
- [ ] 2.3 Écrire les tests du bonus double : arrêt sur Boot à 400 Ᵽ, passage inchangé à 200 Ᵽ, arrivée par « Redémarrage à chaud » et « Réinitialisation d'usine » à 400 Ᵽ, envoi en quarantaine sans salaire, 200 Ᵽ sans l'option.
- [ ] 2.4 Implémenter le bonus dans la résolution de l'arrivée sur Boot ; vérifier que les tests 2.3 passent.
- [ ] 2.5 Écrire les tests de la construction libre : construction et revente déséquilibrées acceptées, rootkit avec 4 backdoors sur le seul système concerné, famille incomplète, système en veille, stock et argent toujours exigés, `UNEVEN_BUILDING` sans l'option.
- [ ] 2.6 Brancher l'option dans `isEvenBuildAllowed` ; vérifier que les tests 2.5 passent.
- [ ] 2.7 Écrire les tests du loyer en quarantaine : système, nœud et service d'un propriétaire en quarantaine sans paiement et avec événement `rentWaived`, carte « Conférence de sécurité » maintenue, loyer perçu sans l'option.
- [ ] 2.8 Brancher l'option dans le calcul du loyer dû ; vérifier que les tests 2.7 passent.

## 3. Fins de partie (`game-end-conditions`)

- [ ] 3.1 Écrire les tests de `netWorth` : exemples de la spec (1 160 Ᵽ, rootkit à 1 030 Ᵽ), cagnotte non comptée, joueur failli à 0.
- [ ] 3.2 Implémenter ou compléter `netWorth` dans `queries.ts` ; vérifier que les tests 3.1 passent.
- [ ] 3.3 Écrire les tests de la limite de tours : fin après le dernier joueur du tour de table limite, poursuite avant, motif `turnLimit`, joueurs faillis sautés dans le calcul du dernier joueur.
- [ ] 3.4 Écrire les tests de l'objectif : atteint par le joueur courant, atteint par un autre joueur grâce à un loyer, pas de fin en cours de tour, priorité sur la limite de tours le même tour.
- [ ] 3.5 Écrire les tests du départage et du classement : patrimoine, puis argent liquide, puis ordre de jeu ; faillis classés après dans l'ordre inverse de leur faillite ; faillite de tous les adversaires toujours décisive avec `lastStanding`.
- [ ] 3.6 Réécrire `checkVictory` en suite ordonnée de contrôles appelée en fin de tour et après chaque faillite, avec l'événement `gameEnded` (motif et classement) ; vérifier que les tests 3.3 à 3.5 et le test 1.3 passent.

## 4. IA (`options-ai`)

- [ ] 4.1 Écrire les tests de `src/ai/options.ts` avec des positions construites : IA facile inchangée, fin proche (pas de réactivation, pas de revente volontaire, enchère jusqu'au prix, échange refusé s'il réduit le patrimoine), comportement habituel avant les 3 derniers tours de table, meneur à 80 % de l'objectif (refus d'échange et blocage d'enchère par l'IA difficile, refus de complétion de famille par l'IA normale), construction concentrée sur la Boutique en ligne, sortie immédiate de quarantaine sans loyer, cagnotte ignorée dans les projections.
- [ ] 4.2 Implémenter `src/ai/options.ts` et brancher ses modificateurs dans les évaluations d'achat, d'enchère, de construction, de quarantaine et d'échange des niveaux normal et difficile ; vérifier que les tests 4.1 passent.
- [ ] 4.3 Ajouter au tournoi d'équilibrage une série avec toutes les options actives et une limite de 30 tours ; vérifier que les parties se terminent toutes et que l'IA difficile garde l'avantage sur l'IA normale.

## 5. Interface (`options-interface`)

- [ ] 5.1 Écrire les tests de composant de `CreateGameScreen` : section « Options de règles » avec valeurs par défaut, réglages transmis à la création, options conservées par « Rejouer avec les mêmes paramètres ».
- [ ] 5.2 Ajouter la section à `CreateGameScreen` avec les phrases d'aide ; vérifier que les tests 5.1 passent et, à la main en 1024 × 768, l'absence de défilement horizontal.
- [ ] 5.3 Écrire les tests de composant du HUD : pastilles des seules options actives, « Tour <n> / <limite> », jauges de progression vers l'objectif, cagnotte affichée seulement avec l'option.
- [ ] 5.4 Implémenter les pastilles, le compteur de tours, les jauges et l'affichage de la cagnotte dans le HUD ; vérifier que les tests 5.3 passent.
- [ ] 5.5 Ajouter le compteur de cagnotte au-dessus de la DMZ sur le plateau 3D, mis à jour au rythme de la file de présentation, avec l'animation du versement ; vérifier à la main en vitesse normale et instantanée.
- [ ] 5.6 Écrire les tests du journal pour les quatre nouvelles formulations, puis les implémenter dans `journal.ts` ; ajouter le motif de victoire et le classement par patrimoine à l'écran de fin, et les compteurs de cagnotte (alimentée, remportée) aux statistiques.

## 6. Sauvegarde et vérification d'ensemble

- [ ] 6.1 Incrémenter `formatVersion` dans `persistence.ts` et étendre les gardes de type (`dmzPot`, nouveaux réglages, `winReason`) ; vérifier par un test qu'une sauvegarde de la version précédente est rejetée proprement.
- [ ] 6.2 Jouer à la main une partie avec toutes les options et une limite de 20 tours contre deux IA ; vérifier la cagnotte, le bonus, la construction libre, le loyer non perçu, la fin et l'écran de fin.
- [ ] 6.3 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer.
- [ ] 6.4 Mettre à jour le README (options) et cocher l'étape et les décisions de fin de partie dans `TODO.md`.
