# turn-flow Specification

## Purpose
Orchestrer une partie : phases d'un tour, passage d'un joueur à l'autre, validation des actions,
événements produits, déterminisme et sérialisation.
## Requirements
### Requirement: Phases d'un tour

Le tour d'un joueur SHALL commencer en phase `preRoll`. Après le lancer et la résolution de
l'arrivée, la partie SHALL passer en `postRoll`, en s'arrêtant au besoin sur `buyDecision`,
`auction` ou `debt`. Après un double, `postRoll` SHALL autoriser un nouveau lancer
(`mayRollAgain`) et interdire la fin du tour.

#### Scenario: Tour simple

- **WHEN** le joueur courant lance un 3 et un 4 et arrive sur une case sans décision ni paiement
- **THEN** la partie est en `postRoll` avec `mayRollAgain` à faux

#### Scenario: Double

- **WHEN** le joueur courant lance un double et arrive sur une case sans décision
- **THEN** la partie est en `postRoll` avec `mayRollAgain` à vrai
- **AND** une action `endTurn` est rejetée avec le code `MUST_ROLL_AGAIN`

#### Scenario: Fin du tour

- **WHEN** le joueur courant envoie `endTurn` en `postRoll` sans double à rejouer
- **THEN** c'est au joueur suivant non en faillite de jouer, en `preRoll`, avec `doublesInARow` à 0

#### Scenario: Joueur en faillite sauté

- **WHEN** à 3 joueurs le deuxième est en faillite et le premier termine son tour
- **THEN** c'est au troisième joueur de jouer

#### Scenario: Compteur de tours

- **WHEN** le dernier joueur de l'ordre de jeu termine son tour
- **THEN** `turnNumber` augmente de 1

### Requirement: Validation des actions

Toute action SHALL être validée contre l'état courant : bon joueur, bonne phase, paramètres conformes
aux règles. Une action invalide SHALL être rejetée avec un code d'erreur identifiable et un message
en français, sans modifier l'état. Une action valide SHALL produire un nouvel état sans modifier
l'état d'entrée.

#### Scenario: Action hors tour

- **WHEN** un joueur qui n'est pas le joueur courant envoie `rollDice`
- **THEN** l'action est rejetée avec le code `NOT_YOUR_TURN`

#### Scenario: Action hors phase

- **WHEN** le joueur courant envoie `buyProperty` en phase `preRoll`
- **THEN** l'action est rejetée avec le code `WRONG_PHASE`

#### Scenario: Immutabilité de l'état d'entrée

- **WHEN** une action valide est appliquée à un état
- **THEN** l'état d'entrée est strictement identique à ce qu'il était avant l'appel

#### Scenario: Partie terminée

- **WHEN** une action est envoyée sur une partie en phase `gameOver`
- **THEN** elle est rejetée avec le code `GAME_OVER`

### Requirement: Événements

Chaque action valide SHALL produire la liste ordonnée des événements qu'elle a causés (dés lancés,
déplacement avec les cases traversées, passage par Boot, achat, mise, adjugé, loyer et paiements,
carte piochée, entrée et sortie de quarantaine, construction, revente, mise en veille, faillite,
début de tour, victoire), suffisante pour reconstituer un journal et animer le plateau.

#### Scenario: Événements d'un lancer avec loyer

- **WHEN** le joueur courant lance les dés et s'arrête sur un système possédé par un adversaire
- **THEN** les événements contiennent, dans l'ordre, `diceRolled`, `moved` puis `paid`

#### Scenario: Cases traversées

- **WHEN** un joueur en case 38 avance de 5
- **THEN** l'événement `moved` liste les cases 39, 0, 1, 2 et 3
- **AND** un événement `passedBoot` est émis

### Requirement: Déterminisme

Le hasard du moteur SHALL provenir exclusivement du générateur à graine stocké dans l'état. Deux
parties créées avec la même graine et soumises à la même suite d'actions SHALL produire des états
et des événements identiques.

#### Scenario: Rejouabilité

- **WHEN** on applique la même suite de 50 actions à deux parties de même graine
- **THEN** les états finaux sont égaux en profondeur

### Requirement: Sérialisation

L'état SHALL être du JSON pur : aucun `Map`, `Set`, fonction ni classe. Un état sérialisé puis
désérialisé SHALL se poursuivre exactement comme l'original.

#### Scenario: Aller-retour JSON

- **WHEN** on sérialise un état en cours de partie puis on le désérialise
- **THEN** l'état obtenu est égal en profondeur à l'original
- **AND** la même action appliquée aux deux produit le même résultat

