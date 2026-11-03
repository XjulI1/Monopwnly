# Tasks

## 1. Types et validation (`trading`)

- [x] 1.1 Ajouter à `src/engine/types.ts` `TradeSide`, `TradeOffer`, la phase `tradeOffer`, les actions `proposeTrade`, `acceptTrade`, `rejectTrade`, les événements `tradeProposed`, `tradeAccepted`, `tradeRejected`, les codes d'erreur (`TRADE_LIMIT_REACHED`, `TRADE_ALREADY_REJECTED`, `EMPTY_TRADE`) et `tradeLimits` dans `GameState` ; vérifier avec `pnpm type-check` et corriger les aiguillages sur la phase signalés par le typage.
- [x] 1.2 Écrire les tests de `validateTrade` : offre vide, auteur égal au destinataire, destinataire en faillite, case d'un autre joueur, famille construite, montant négatif, non entier ou supérieur à l'argent, Clé non détenue, offre valide avec cases, argent et Clés des deux côtés.
- [x] 1.3 Implémenter `src/engine/trading.ts` (`validateTrade`, exposée aussi comme requête) ; vérifier que les tests 1.2 passent.

## 2. Proposition, réponse et limites

- [x] 2.1 Écrire les tests de `proposeTrade` : autorisée en `preRoll` et `postRoll` pour le joueur courant et en `debt` pour le débiteur hors de son tour, refusée en `buyDecision` et `auction` (`WRONG_PHASE`) et pour un autre joueur (`NOT_YOUR_TURN`), passage en `tradeOffer` avec la phase d'origine conservée, `actingPlayerId` égal au destinataire.
- [x] 2.2 Écrire les tests de `acceptTrade` et `rejectTrade` : transfert des cases avec leur état de veille, de l'argent et des Clés ; retour à la phase d'origine avec les paiements restants d'une dette ; refus sans changement ; réponse de l'auteur refusée ; événements avec l'offre complète.
- [x] 2.3 Écrire les tests des limites : quatrième proposition refusée, proposition refusée répétée avec éléments réordonnés refusée, compteurs remis à zéro au tour suivant, compteurs séparés pour un débiteur hors de son tour.
- [x] 2.4 Implémenter les trois actions et `tradeLimits` (clé canonique d'une offre) dans `trading.ts` et les brancher dans `applyAction` ; étendre `actingPlayerId` ; vérifier que les tests 2.1 à 2.3 et tous les tests du moteur passent.

## 3. Journal et sauvegarde

- [x] 3.1 Écrire les tests du formateur de journal pour les trois événements d'échange (noms, cases, montants, Clés).
- [x] 3.2 Étendre le formateur du journal ; vérifier que les tests 3.1 passent.
- [x] 3.3 Écrire les tests de sauvegarde : reprise sur une offre en attente, chargement d'une sauvegarde de format antérieur avec `tradeLimits` vide.
- [x] 3.4 Incrémenter la version du format de sauvegarde et ajouter la migration ; vérifier que les tests 3.3 passent.

## 4. IA : évaluation (`trade-ai`)

- [x] 4.1 Écrire les tests de `evaluateOffer` selon la spec : 300 Ᵽ contre Minitel accepté (normal), 50 Ᵽ contre Satellite refusé (normal), Boutique en ligne offerte à un détenteur de Forum et Blog refusée (normal) mais acceptée (facile), Modem 56k contre 60 Ᵽ accepté par un détenteur de Minitel, pénalité du difficile quand l'autre passe en tête du patrimoine.
- [x] 4.2 Implémenter `src/ai/trade/evaluateOffer.ts` (valeur sur l'état après l'échange, danger, seuils dans `constants.ts`) et la décision `acceptTrade` / `rejectTrade` dans les trois niveaux ; vérifier que les tests 4.1 passent.

## 5. IA : propositions

- [x] 5.1 Écrire les tests de `proposeOffers` : aucune proposition au niveau facile, achat de Boutique en ligne par un normal détenteur de Forum et Blog avec prix croissant d'une proposition à l'autre, échange croisé Forum contre Câble sous-marin au niveau difficile, pas de répétition d'une offre refusée, une offre par destinataire et par tour, vente d'une case isolée en dette à au moins 1,5 fois sa valeur de veille, même offre pour la même vue.
- [x] 5.2 Implémenter `src/ai/trade/proposeOffers.ts` et l'appeler dans les phases `preRoll`, `postRoll` et `debt` des niveaux normal et difficile ; vérifier que les tests 5.1 passent.
- [x] 5.3 Relancer le test de robustesse (100 parties entre IA) avec les échanges : aucune action rejetée, parties identiques pour une même graine.

## 6. Interface (`trade-interface`)

- [x] 6.1 Écrire les tests de composant de `TradeComposer.vue` : choix du partenaire, cases grisées « famille construite », montant par pas de 10 Ᵽ plafonné, « Proposer » inactif pour une offre vide ou invalide, fermeture sans proposition, envoi de l'action.
- [x] 6.2 Implémenter `TradeComposer.vue` et la mise en avant des cases sélectionnées sur le plateau ; vérifier que les tests 6.1 passent.
- [x] 6.3 Écrire les tests de composant de `TradeOfferDialog.vue` : titre avec l'auteur, nom du destinataire, colonnes « Vous recevez » / « Vous donnez », mention « en veille », boutons « Accepter » et « Refuser », aucune autre commande de jeu.
- [x] 6.4 Implémenter `TradeOfferDialog.vue` ; vérifier que les tests 6.3 passent.
- [x] 6.5 Écrire les tests du HUD : bouton « Échanger » avec le compteur de propositions restantes, désactivé à la limite, absent en enchère et en décision d'achat ; message « <nom> étudie votre offre… » puis résultat quand une IA répond.
- [x] 6.6 Brancher le bouton, le panneau, la fenêtre et les messages dans le HUD et `useGameSession`, avec l'animation des changements de propriétaire ; vérifier que les tests 6.5 passent.

## 7. Tournois et vérification d'ensemble

- [x] 7.1 Ajouter au rapport du tournoi le nombre moyen d'échanges acceptés par partie ; relancer le tournoi de force et `pnpm test:balance` avec les échanges, ajuster les seuils d'échange dans `constants.ts` (avant les loyers) jusqu'à ce que les critères soient tenus.
- [x] 7.2 Mettre à jour `docs/ia.md` (évaluation et propositions d'échanges par niveau) et le README.
- [x] 7.3 Jouer à la main une partie humain contre deux IA normales : proposer un échange accepté et un refusé, recevoir une offre d'une IA, régler une dette par un échange ; vérifier lisibilité et absence de blocage.
- [x] 7.4 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; tout doit passer.
