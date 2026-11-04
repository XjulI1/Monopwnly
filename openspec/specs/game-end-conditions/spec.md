# game-end-conditions Specification

## Purpose
Permettre des parties plus courtes : en plus de la faillite de tous sauf un, terminer la partie à
une limite de tours ou dès qu'un objectif de patrimoine est atteint, avec un vainqueur toujours
déterminé.

## Requirements

### Requirement: Patrimoine

Le patrimoine d'un joueur SHALL valoir son argent liquide, plus le prix des systèmes, nœuds et
services qu'il possède et qui sont actifs, plus la valeur de veille de ceux qui sont en veille, plus
le coût de construction des backdoors et rootkits installés (un rootkit valant 5 fois le coût d'une
backdoor de sa famille). La cagnotte de la DMZ SHALL NOT être comptée. Un joueur failli a un
patrimoine nul.

#### Scenario: Patrimoine détaillé

- **WHEN** Alice a 500 Ᵽ, le Forum actif avec 2 backdoors, le Blog actif sans construction et le Nœud VPN en veille
- **THEN** son patrimoine vaut 500 + 180 + 200 + 180 + 100 = 1 160 Ᵽ

#### Scenario: Rootkit

- **WHEN** Bob possède la Bourse en ligne active avec un rootkit et 0 Ᵽ
- **THEN** son patrimoine vaut 280 + 5 × 150 = 1 030 Ᵽ

### Requirement: Réglages de fin de partie

La création d'une partie SHALL accepter `turnLimit` parmi 20, 30, 40, 60 ou aucune, et
`netWorthTarget` parmi 3 000, 4 000, 5 000, 6 000 Ᵽ ou aucun, les deux à « aucun » par défaut et
cumulables. Une valeur hors de ces listes SHALL être rejetée avec le code `INVALID_SETTINGS`. La
faillite de tous les adversaires SHALL toujours mettre fin à la partie, quels que soient ces
réglages.

#### Scenario: Valeurs par défaut

- **WHEN** une partie est créée sans préciser ces réglages
- **THEN** il n'y a ni limite de tours ni objectif de patrimoine

#### Scenario: Valeur interdite

- **WHEN** une partie est créée avec une limite de 25 tours
- **THEN** la création est rejetée avec le code `INVALID_SETTINGS`

#### Scenario: Faillite toujours décisive

- **WHEN** une partie limitée à 40 tours compte 2 joueurs et que Bob fait faillite au tour 12
- **THEN** Alice gagne aussitôt avec le motif `lastStanding`

### Requirement: Limite de tours

Avec `turnLimit`, un tour de table complet, qui commence au premier joueur de la partie (voir
`turn-flow`), SHALL compter pour un tour : chaque joueur non failli joue donc `turnLimit` tours. À la
fin du tour du dernier joueur du tour de table numéro `turnLimit`, la partie SHALL se terminer et le premier joueur du
classement SHALL gagner, avec le motif `turnLimit`. La fin du tour du dernier joueur comprend sa
faillite pendant ce tour : la partie SHALL alors se terminer sans entamer le tour de table suivant.

#### Scenario: Dernier tour atteint

- **WHEN** la limite est de 20 tours et que le dernier joueur du tour de table 20 termine son tour
- **THEN** la partie se termine et le plus gros patrimoine gagne avec le motif `turnLimit`

#### Scenario: Avant la limite

- **WHEN** la limite est de 20 tours et que le premier joueur du tour de table 20 termine son tour
- **THEN** la partie continue avec le joueur suivant

#### Scenario: Faillite du dernier joueur du dernier tour

- **WHEN** la limite est de 20 tours, que trois joueurs sont en jeu et que le dernier joueur du tour de table 20 fait faillite pendant son tour au profit d'un autre joueur
- **THEN** la partie se termine avec le motif `turnLimit`, sans tour de table 21, et le plus gros patrimoine des deux joueurs restants gagne

### Requirement: Objectif de patrimoine

La partie SHALL se terminer avec `netWorthTarget` quand, à la fin du tour de chaque joueur, au moins
un joueur non failli a un patrimoine supérieur ou égal à l'objectif, et le premier d'entre eux dans
le classement SHALL gagner, avec le motif `netWorthTarget`. L'objectif SHALL NOT être vérifié au
milieu d'un tour.

#### Scenario: Objectif atteint par le joueur courant

- **WHEN** l'objectif est de 5 000 Ᵽ et qu'Alice termine son tour avec un patrimoine de 5 120 Ᵽ
- **THEN** Alice gagne avec le motif `netWorthTarget`

#### Scenario: Objectif atteint par un autre joueur

- **WHEN** l'objectif est de 5 000 Ᵽ et que Bob termine son tour après avoir payé un loyer qui porte le patrimoine d'Alice à 5 050 Ᵽ
- **THEN** Alice gagne avec le motif `netWorthTarget`

#### Scenario: Pas de vérification en cours de tour

- **WHEN** l'objectif est de 5 000 Ᵽ et que le patrimoine d'Alice atteint 5 010 Ᵽ pendant son tour puis retombe à 4 900 Ᵽ avant qu'elle termine son tour
- **THEN** la partie continue

#### Scenario: Les deux fins le même tour

- **WHEN** la limite de 20 tours est atteinte et que Bob a dépassé l'objectif à la fin du même tour
- **THEN** la partie se termine avec le motif `netWorthTarget`, le gagnant étant le plus gros patrimoine parmi ceux qui ont atteint l'objectif

### Requirement: Départage, classement et motif

En cas d'égalité de patrimoine entre prétendants, le plus d'argent liquide SHALL l'emporter, puis
l'ordre de jeu à partir du premier joueur de la partie. Le moteur SHALL exposer une requête de
classement des joueurs non faillis dans cet ordre (patrimoine, argent liquide, ordre de jeu), qui
désigne le vainqueur d'une fin par limite de tours ou par objectif. L'événement de victoire SHALL
porter le motif (`lastStanding`, `turnLimit` ou `netWorthTarget`), aussi enregistré dans l'état avec
le vainqueur.

#### Scenario: Égalité départagée par l'argent

- **WHEN** à la limite de tours Alice et Bob ont 6 000 Ᵽ de patrimoine, Alice 800 Ᵽ en liquide et Bob 1 200 Ᵽ
- **THEN** Bob gagne

#### Scenario: Égalité parfaite

- **WHEN** à la limite de tours Alice et Bob ont le même patrimoine et le même argent liquide, et qu'Alice joue avant Bob depuis le début de la partie
- **THEN** Alice gagne

#### Scenario: Classement

- **WHEN** Carol a 7 000 Ᵽ de patrimoine, Alice 4 000 Ᵽ et Bob a fait faillite
- **THEN** la requête de classement renvoie Carol puis Alice, sans Bob

#### Scenario: Motif enregistré

- **WHEN** la partie se termine par la limite de tours
- **THEN** l'événement de victoire et l'état portent le motif `turnLimit` et le vainqueur
