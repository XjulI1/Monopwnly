# movement Specification

## Purpose
Lancer les dés, déplacer le pion, gérer les doubles et le salaire de Boot, et résoudre l'arrivée
sur chaque type de case.
## Requirements
### Requirement: Lancer et déplacement

`rollDice` SHALL tirer deux dés à 6 faces par le générateur de la partie, enregistrer le lancer
dans `lastRoll` et avancer le pion du joueur courant du total, modulo 40.

#### Scenario: Déplacement simple

- **WHEN** un joueur en case 0 obtient 2 et 5
- **THEN** il arrive en case 7 et `lastRoll` vaut [2, 5]

#### Scenario: Valeurs des dés

- **WHEN** on lance les dés 1 000 fois avec des graines différentes
- **THEN** chaque dé vaut toujours un entier de 1 à 6

### Requirement: Salaire de Boot

Un joueur qui passe par Boot ou s'y arrête en avançant SHALL recevoir 200 Ᵽ. Un recul ou un envoi
en quarantaine SHALL NOT donner de salaire.

#### Scenario: Passage par Boot

- **WHEN** un joueur en case 36 avec 500 Ᵽ avance de 6
- **THEN** il arrive en case 2 avec 700 Ᵽ avant la résolution de la case

#### Scenario: Arrêt sur Boot

- **WHEN** un joueur en case 33 avance de 7
- **THEN** il est en case 0 et a reçu 200 Ᵽ

### Requirement: Doubles

Un double SHALL permettre au joueur de relancer après la résolution de son arrivée. Au troisième
double d'affilée dans le même tour, le joueur SHALL aller directement en quarantaine sans déplacer
son pion du total de ce lancer, et son tour SHALL se terminer après la phase `postRoll`.

#### Scenario: Deuxième lancer après un double

- **WHEN** un joueur a lancé un double puis envoie `rollDice` en `postRoll`
- **THEN** le lancer est accepté et `doublesInARow` vaut 2 s'il refait un double, 0 sinon

#### Scenario: Troisième double

- **WHEN** un joueur lance un troisième double d'affilée
- **THEN** il est en case 10, en quarantaine, sans avoir avancé ni reçu de salaire
- **AND** la partie est en `postRoll` avec `mayRollAgain` à faux

### Requirement: Arrivée sur une case

L'arrivée SHALL être résolue selon le type de case : système, nœud ou service libre → décision
d'achat ; possédé par un adversaire et actif → loyer ; possédé par le joueur ou en veille → rien ;
taxe → paiement à la banque ; case carte → pioche ; Détecté ! → quarantaine ; Boot, Quarantaine
(simple visite) et DMZ → rien.

#### Scenario: Taxe

- **WHEN** un joueur avec 1 500 Ᵽ s'arrête sur le Rançongiciel (case 5)
- **THEN** il paie 200 Ᵽ à la banque et a 1 300 Ᵽ

#### Scenario: Amende RGPD

- **WHEN** un joueur avec 1 500 Ᵽ s'arrête sur l'Amende RGPD (case 38)
- **THEN** il a 1 400 Ᵽ

#### Scenario: Détecté !

- **WHEN** un joueur s'arrête sur Détecté ! (case 30)
- **THEN** il est déplacé en case 10, en quarantaine, sans salaire

#### Scenario: Simple visite

- **WHEN** un joueur hors quarantaine s'arrête en case 10
- **THEN** il n'est pas en quarantaine et rien ne se passe

#### Scenario: DMZ

- **WHEN** un joueur s'arrête sur la DMZ (case 20)
- **THEN** son argent ne change pas

#### Scenario: Système en veille

- **WHEN** un joueur s'arrête sur un système d'un adversaire mis en veille
- **THEN** aucun loyer n'est payé

