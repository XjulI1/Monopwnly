# Tasks

## 1. Dépendances et outillage

- [ ] 1.1 Ajouter à `package.json` `tailwindcss` et `@tailwindcss/vite`, et en dev `@vue/test-utils` et `happy-dom`. **Demander à l'utilisateur de lancer `pnpm install`** et attendre sa confirmation.
- [ ] 1.2 Brancher Tailwind dans `vite.config.ts` et `src/style.css` (variables du thème sombre néon) ; découper la configuration Vitest en projets `engine` (node) et `ui` (happy-dom) ; vérifier que `pnpm test` exécute les deux projets et que `pnpm build` passe.

## 2. Modules purs de base

- [ ] 2.1 Écrire les tests de `format.ts` : `formatPwn(1500)` donne `1 500 Ᵽ` avec espaces insécables, `formatPwn(0)` et `formatPwn(25)`, montants négatifs signés, noms français des cinq phases du moteur.
- [ ] 2.2 Implémenter `src/game/format.ts` ; vérifier que les tests 2.1 passent.
- [ ] 2.3 Écrire les tests de `animationSpeed.ts` : table des durées par vitesse (dés, case de déplacement, carte, paiement), « instantanée » à 0, préférence lue et écrite dans `localStorage`, valeur par défaut si `localStorage` lève une exception, « instantanée » par défaut avec `prefers-reduced-motion`.
- [ ] 2.4 Implémenter `src/game/animationSpeed.ts` ; vérifier que les tests 2.3 passent.

## 3. Actions légales

- [ ] 3.1 Écrire les tests de `legalActions.ts` sur des états construits avec le moteur : construction refusée sur famille incomplète avec la raison du moteur, construction non uniforme refusée, rootkit proposé après 4 backdoors, mise en veille refusée sur une famille construite, seules revente et mise en veille en phase `debt`, cases gérables d'un joueur, mise minimale et maximale d'une enchère, `payDebt` couvert ou non, somme réunissable d'un débiteur.
- [ ] 3.2 Implémenter `src/game/legalActions.ts` en réutilisant les requêtes du moteur et, à défaut, un essai à blanc de `applyAction` ; vérifier que les tests 3.1 passent.

## 4. Présentation des événements

- [ ] 4.1 Écrire les tests de `presentation.ts` : un `rollDice` simple donne les étapes dés puis déplacement ; un passage par Boot insère le crédit du salaire ; une carte « Rollback » donne dés, déplacement, carte, recul ; un loyer donne une étape de paiement qui débite et crédite ; Détecté ! donne un déplacement direct vers la case 10 ; un achat met à jour le propriétaire ; la projection de toutes les étapes d'une action donne le même argent, les mêmes positions et les mêmes propriétaires que l'état réel du moteur.
- [ ] 4.2 Implémenter `src/game/presentation.ts` ; vérifier que les tests 4.1 passent.

## 5. Contrôleur d'interaction

- [ ] 5.1 Écrire les tests de `reduceInteraction` et `viewOf` pour `preRoll` et `postRoll` : boutons « Lancer les dés », « Relancer » ou « Fin du tour » selon `mayRollAgain`, boutons de quarantaine avec « Utiliser une Clé » désactivé sans Clé et numéro de tentative, entrée et sortie du mode gestion, cases gérables en surbrillance, fiche en lecture seule hors mode gestion ou sur une case adverse.
- [ ] 5.2 Écrire les tests pour `buyDecision` et `auction` : libellé du refus selon le réglage des enchères, « Acheter » désactivé sans argent suffisant, joueur attendu de l'enchère, mise par défaut au minimum, raccourcis +10/+50/+100, validation désactivée hors bornes, actions `placeBid` et `passBid` émises.
- [ ] 5.3 Écrire les tests pour `debt` : mode gestion limité à la revente et à la mise en veille, « Payer » actif seulement si le paiement en cours est couvert, faillite inévitable signalée, confirmation avant `declareBankruptcy`.
- [ ] 5.4 Implémenter `src/game/interaction.ts` ; vérifier que les tests 5.1 à 5.3 passent.

## 6. Session de jeu

