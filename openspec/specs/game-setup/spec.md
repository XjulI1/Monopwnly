# game-setup Specification

## Purpose
Créer une partie prête à jouer : joueurs, réglages, argent de départ, paquets de cartes mélangés et
premier joueur.
## Requirements
### Requirement: Création d'une partie

`createGame` SHALL accepter de 2 à 6 joueurs, chacun avec un identifiant, un nom et une couleur
distincts, une graine et des réglages optionnels. Une demande invalide SHALL être rejetée avec un
code d'erreur explicite.

#### Scenario: Partie à 4 joueurs

- **WHEN** on crée une partie avec 4 joueurs et une graine
- **THEN** l'état contient 4 joueurs dans l'ordre fourni, aucun en faillite

#### Scenario: Nombre de joueurs hors bornes

- **WHEN** on crée une partie avec 1 joueur ou avec 7 joueurs
- **THEN** la création est rejetée avec le code `INVALID_PLAYER_COUNT`

#### Scenario: Doublons

- **WHEN** deux joueurs partagent un identifiant ou une couleur
- **THEN** la création est rejetée avec le code `DUPLICATE_PLAYER`

### Requirement: Réglages

Les réglages SHALL comporter le champ `auctions`, vrai par défaut. Un réglage absent SHALL prendre
sa valeur par défaut.

#### Scenario: Réglages par défaut

- **WHEN** on crée une partie sans réglages
- **THEN** `settings.auctions` vaut vrai

#### Scenario: Enchères désactivées

- **WHEN** on crée une partie avec `{ auctions: false }`
- **THEN** `settings.auctions` vaut faux

### Requirement: État initial des joueurs

Chaque joueur SHALL commencer sur Boot (case 0) avec 1 500 Ᵽ, sans Clé de déchiffrement, hors de
quarantaine. Aucune case SHALL NOT être possédée et la banque SHALL disposer de 32 backdoors et
12 rootkits.

#### Scenario: Départ

- **WHEN** on crée une partie à 3 joueurs
- **THEN** chaque joueur est en case 0 avec 1 500 Ᵽ et aucune clé
- **AND** `ownership` est vide et le stock de la banque est de 32 backdoors et 12 rootkits

### Requirement: Paquets mélangés

Les paquets Exploit et Patch SHALL être mélangés par le générateur de la partie à la création.

#### Scenario: Paquets complets

- **WHEN** on crée une partie
- **THEN** chaque paquet contient ses 16 cartes, chacune une seule fois

#### Scenario: Mélange déterministe

- **WHEN** on crée deux parties avec la même graine et les mêmes joueurs
- **THEN** l'ordre des deux paquets est identique dans les deux parties

### Requirement: Premier joueur

Le premier joueur SHALL être tiré au sort par le générateur de la partie, sans lancer de dés. La
partie SHALL commencer en phase `preRoll` du premier joueur, au tour 1.

#### Scenario: Premier joueur déterministe

- **WHEN** on crée deux parties avec la même graine
- **THEN** le premier joueur est le même dans les deux

#### Scenario: Phase initiale

- **WHEN** on crée une partie
- **THEN** la phase est `preRoll`, `turnNumber` vaut 1 et `doublesInARow` vaut 0

