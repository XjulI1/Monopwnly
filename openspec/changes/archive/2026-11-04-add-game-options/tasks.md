# Tasks

## 1. Non-régression, réglages et état

- [x] 1.1 **Avant toute autre modification**, écrire le test de non-régression : partie complète entre les trois niveaux d'IA avec une graine fixe et sans option, en s'appuyant sur le lanceur du tournoi (`runTournament.ts`) ; la suite d'événements et l'état final sont enregistrés dans un fichier d'instantané (`toMatchFileSnapshot`) et comparés après retrait des seuls champs ajoutés par ce change (`dmzPot`, nouveaux réglages, `winReason`, `firstPlayerIndex`, motif de `gameWon`).
- [x] 1.2 Écrire les tests de création : six nouveaux réglages avec leurs valeurs par défaut, options cumulées acceptées, limite de tours et objectif hors liste rejetés avec `INVALID_SETTINGS`, cagnotte à 0, état toujours sérialisable en JSON.
- [x] 1.3 Ajouter les champs à `GameSettings`, `dmzPot` et `winReason` à `GameState`, le code `INVALID_SETTINGS` à `RuleErrorCode`, les événements `potIncreased`, `potCollected`, `bootBonus`, `rentWaived` et le motif de `gameWon` à `types.ts`, et la validation dans `setup.ts` ; vérifier que les tests 1.1 et 1.2 passent.

## 2. Règles optionnelles (`house-rules`)

- [x] 2.1 Écrire les tests de la cagnotte : taxes et paiements à la banque des sept cartes listées (effets `pay` et `payPerBuilding`) versés à la cagnotte avec `potIncreased` à la place de `paid` ; « Conférence de sécurité », achats, enchères, constructions, réactivations et amende de quarantaine non concernés ; faillite envers la banque sans effet ; versement sur la DMZ avec `potCollected` et remise à 0 ; cagnotte vide sans événement ; aucun effet sans l'option ; invariant de conservation de l'argent de `fullGame.test.ts` étendu à `dmzPot`.
- [x] 2.2 Verser à la cagnotte, dans `charge` (`payments.ts`), les paiements à la banque de motif `tax` ou `card`, et verser la cagnotte à l'arrivée sur la DMZ dans `resolveLanding` ; vérifier que les tests 2.1 passent.
- [x] 2.3 Écrire les tests du bonus double : arrêt sur Boot à 400 Ᵽ avec `bootBonus` suivi d'un paiement de motif `salary`, passage inchangé à 200 Ᵽ, arrivée par « Redémarrage à chaud » et « Réinitialisation d'usine » à 400 Ᵽ, envoi en quarantaine sans salaire, 200 Ᵽ sans l'option.
- [x] 2.4 Implémenter le bonus dans `resolveLanding` ; vérifier que les tests 2.3 passent.
- [x] 2.5 Écrire les tests de la construction libre : construction et revente déséquilibrées acceptées, rootkit avec 4 backdoors sur le seul système concerné, famille incomplète, système en veille, stock et argent toujours exigés, `UNEVEN_BUILDING` sans l'option.
- [x] 2.6 Ne faire les contrôles d'uniformité de `buildProblem` et `sellProblem` (`development.ts`) que si `freeBuilding` est inactif ; vérifier que les tests 2.5 passent.
- [x] 2.7 Écrire les tests du loyer en quarantaine : système, nœud et service d'un propriétaire en quarantaine sans paiement et avec `rentWaived` ; « Tunnel chiffré » et « Ping » sans paiement, « Ping » sans lancer de dés ; « Conférence de sécurité » maintenue ; loyer perçu sans l'option ; `rentFor` inchangé pendant la quarantaine du propriétaire.
- [x] 2.8 Ajouter le contrôle dans `resolveLanding`, avant le calcul du loyer et avant le lancer de « Ping » ; vérifier que les tests 2.7 passent.