- [ ] 6.1 Écrire les tests de `useGameSession` : `dispatch` met à jour `engineState` immédiatement et `displayedState` à la fin de la file ; entrées ignorées pendant la présentation ; passer l'animation réaligne aussitôt ; message d'erreur exposé quand le moteur rejette une action ; `animateMove` du plateau appelé avec les cases de l'événement `moved` et la durée par case de la vitesse choisie (plateau simulé).
- [ ] 6.2 Implémenter `src/game/useGameSession.ts` ; vérifier que les tests 6.1 passent.

## 7. Écrans

- [ ] 7.1 Écrire les tests de composant de `CreateGameScreen` : 3 joueurs par défaut, bornes 2 et 6, échange de couleurs, messages « Nom obligatoire » et doublon, bouton désactivé, enchères activées par défaut et transmises au moteur, message du moteur affiché en cas de refus.
- [ ] 7.2 Implémenter `HomeScreen`, `CreateGameScreen` et la bascule d'écrans dans `App.vue` ; vérifier que les tests 7.1 passent.
- [ ] 7.3 Implémenter `GameScreen` (plateau + panneau latéral, session fournie par `provide`), « Quitter la partie » avec `ConfirmDialog` et `GameOverOverlay` (vainqueur, rejouer, accueil) ; vérifier à la main un aller-retour accueil → partie → accueil et l'affichage de fin en forçant une partie presque finie via une graine.

## 8. HUD du tour

- [ ] 8.1 Implémenter `StatusBar` et `PlayersPanel` (joueur courant, phase, dernier lancer, argent formaté, systèmes en pastilles par famille, veille atténuée, Clés, quarantaine, faillite barrée) ; vérifier visuellement pendant une partie à 4 joueurs.
- [ ] 8.2 Implémenter `TurnActions` (lancer, relance, fin du tour, quarantaine, gérer) et `Toast` ; vérifier à la main un tour complet, un double avec relance, trois doubles d'affilée, et les trois sorties de quarantaine.
- [ ] 8.3 Implémenter `DiceTray` (cubes CSS 3D, arrêt sur les valeurs, total, « Double ! ») et `CardReveal` (type, titre, effet, fermeture au toucher ou au délai) ; vérifier visuellement un lancer simple, un double et une carte de chaque paquet.
- [ ] 8.4 Brancher le suivi du pion, l'indication « +200 Ᵽ » au passage de Boot et l'animation des paiements dans le panneau des joueurs ; vérifier à la main un tour de plateau complet avec passage par Boot et un loyer payé.
- [ ] 8.5 Implémenter `SpeedPicker` ; vérifier à la main les quatre vitesses, la mémorisation après rechargement, le résumé texte en « instantanée » et le passage d'animation au toucher.

## 9. Gestion, achat, enchère et dette

- [ ] 9.1 Implémenter `PropertySheet` (fiche d'un système, d'un nœud, d'un service et d'une case non achetable, niveau actuel mis en évidence, boutons de gestion avec raison en infobulle) et le mode gestion ; vérifier à la main construction uniforme, rootkit, revente, mise en veille et réactivation.
- [ ] 9.2 Écrire les tests de composant de `AuctionPanel` : joueurs en lice et retirés, « À <nom> d'enchérir », raccourcis, validation désactivée au-delà de l'argent, annonce du résultat.
- [ ] 9.3 Implémenter `BuyPanel` et `AuctionPanel` ; vérifier que les tests 9.2 passent, puis vérifier à la main un achat, une enchère à 3 joueurs remportée et une enchère sans mise, avec et sans le réglage des enchères.
- [ ] 9.4 Écrire les tests de composant de `DebtPanel` : montant, créancier, paiements restants, somme réunissable, « Payer » actif quand couvert, faillite inévitable, confirmation et annulation de la faillite.
- [ ] 9.5 Implémenter `DebtPanel` ; vérifier que les tests 9.4 passent, puis vérifier à la main un loyer réglé après mise en veille et une faillite envers un joueur et envers la banque.

## 10. Vérification d'ensemble

- [ ] 10.1 Jouer une partie complète à 3 humains avec enchères, puis une partie à 2 humains sans enchères, jusqu'à la victoire, sur un écran 1920 × 1080 et en émulation tablette 1024 × 768 ; noter et corriger tout écart avec les specs.
- [ ] 10.2 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer.
