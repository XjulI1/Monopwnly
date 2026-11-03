# Spec Delta

## MODIFIED Requirements

### Requirement: Bandeau d'état

Le HUD SHALL afficher en permanence le joueur courant (nom et couleur), la phase courante en
français et le dernier lancer de dés. Les phases SHALL être nommées « Avant le lancer », « Décision
d'achat », « Enchère », « Règlement de dette », « Après le lancer » et « Offre d'échange ».

#### Scenario: Début du tour

- **WHEN** c'est le tour d'Alice en phase avant le lancer
- **THEN** le HUD affiche « Alice — Avant le lancer »

#### Scenario: Après un lancer

- **WHEN** Alice a obtenu 4 et 3
- **THEN** le HUD affiche le lancer 4 + 3 = 7

### Requirement: Lancer et fin du tour

Avant le lancer, le HUD SHALL proposer « Lancer les dés », « Gérer mes systèmes » et « Échanger ».
Après le lancer, il SHALL proposer « Relancer » si le joueur a fait un double et peut rejouer, sinon
« Fin du tour », ainsi que « Gérer mes systèmes » et « Échanger ». Les boutons de lancer et de fin
SHALL émettre respectivement `rollDice` et `endTurn` ; « Échanger » ouvre le panneau de composition
d'une offre (voir `trade-interface`).

#### Scenario: Lancer

- **WHEN** le joueur courant touche « Lancer les dés »
- **THEN** l'action `rollDice` est transmise au moteur et le lancer est présenté

#### Scenario: Double

- **WHEN** le lancer du joueur est un double et qu'il n'est pas parti en quarantaine
- **THEN** une fois les animations terminées, le bouton « Relancer » est proposé à la place de « Fin du tour »

#### Scenario: Fin du tour

- **WHEN** le joueur touche « Fin du tour »
- **THEN** le tour passe au joueur suivant et le bandeau affiche son nom
