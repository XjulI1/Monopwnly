# Spec Delta

## MODIFIED Requirements

### Requirement: Phases d'un tour

Le tour d'un joueur SHALL commencer en phase `preRoll`. Après le lancer et la résolution de
l'arrivée, la partie SHALL passer en `postRoll`, en s'arrêtant au besoin sur `buyDecision`,
`auction` ou `debt`. Après un double, `postRoll` SHALL autoriser un nouveau lancer
(`mayRollAgain`) et interdire la fin du tour. Depuis `preRoll`, `postRoll` ou `debt`, une
proposition d'échange SHALL faire passer la partie en `tradeOffer`, qui revient à la phase d'origine
une fois l'offre acceptée ou refusée (voir `trading`). Un tour de table SHALL commencer au premier
joueur de la partie, tiré au sort à la création et enregistré dans l'état : `turnNumber` SHALL
augmenter de 1 chaque fois que le tour revient à ce joueur, ou passe sa place quand il a fait
faillite, de sorte que chaque joueur joue le même nombre de tours dans un tour de table.

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

- **WHEN** à 4 joueurs le troisième de la liste a été tiré au sort pour commencer et que le deuxième de la liste termine son tour
- **THEN** `turnNumber` augmente de 1 et c'est au troisième de la liste de jouer

#### Scenario: Pas de nouveau tour au bout de la liste

- **WHEN** à 4 joueurs le troisième de la liste a été tiré au sort pour commencer et que le quatrième de la liste termine son tour
- **THEN** `turnNumber` ne change pas et c'est au premier de la liste de jouer

#### Scenario: Premier joueur en faillite

- **WHEN** à 3 joueurs le premier de la liste a commencé la partie puis fait faillite, et que le troisième termine son tour
- **THEN** `turnNumber` augmente de 1 et c'est au deuxième de jouer
