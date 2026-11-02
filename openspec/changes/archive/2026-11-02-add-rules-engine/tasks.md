# Tasks

## 1. Socle du projet

- [x] 1.1 Vérifier le `.gitignore` existant (node_modules, dist, coverage, .DS_Store) avec `git status`.
- [x] 1.2 Écrire `package.json` (scripts `dev`, `build`, `test`, `test:watch`, `lint`, `type-check`, champ `packageManager`) avec les dernières versions stables de vue, vite, @vitejs/plugin-vue, typescript, vue-tsc, vitest, eslint, typescript-eslint, eslint-plugin-vue. **Demander à l'utilisateur de lancer `pnpm install`** et attendre sa confirmation.
- [x] 1.3 Ajouter `vite.config.ts`, `tsconfig*.json` (strict, `noUncheckedIndexedAccess`), `vitest.config.ts` (environnement node), `index.html`, `src/main.ts` et `src/App.vue` (écran d'accueil provisoire « Monopwnly ») ; vérifier que `pnpm build` et `pnpm type-check` passent.
- [x] 1.4 Configurer ESLint (flat config, typescript-eslint, eslint-plugin-vue) avec la règle `no-restricted-imports` interdisant `vue`, `three` et `@tresjs/*` dans `src/engine/**` ; vérifier que `pnpm lint` passe et qu'un import de `vue` ajouté temporairement dans `src/engine/` est signalé.

## 2. Types et générateur aléatoire

- [x] 2.1 Définir dans `src/engine/types.ts` les types `GameState`, `Player`, `Phase`, `Payment`, `ResumePoint`, `Action`, `ActionResult`, `GameEvent`, `RuleError`, `GameSettings`, `Square`, `Card` selon le design ; vérifier avec `pnpm type-check`.
- [x] 2.2 Écrire les tests du générateur : même graine → même suite, valeurs entières dans les bornes demandées, mélange déterministe qui conserve tous les éléments.
- [x] 2.3 Implémenter `src/engine/rng.ts` (mulberry32 avec état explicite, tirage d'entier, lancer de deux dés, Fisher-Yates) ; vérifier que les tests 2.2 passent.

## 3. Plateau en données (`board-data`)

- [x] 3.1 Écrire les tests d'invariants du plateau : 40 cases d'indices 0 à 39, identifiants uniques, décompte par type, coins, familles et leurs cases, coût de construction homogène par famille, loyers strictement croissants, valeur de veille égale à la moitié du prix, lignes de référence (Minitel, Boutique en ligne, Noyau de l'IA), nœuds, services, taxes et cases carte.
- [x] 3.2 Saisir `src/engine/board/squares.ts` depuis `docs/plateau.md` ; vérifier que les tests 3.1 passent.
- [x] 3.3 Écrire les tests des cartes : 16 Exploit et 16 Patch, identifiants distincts, une Clé de déchiffrement par paquet, cibles de déplacement existantes.
- [x] 3.4 Saisir `src/engine/board/cards.ts` avec des effets typés (union discriminée : `moveTo`, `moveBack`, `moveBackTo`, `nextNode`, `nextService`, `gain`, `pay`, `payPerBuilding`, `payEachPlayer`, `collectFromEachPlayer`, `goToQuarantine`, `decryptionKey`) ; vérifier que les tests 3.3 passent.

## 4. Création d'une partie (`game-setup`)

- [x] 4.1 Écrire les tests de création : 2 à 6 joueurs, refus à 1 et à 7 (`INVALID_PLAYER_COUNT`), refus des identifiants ou couleurs en double (`DUPLICATE_PLAYER`), réglages par défaut et `auctions: false`, état initial des joueurs (case 0, 1 500 Ᵽ, sans clé), `ownership` vide, stock de 32 backdoors et 12 rootkits, paquets complets, mélange et premier joueur déterministes, phase `preRoll` au tour 1.
- [x] 4.2 Implémenter `createGame` dans `src/engine/setup.ts` ; vérifier que les tests 4.1 passent.

## 5. Point d'entrée, validation et phases (`turn-flow`)

- [x] 5.1 Écrire un utilitaire de test qui construit un état sur mesure (positions, argent, propriétés, phase) et force le prochain lancer (recherche d'une graine produisant les dés voulus).
- [x] 5.2 Écrire les tests de `applyAction` : refus hors tour (`NOT_YOUR_TURN`), refus hors phase (`WRONG_PHASE`), refus sur partie terminée (`GAME_OVER`), état d'entrée jamais modifié, aller-retour JSON qui se poursuit à l'identique.
- [x] 5.3 Écrire les tests de fin de tour : `endTurn` passe au joueur suivant non en faillite en `preRoll`, `doublesInARow` remis à 0, `turnNumber` incrémenté après le dernier joueur, refus de `endTurn` avec `MUST_ROLL_AGAIN` après un double.
- [x] 5.4 Implémenter `applyAction` dans `src/engine/index.ts` (copie `structuredClone`, aiguillage par type d'action et par phase, contrôle de l'auteur attendu) et `endTurn` dans `src/engine/turn.ts` ; vérifier que les tests 5.2 et 5.3 passent.

## 6. Déplacement (`movement`)

- [x] 6.1 Écrire les tests de déplacement : total des dés modulo 40, `lastRoll` enregistré, cases traversées dans l'événement `moved`, salaire de 200 Ᵽ au passage et à l'arrêt sur Boot avec `passedBoot`, dés toujours entre 1 et 6.
- [x] 6.2 Écrire les tests des doubles : relance autorisée (`mayRollAgain`), compteur d'affilée, troisième double envoyant en case 10 sans déplacement ni salaire.
- [x] 6.3 Écrire les tests d'arrivée : Rançongiciel (−200 Ᵽ), Amende RGPD (−100 Ᵽ), Détecté ! vers la quarantaine, simple visite en case 10, DMZ sans effet, case en veille sans loyer.
- [x] 6.4 Implémenter `src/engine/movement.ts` (`rollDice`, `moveBy`, `moveTo`, `resolveLanding`) ; vérifier que les tests 6.1 à 6.3 passent.

## 7. Paiements, dettes et faillite (`debt-and-bankruptcy`)

- [x] 7.1 Écrire les tests de `charge` : paiement couvert immédiat, paiements multiples dans l'ordre, passage en `debt` avec paiements restants et point de reprise quand l'argent manque.
- [x] 7.2 Écrire les tests de la phase `debt` : `payDebt` refusé avec `DEBT_NOT_COVERED`, actions autres que revente, mise en veille, paiement et faillite refusées (`WRONG_PHASE`), reprise au point prévu après paiement.
- [x] 7.3 Écrire les tests de la requête de patrimoine mobilisable.
- [x] 7.4 Écrire les tests de faillite : envers un joueur (constructions revendues, argent, cases en veille ou non, clés transférés, paiements suivants abandonnés), envers la banque (cases libres et actives, constructions au stock, clés sous leur paquet), joueur suivant en `preRoll` si le failli jouait, reprise du tour du joueur courant si un autre payeur fait faillite, victoire du dernier solvable et passage en `gameOver`.
- [x] 7.5 Implémenter `src/engine/payments.ts` (`charge`, `payDebt`, `declareBankruptcy`) et l'évaluation de victoire dans `src/engine/turn.ts` ; vérifier que les tests 7.1 à 7.4 passent.

## 8. Quarantaine (`quarantine`)

- [x] 8.1 Écrire les tests : entrée par Détecté !, par carte (fin du droit à relancer) et par triple double ; `payQuarantineFine` (−50 Ᵽ, refus `INSUFFICIENT_FUNDS`) ; `useDecryptionKey` (clé remise sous son paquet, refus `NO_KEY`) ; double réussi qui libère et fait avancer sans relance ; échec qui incrémente `failedAttempts` ; troisième échec qui fait payer 50 Ᵽ puis avancer, en passant par `debt` si nécessaire ; loyers perçus en quarantaine.
- [x] 8.2 Implémenter `src/engine/quarantine.ts` et le brancher dans `rollDice` ; vérifier que les tests 8.1 passent.

## 9. Achat et enchères (`property-acquisition`)

- [x] 9.1 Écrire les tests d'achat : passage en `buyDecision` sur une case libre, achat qui débite le prix, refus `INSUFFICIENT_FUNDS`, refus sans enchères qui laisse la case à la banque.
- [x] 9.2 Écrire les tests d'enchère : ordre des enchérisseurs à partir du joueur qui refuse, mise minimale de 10 Ᵽ, mise non supérieure refusée (`INVALID_BID`), mise au-delà de l'argent refusée (`INSUFFICIENT_FUNDS`), mise d'un joueur non attendu refusée (`NOT_YOUR_TURN`), joueur qui passe retiré, adjudication au dernier enchérisseur, case laissée à la banque si personne ne mise, reprise en `postRoll` du joueur courant.
- [x] 9.3 Implémenter `src/engine/acquisition.ts` (`buyProperty`, `declineProperty`, `placeBid`, `passBid`) ; vérifier que les tests 9.1 et 9.2 passent.

## 10. Loyers (`rent`)

- [x] 10.1 Écrire les tests du calcul pur : loyer de base, famille complète doublée (y compris avec un système en veille), niveaux 1 à 4 et rootkit, nœuds selon le nombre possédé, services à ×4 et ×10, aucun loyer sur sa case, sur une case en veille ou à la banque.
- [x] 10.2 Écrire les tests d'intégration : loyer versé au propriétaire avec événement `paid`, passage en `debt` si non couvert.
- [x] 10.3 Implémenter `src/engine/rent.ts` (`rentFor` avec un multiplicateur optionnel pour les cartes) et le brancher dans `resolveLanding` ; vérifier que les tests 10.1 et 10.2 passent.

## 11. Cartes (`event-cards`)

- [x] 11.1 Écrire les tests de pioche : événement avec l'identifiant de la carte, carte remise sous le paquet, Clé conservée et retirée du paquet.
- [x] 11.2 Écrire les tests des effets d'argent : gains, paiements à la banque, paiements par construction (Mise à jour forcée, Audit de sécurité), Conférence de sécurité avec paiements successifs et dette sur le créancier restant, Serveur de jeu partagé avec un payeur en dette.
- [x] 11.3 Écrire les tests des déplacements : avance avec salaire au passage de Boot, Rollback (y compris depuis la case 2 vers la 39), Cache vidé sans salaire, envoi en quarantaine, Tunnel chiffré (loyer doublé, achat possible, case 35 vers 36), Ping (lancer et ×10, achat possible).
- [x] 11.4 Implémenter `src/engine/cards.ts` et le brancher dans `resolveLanding` ; vérifier que les tests 11.1 à 11.3 passent.

## 12. Constructions et mise en veille (`development`)

- [x] 12.1 Écrire les tests de construction : famille complète requise (`GROUP_INCOMPLETE`), famille sans veille (`MORTGAGED`), nœud et service refusés (`NOT_BUILDABLE`), hors tour refusé (`WRONG_PHASE`), coût débité, uniformité (`UNEVEN_BUILDING`), passage au rootkit avec échange de stock, pénurie (`NO_STOCK`), argent insuffisant (`INSUFFICIENT_FUNDS`).
- [x] 12.2 Écrire les tests de revente : moitié du coût, uniformité, rootkit redevenu 4 backdoors, refus `NO_STOCK` si moins de 4 backdoors en banque, revente permise en `debt`.
- [x] 12.3 Écrire les tests de mise en veille et réactivation : valeur de veille créditée, refus `HAS_BUILDINGS`, réactivation à +10 % arrondie au supérieur, réactivation refusée en `debt`.
- [x] 12.4 Implémenter `src/engine/development.ts` (`buildBackdoor`, `sellBackdoor`, `mortgage`, `unmortgage`) ; vérifier que les tests 12.1 à 12.3 passent.

## 13. Requêtes et API publique

- [x] 13.1 Écrire les tests des requêtes en lecture : actions possibles du joueur attendu selon la phase, systèmes constructibles et revendables, cases mettables en veille, patrimoine mobilisable, loyer qu'un adversaire paierait sur une case.
- [x] 13.2 Implémenter `src/engine/queries.ts` et exporter l'API publique depuis `src/engine/index.ts` avec une JSDoc sur chaque fonction exportée ; vérifier que les tests 13.1 passent.

## 14. Vérification d'ensemble

- [x] 14.1 Écrire un test de partie complète simulée à 4 joueurs avec une graine fixe et des joueurs scriptés choisissant au hasard (générateur de test à graine) parmi les actions valides données par les requêtes, jusqu'à la victoire ou une limite de sécurité de 1 000 tours ; vérifier à chaque action que la masse monétaire n'évolue que par les flux avec la banque, que le stock de constructions plus les constructions posées vaut toujours 32 backdoors et 12 rootkits, et que deux exécutions donnent le même état final.
- [x] 14.2 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer sans erreur ni avertissement.
