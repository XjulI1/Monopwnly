# Tasks

Aucune nouvelle dépendance : aucun `pnpm install` n'est nécessaire pour ce change.

## 1. Moteur : abandon (`debt-and-bankruptcy`)

- [x] 1.1 Ajouter le champ `voluntary: boolean` à l'événement `bankrupt` dans `src/engine/types.ts` et le faire produire à `false` par la faillite en dette ; vérifier que `vue-tsc --noEmit` passe après correction des consommateurs signalés (présentation, journal, statistiques, tournoi) et que tous les tests existants passent.
- [x] 1.2 Écrire dans `src/engine/payments.test.ts` les tests de la spec : abandon avant le lancer (Minitel et Modem 56k libres, actifs et sans construction, 4 backdoors rendues au stock, Clé sous son paquet, 400 Ᵽ à la banque, Alice en faillite, Bob en `preRoll`) ; abandon après un double ; abandon en quarantaine ; abandon en duel (`lastStanding`) ; abandon du dernier joueur du tour de table 20 avec une limite de 20 tours (`turnLimit`, pas de tour 21) ; événement `bankrupt` volontaire envers la banque ; faillite en dette non volontaire ; `WRONG_PHASE` pendant une enchère ; `NOT_YOUR_TURN` pour un autre joueur.
- [x] 1.3 Autoriser `declareBankruptcy` en `preRoll` et `postRoll` dans `src/engine/index.ts`. Extraire dans `payments.ts` le transfert commun des biens (débiteur, créancier, volontaire), puis enchaîner hors dette sur `checkLastStanding` ou `finishTurn`. Vérifier que les tests 1.2 et tous les tests du moteur passent.
- [x] 1.4 Ajouter `declareBankruptcy` en dernier aux actions de `flowCandidates` en `preRoll` et `postRoll` (`src/engine/queries.ts`) et mettre à jour les tests « legal actions » de `queries.test.ts`. Exclure l'abandon des tirages de `fullGame.test.ts` et de `presentation.test.ts` : `declareBankruptcy` hors phase `debt`. Vérifier que ces tests passent et que la partie simulée compte toujours plus de 100 actions.

## 2. IA : abandon d'une partie perdue (`ai-strategy`)

