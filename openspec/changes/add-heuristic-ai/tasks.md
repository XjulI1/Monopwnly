# Tasks

## 1. Moteur et isolement

- [ ] 1.1 Écrire les tests du type de joueur `{ kind: 'human' } | { kind: 'ai'; level: 'easy' | 'normal' | 'hard' }` : création acceptée pour chaque niveau, refusée pour un niveau inconnu.
- [ ] 1.2 Étendre le type `Player` et la validation de `createGame` ; vérifier que les tests 1.1 et tous les tests du moteur passent.
- [ ] 1.3 Écrire les tests de `actingPlayerId` : joueur courant en `preRoll`, `buyDecision`, `postRoll` ; `nextBidder` en `auction` ; débiteur hors de son tour en `debt` ; `null` en `gameOver`.
- [ ] 1.4 Implémenter `actingPlayerId` dans `src/engine/queries.ts` ; vérifier que les tests 1.3 passent.
- [ ] 1.5 Étendre la règle ESLint d'isolement à `src/ai/**` ; vérifier qu'un import de `vue` ajouté temporairement dans `src/ai/` est signalé.

## 2. Vue joueur et aléa

- [ ] 2.1 Écrire les tests de `playerView` : paquets réduits à leur taille, `rngState` absent, reste de l'état public conservé, sérialisation JSON stable.
- [ ] 2.2 Implémenter `src/ai/playerView.ts` et typer les requêtes moteur utilisées par l'IA pour accepter une `PlayerView` ; vérifier que les tests 2.1 et `pnpm type-check` passent.
- [ ] 2.3 Écrire les tests de `aiRandom` : même vue, joueur et niveau → même suite ; vue différente → suite différente.
- [ ] 2.4 Implémenter `src/ai/aiRandom.ts` (FNV-1a + générateur du moteur) ; vérifier que les tests 2.3 passent.

## 3. Fréquences d'arrivée et valeur

