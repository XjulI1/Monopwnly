# property-acquisition Specification

## Purpose
Permettre l'achat d'une case libre (système, nœud ou service) par le joueur qui s'y arrête et, s'il
refuse, la mettre aux enchères entre tous les joueurs.
## Requirements
### Requirement: Décision d'achat

Quand le joueur courant s'arrête sur une case achetable libre, la partie SHALL passer en
`buyDecision`. `buyProperty` SHALL débiter le prix et donner la case au joueur, active et sans
construction. Un joueur qui n'a pas assez d'argent SHALL voir `buyProperty` refusé avec
`INSUFFICIENT_FUNDS` et SHALL pouvoir seulement refuser l'achat.

#### Scenario: Achat

- **WHEN** un joueur avec 1 500 Ᵽ s'arrête sur le Forum (case 16) libre et envoie `buyProperty`
- **THEN** il a 1 320 Ᵽ, possède le Forum, actif et de niveau 0
- **AND** la partie est en `postRoll`

#### Scenario: Argent insuffisant

- **WHEN** un joueur avec 100 Ᵽ s'arrête sur le Noyau de l'IA libre et envoie `buyProperty`
- **THEN** l'action est rejetée avec le code `INSUFFICIENT_FUNDS`

### Requirement: Refus sans enchère

Quand les enchères sont désactivées, `declineProperty` SHALL laisser la case à la banque et faire
passer la partie en `postRoll`.

#### Scenario: Refus

- **WHEN** dans une partie sans enchères un joueur refuse le Blog
- **THEN** le Blog n'est possédé par personne et la partie est en `postRoll`

### Requirement: Ouverture de l'enchère

Quand les enchères sont activées, `declineProperty` SHALL ouvrir une enchère sur la case entre tous
les joueurs non en faillite, dans l'ordre de jeu à partir du joueur qui a refusé, lui compris, sans
mise initiale.

#### Scenario: Enchère ouverte

- **WHEN** à 3 joueurs (A, B, C) le joueur B refuse le Forum
- **THEN** la partie est en `auction` sur le Forum, avec les enchérisseurs B, C, A et B attendu en premier

### Requirement: Mises

L'enchérisseur attendu SHALL pouvoir miser (`placeBid`) ou passer (`passBid`). La première mise
SHALL être d'au moins 10 Ᵽ, chaque mise suivante strictement supérieure à la plus haute, et aucune
mise SHALL NOT dépasser l'argent liquide du joueur. Un joueur qui passe SHALL être retiré de
l'enchère. Une action d'un autre joueur SHALL être rejetée avec `NOT_YOUR_TURN`.

#### Scenario: Mise trop basse

- **WHEN** la première mise proposée est de 5 Ᵽ
- **THEN** elle est rejetée avec le code `INVALID_BID`

#### Scenario: Mise non supérieure

- **WHEN** la plus haute mise est 120 Ᵽ et le joueur attendu mise 120 Ᵽ
- **THEN** la mise est rejetée avec le code `INVALID_BID`

#### Scenario: Mise au-delà de l'argent

- **WHEN** le joueur attendu, qui a 90 Ᵽ, mise 100 Ᵽ
- **THEN** la mise est rejetée avec le code `INSUFFICIENT_FUNDS`

#### Scenario: Tour de table

- **WHEN** B mise 50 Ᵽ dans l'enchère B, C, A
- **THEN** la plus haute mise est 50 Ᵽ par B et C est attendu

### Requirement: Fin de l'enchère

L'enchère SHALL se terminer quand un seul enchérisseur reste et qu'il a fait la plus haute mise :
il paie sa mise à la banque et reçoit la case. Si tous passent sans aucune mise, la case SHALL
rester à la banque. La partie SHALL ensuite reprendre en `postRoll` du joueur courant.

#### Scenario: Adjugé

- **WHEN** B mise 50, C mise 80, A passe, B passe
- **THEN** C paie 80 Ᵽ et possède le Forum
- **AND** la partie est en `postRoll` du joueur B, avec un événement d'adjudication

#### Scenario: Personne ne mise

- **WHEN** tous les enchérisseurs passent sans mise
- **THEN** la case reste à la banque et la partie est en `postRoll`