## 3. Tours de table et fins de partie (`turn-flow`, `game-end-conditions`)

- [x] 3.1 Écrire les tests de `netWorth` (déjà dans `queries.ts`, à corriger seulement si un test échoue) : exemples de la spec (1 160 Ᵽ, rootkit à 1 030 Ᵽ), cagnotte non comptée, joueur failli à 0.
- [x] 3.2 Écrire les tests du compteur de tours : `firstPlayerIndex` enregistré à la création, `turnNumber` augmenté quand le tour revient au premier joueur de la partie ou passe sa place s'il a fait faillite, pas au bout de la liste ; chaque joueur joue le même nombre de tours dans un tour de table.
- [x] 3.3 Ajouter `firstPlayerIndex` à `GameState` et à `setup.ts`, compter les tours de table à partir de lui dans `advanceToNextPlayer` ; vérifier que les tests 3.2 passent, puis reprendre l'instantané du test 1.1 après avoir vérifié que seuls les numéros de tour diffèrent.
- [x] 3.4 Écrire les tests de `standings` : classement par patrimoine, puis argent liquide, puis ordre de jeu à partir du premier joueur de la partie ; joueurs faillis exclus.
- [x] 3.5 Écrire les tests de la limite de tours : fin après le dernier joueur du tour de table limite, poursuite avant, motif `turnLimit`, joueurs faillis sautés dans le calcul du dernier joueur, faillite du dernier joueur du dernier tour de table pendant son tour sans entamer le tour suivant, même nombre de tours pour chaque joueur quand le premier joueur tiré n'est pas le premier de la liste.
- [x] 3.6 Écrire les tests de l'objectif : atteint par le joueur courant, atteint par un autre joueur grâce à un loyer, pas de fin en cours de tour, priorité sur la limite de tours le même tour.
- [x] 3.7 Écrire les tests du départage et du motif : égalité départagée par l'argent liquide puis par l'ordre de jeu ; faillite de tous les adversaires toujours décisive avec `lastStanding` ; `gameWon` porte le motif, `winner` et `winReason` sont renseignés.
- [x] 3.8 Ajouter `standings` à `queries.ts` et réécrire `checkVictory` en suite ordonnée de contrôles appelée après chaque faillite et en fin de tour, avant l'avancée de `turnNumber` ; vérifier que les tests 3.1 et 3.4 à 3.7 et le test 1.1 passent.

## 4. IA (`options-ai`)

- [x] 4.1 Écrire les tests de `src/ai/options.ts` avec des positions construites : fin proche limitée aux tours 28 à 30 pour une limite de 30 (comportement habituel au tour 27), pas de réactivation, pas de revente volontaire, enchère jusqu'au prix, échange accepté seulement s'il augmente strictement le patrimoine ; meneur à 80 % de l'objectif (refus d'échange et surenchère de blocage par l'IA difficile au-delà du prix et jusqu'à sa réserve, y compris en fin proche ; refus de complétion de famille par l'IA normale) ; sortie de quarantaine quand le loyer espéré dépasse l'amende (clé, puis amende), comportement habituel sinon ; cagnotte ignorée dans les projections.
- [x] 4.2 Écrire les tests de la construction libre : les IA normale et difficile concentrent leurs constructions sur la Boutique en ligne, l'IA facile garde une répartition uniforme.
- [x] 4.3 Implémenter `src/ai/options.ts` et brancher ses modificateurs dans les évaluations d'achat, d'enchère, de construction, de quarantaine et d'échange des niveaux normal et difficile ; réduire les candidats à la construction de l'IA facile aux systèmes les moins construits de leur famille avec `freeBuilding` ; vérifier que les tests 4.1, 4.2 et 1.1 passent.
- [x] 4.4 Ajouter au tournoi d'équilibrage une série avec toutes les options actives et une limite de 30 tours (`strength.test.ts`), et une série par valeur d'objectif de patrimoine sans limite de tours qui mesure la durée médiane jusqu'à la victoire (`balance.test.ts`) ; vérifier que l'IA difficile remporte au moins 45 % des parties terminées et que les victoires croissent strictement du niveau facile au niveau difficile ; si une valeur d'objectif donne des parties trop longues, proposer un ajustement des valeurs avant de les modifier (fait : 3 000, 4 000, 5 000 et 6 000 Ᵽ retenus).
- [x] 4.5 Rendre à l'IA difficile son avance avec la construction libre : `squareValue` sans ajustement de rendement et réserve pondérée par `FREE_BUILDING_HARD_PRUDENCE` ; vérifier les séries du tournoi sur des graines distinctes de celles du réglage.