- [x] 2.1 Écrire `src/ai/resignation.test.ts`. Pour `expectedLossPerRound` : situation « Partie perdue » (perte positive, de l'ordre de 93 Ᵽ) et « Distancée mais sans danger » (perte négative), cases en veille ignorées des deux côtés. Pour `gameLost`, chaque scénario de la spec : partie perdue, distancée sans danger, en danger sans être distancée (patrimoine au sixième du meneur), meneur parmi plusieurs adversaires (septième du meneur, moitié des deux autres).
- [x] 2.2 Implémenter `src/ai/resignation.ts` (`expectedLossPerRound`, `gameLost`) et les constantes `RESIGN_NET_WORTH_SHARE` (0,15 après le calibrage de 5.3) et `RESIGN_RUIN_ROUNDS` (5) dans `src/ai/constants.ts` ; vérifier que les tests 2.1 passent.
- [x] 2.3 Écrire les tests de `chooseAction` dans `src/ai/index.test.ts` : `declareBankruptcy` en `preRoll` dans la situation « Partie perdue » pour les trois niveaux, avant toute proposition d'échange ou gestion ; `endTurn` en `postRoll` dans la même situation ; mise en veille du Minitel puis `payDebt` pour une dette de 40 Ᵽ avec 20 Ᵽ en poche ; même action pour la même vue.
- [x] 2.4 Brancher `gameLost` dans `chooseAction` (`src/ai/index.ts`) en `preRoll`, avant l'appel à la stratégie du niveau ; vérifier que les tests 2.3 et tous les tests de `src/ai` passent, sauf l'instantané de la partie de référence traité en 5.2.
- [x] 2.5 Relancer le test de robustesse (100 parties entre IA) : aucune action rejetée, décisions sous 20 ms, même partie pour une même graine.
- [x] 2.6 Documenter dans `docs/ia.md` l'abandon d'une partie perdue : les deux conditions, le calcul de la perte espérée, les constantes et le moment de la décision. Vérifier que les noms de constantes cités existent dans `constants.ts`.

## 3. Journal, statistiques et sauvegarde

- [x] 3.1 Écrire les tests du journal dans `journal.test.ts` : « Alice abandonne et se déclare en faillite », dépliée en « Alice revend ses constructions pour 50 Ᵽ », « Alice cède 350 Ᵽ à la banque », « Minitel et Modem 56k retournent à la banque » et « 1 Clé de déchiffrement retourne sous son paquet » ; l'entrée d'une faillite subie est inchangée.
- [x] 3.2 Adapter `onBankruptcy` dans `src/game/history/journal.ts` ; vérifier que les tests 3.1 passent.
- [x] 3.3 Écrire les tests de `statistics.test.ts` et `summary.test.ts` : `voluntary` enregistré dans la faillite, ligne « Abandon au tour 15 », classement de l'écran de fin avec Carol « Vainqueur », Bob « Abandon au tour 30 » puis Alice « Faillite au tour 18 au profit de Carol ».
- [x] 3.4 Ajouter `voluntary` à `Bankruptcy` (`statistics.ts`) et le cas de l'abandon à `bankruptcyLine` (`summary.ts`) ; vérifier que les tests 3.3 et ceux de `GameOverOverlay.test.ts` passent.
- [x] 3.5 Écrire les tests de sauvegarde dans `persistence.test.ts` : une sauvegarde au format 5 sans `voluntary` dans une faillite est refusée. Une sauvegarde au format 4 où Bob a fait faillite au tour 12 au profit de la banque est migrée avec `voluntary: false`, puis chargée. Les sauvegardes des formats 1 à 3 sont toujours migrées jusqu'au format courant.
- [x] 3.6 Passer `SAVE_FORMAT_VERSION` à 5 dans `src/game/savedGame.ts`, ajouter la migration du format 4 et exiger `voluntary` dans `isCounters` ; vérifier que les tests 3.5 et tous les tests de sauvegarde passent.

## 4. Interface (`turn-controls`)

- [x] 4.1 Écrire les tests de `src/game/interaction.test.ts` : avant et après le lancer, `declareBankruptcy` intitulé « Abandonner » est proposé en dernier, avec le raccourci F ; il est absent en mode gestion ; le toucher ouvre la confirmation, avec les boutons « Confirmer l'abandon » et « Annuler » ; confirmer émet `declareBankruptcy` et annuler revient au tour sans action. Le bouton « Déclarer faillite » du règlement de dette est inchangé.
- [x] 4.2 Adapter `turnButtons` et `mainButtons` dans `src/game/interaction.ts`, et faire porter `confirming` à la vue du tour ; vérifier que les tests 4.1 et `shortcuts.test.ts` passent.
- [x] 4.3 Écrire les tests de composant de `TurnActions.vue` : « Abandonner » affiché sous la grille des actions en variante `danger`, et premier bouton toujours sur toute la largeur avec trois actions. La confirmation porte le titre « Abandonner la partie ? » et rappelle que les systèmes retournent à la banque.
- [x] 4.4 Adapter `TurnActions.vue` (bouton à l'écart, `ConfirmDialog`) ; vérifier que les tests 4.3 et les tests existants du HUD passent.
- [x] 4.5 Écrire les tests de `presentation.test.ts` pour l'étape `bankrupt` qui porte `voluntary`. Ajouter le bandeau de `GameScreen.vue` : « Ada abandonne » pour un abandon, « Bob fait faillite » pour une faillite subie. Vérifier que les tests passent.
- [x] 4.6 Mettre à jour le README : on peut abandonner pendant son tour en se déclarant en faillite, et les IA abandonnent une partie perdue. Vérifier que la description correspond aux scénarios des specs `turn-controls` et `ai-strategy`.

## 5. Tournois et vérification d'ensemble

- [x] 5.1 Écrire le test du comptage des abandons du rapport, sur une liste d'événements comprenant un abandon puis une faillite subie : un abandon compté. Ajouter `resignations` à `TournamentReport` dans `src/ai/tournament/runTournament.ts` et l'imprimer dans le tournoi d'équilibrage ; vérifier que le test passe.
- [x] 5.2 Dans `src/ai/noOptionRegression.test.ts`, retirer `voluntary` des événements `bankrupt` quand il vaut `false`. Lancer le test : si l'instantané diffère, vérifier que la première différence est un abandon (`bankrupt` volontaire précédé de `declareBankruptcy` en `preRoll`), puis régénérer `src/ai/__snapshots__/noOptionGame.txt`.
- [x] 5.3 Lancer le tournoi de force (dans la suite de tests) et le tournoi d'équilibrage. Si un critère n'est pas tenu, resserrer `RESIGN_NET_WORTH_SHARE` puis `RESIGN_RUIN_ROUNDS`, sans différencier les niveaux. Vérifier que le rapport d'équilibrage indique plus de zéro abandon, puis reporter les nouvelles mesures datées dans `docs/ia.md` et `docs/plateau.md`.
- [x] 5.4 Dans `TODO.md`, ajouter aux décisions de règles celles de ce change. L'abandon se fait seulement pendant son tour, avant ou après le lancer, et vaut faillite envers la banque, sans enchère. Les trois niveaux d'IA abandonnent selon le même critère, au début de leur tour.
- [x] 5.5 Jouer à la main une partie humain contre une IA facile jusqu'à la distancer, pour voir l'IA abandonner, puis une partie à trois humains où l'un abandonne avant et un autre après son lancer. Annuler une fois la confirmation, recharger la page juste après un abandon, et vérifier le journal, le bandeau et l'écran de fin, à la souris et au tactile.
- [x] 5.6 Lancer le lint, la vérification de types, la suite de tests et le build ; tout doit passer.