- [ ] 3.1 Écrire les tests de `landingOdds` : somme des fréquences égale à 1, Quarantaine plus fréquente que toute autre case, Détecté ! de fréquence nulle comme case d'arrêt, résultat identique sur deux appels.
- [ ] 3.2 Implémenter `src/ai/landingOdds.ts` (chaîne de Markov : dés, triple double, cartes de déplacement, quarantaine, itération jusqu'à convergence, mémorisation) ; vérifier que les tests 3.1 passent.
- [ ] 3.3 Écrire les tests de `valuation.ts` : prime de famille quand la case complète une famille, prime de blocage seulement au niveau difficile, loyer espéré croissant avec le niveau de construction, réserve plus haute face à un rootkit à portée, réserve fixe de 100 Ᵽ au niveau facile.
- [ ] 3.4 Implémenter `src/ai/valuation.ts` et `src/ai/constants.ts` ; vérifier que les tests 3.3 passent.

## 4. Niveaux

- [ ] 4.1 Écrire les tests du niveau facile selon la spec `ai-strategy` : refus d'Intranet à 200 Ᵽ, mise à 130 Ᵽ puis passe à 150 Ᵽ sur Forum, pas de construction à 150 Ᵽ, dettes dans l'ordre du plateau, tentative de double en quarantaine.
- [ ] 4.2 Implémenter `src/ai/levels/easy.ts` (toutes les phases) ; vérifier que les tests 4.1 passent.
- [ ] 4.3 Écrire les tests du niveau normal : achat de Modem 56k qui complète Rétro en entamant la réserve, prime de famille en enchère, construction uniforme au-dessus de la réserve, réactivation avant construction, mise en veille plutôt que faillite, Clé utilisée en début de partie, double tenté en fin de partie.
- [ ] 4.4 Implémenter `src/ai/levels/normal.ts` ; vérifier que les tests 4.3 passent.
- [ ] 4.5 Écrire les tests du niveau difficile : blocage de Boutique en ligne, refus tactique d'une case faible quand les enchères sont activées, trois backdoors par système avant une autre famille, ordre de sacrifice au loyer espéré, double tenté en début de partie face à une zone adverse dangereuse.
- [ ] 4.6 Implémenter `src/ai/levels/hard.ts` ; vérifier que les tests 4.5 passent.

## 5. Décision et boucle automatique

- [ ] 5.1 Écrire les tests de `chooseAction` : même action pour deux ordres de paquet différents, même action pour la même vue, générateur de la partie inchangé, plafond de 40 actions de gestion par phase.
- [ ] 5.2 Implémenter `chooseAction` et `playUntilHumanOrEnd` dans `src/ai/index.ts` ; vérifier que les tests 5.1 passent.
- [ ] 5.3 Écrire le test de robustesse : 100 parties entre IA, 2 à 6 joueurs, niveaux, graines et réglage d'enchères variés, aucune action rejetée, deux exécutions d'une même graine identiques ; mesurer le temps maximal d'une décision (moins de 20 ms).
- [ ] 5.4 Corriger les heuristiques jusqu'à ce que le test 5.3 passe.

## 6. Tournois

- [ ] 6.1 Écrire les tests de `runTournament` sur 20 parties courtes : rapport complet, somme des victoires par place égale aux parties terminées, interruption à la limite de sécurité, deux rapports identiques pour les mêmes graines.
- [ ] 6.2 Implémenter `src/ai/tournament/runTournament.ts` ; vérifier que les tests 6.1 passent.
- [ ] 6.3 Écrire `src/ai/tournament/strength.test.ts` : 60 parties facile / normal / difficile, six ordres de jeu à parts égales, victoires strictement croissantes et au moins 45 % pour le difficile.
- [ ] 6.4 Ajuster `constants.ts` jusqu'à ce que 6.3 passe ; si sa durée dépasse 20 s, réduire le nombre de parties en gardant les six ordres à parts égales.
- [ ] 6.5 Écrire `src/ai/tournament/balance.test.ts` (activé par `MONOPWNLY_BALANCE=1`) avec les critères de la spec `ai-balance-tournament` et ajouter le script `test:balance` à `package.json`.
- [ ] 6.6 Lancer `pnpm test:balance` ; si un critère échoue, réajuster les loyers dans `docs/plateau.md` et `src/engine/board/squares.ts` ensemble (tests d'invariants du plateau compris), et consigner les valeurs mesurées avant et après dans `docs/plateau.md`.

## 7. Worker et intégration

- [ ] 7.1 Implémenter `src/ai/worker.ts` (reçoit vue, joueur et niveau, renvoie l'action) et son client dans `src/game/` ; vérifier avec `pnpm build` que le worker est bien empaqueté.
- [ ] 7.2 Écrire les tests de `useGameSession` pour les IA, avec un faux worker : décision demandée quand `actingPlayerId` est une IA, soumission après la présentation et le délai de la vitesse, aucun délai en « instantanée », carte d'une IA fermée seule après le délai de la vitesse, mises d'enchère des IA après un refus humain, dette d'une IA hors de son tour, réponse ignorée après avoir quitté la partie.
- [ ] 7.3 Brancher la boucle IA dans `useGameSession` et le message « <nom> réfléchit… » sans commandes dans le HUD ; vérifier que les tests 7.2 passent.
- [ ] 7.4 Écrire les tests de composant du formulaire de création : choix Humain / IA par joueur, niveau unique commun, joueur 1 humain et autres IA normales par défaut, partie sans humain autorisée, pseudonymes distincts, nom numéroté pour une IA repassée en humain.
- [ ] 7.5 Ajouter `AI_NAMES` (une vingtaine de pseudonymes inventés) et le tirage dans `src/game/gameForm.ts`, mettre à jour l'écran de création ; vérifier que les tests 7.4 passent.
- [ ] 7.6 Jouer à la main une partie humain contre deux IA normales (refus d'achat pour voir l'enchère), puis regarder une partie entre quatre IA difficiles en vitesse rapide ; vérifier lisibilité et absence de blocage.

## 8. Documentation et vérification d'ensemble

- [ ] 8.1 Rédiger `docs/ia.md` : vue joueur, fréquences d'arrivée, valeur d'une case, réserve, comportement de chaque niveau, tournois et derniers résultats.
- [ ] 8.2 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer.