## 5. Interface (`options-interface`, `game-journal`, `game-screens`)

- [x] 5.1 Écrire les tests de composant de `CreateGameScreen` : section « Options de règles » avec valeurs par défaut et phrases d'aide, réglages transmis à la création, options conservées par « Rejouer avec les mêmes paramètres ».
- [x] 5.2 Ajouter la section à `CreateGameScreen` sur le modèle de la case « Enchères » ; vérifier que les tests 5.1 passent et, dans le navigateur sans interface en 1024 × 768, l'absence de défilement horizontal.
- [x] 5.3 Écrire les tests de composant du HUD : pastilles des seules règles optionnelles actives, aucune pastille pour la limite de tours ni l'objectif, « Tour <n> / <limite> », jauges de progression vers l'objectif, cagnotte affichée seulement avec l'option.
- [x] 5.4 Implémenter les pastilles, le compteur de tours, les jauges et l'affichage de la cagnotte dans le HUD ; vérifier que les tests 5.3 passent.
- [x] 5.5 Créer le compteur de cagnotte au-dessus de la DMZ sur le plateau 3D (texture dessinée comme `labelTexture.ts`), mis à jour au rythme de la file de présentation, avec l'animation du versement ; vérifier dans le navigateur sans interface en vitesse normale et instantanée.
- [x] 5.6 Écrire les tests du journal pour les quatre nouvelles entrées et l'entrée de victoire avec son motif, puis les implémenter dans `journal.ts` ; faire compter `potIncreased` par les statistiques comme le paiement qu'il remplace (taxe dans `taxesPaid`).
- [x] 5.7 Écrire les tests de l'écran de fin (motif de victoire ; classement du vainqueur, des autres joueurs non faillis dans l'ordre de `standings` avec leur patrimoine, puis des faillis de la faillite la plus récente à la plus ancienne), puis les implémenter dans `GameOverOverlay.vue`.

## 6. Sauvegarde et vérification d'ensemble

- [x] 6.1 Passer `SAVE_FORMAT_VERSION` à 3 dans `src/game/savedGame.ts`, enchaîner dans `migrateSavedGame` les migrations du format 1 au format 2 puis au format 3, et étendre les gardes de type (`dmzPot`, nouveaux réglages, `winReason`) ; vérifier par des tests que des sauvegardes des formats 1 et 2 se chargent au format 3, sans option active, avec une cagnotte à 0, `firstPlayerIndex` à 0, `winReason` à `lastStanding` pour une partie terminée, et que la partie se poursuit comme avant ; une version de format supérieure reste traitée comme illisible.
- [x] 6.2 Jouer des parties contre les IA dans le navigateur sans interface, avec toutes les options et une limite de 20 tours, en forçant les situations par l'état de la session en mode dev ; vérifier la cagnotte (alimentée, remportée), le bonus de Boot, la construction libre, le loyer non perçu, la fin par limite de tours, la fin par objectif de patrimoine et l'écran de fin.
- [x] 6.3 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer.
- [x] 6.4 Mettre à jour le README (options) et cocher la ligne `add-game-options` dans `TODO.md` (les décisions de fin de partie y sont déjà cochées).
