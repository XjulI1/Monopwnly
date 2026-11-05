## ADDED Requirements

### Requirement: Abandon d'une partie perdue

Au début de son tour, en phase `preRoll`, une IA de tout niveau SHALL abandonner
(`declareBankruptcy`, voir `debt-and-bankruptcy`) quand sa partie est perdue, et seulement dans ce
cas. Sa partie SHALL être considérée comme perdue quand les deux conditions suivantes sont réunies :

- son patrimoine (voir `game-end-conditions`) vaut au plus 15 % de celui de l'adversaire non failli
  le plus riche ;
- sa perte espérée par tour de table est positive, et son patrimoine mobilisable (voir
  `debt-and-bankruptcy`) est inférieur à cinq fois cette perte.

La perte espérée par tour de table SHALL valoir le loyer qu'elle s'attend à payer sur un lancer
(pour chaque case active d'un adversaire, la chance moyenne de s'y arrêter multipliée par son loyer),
moins le loyer qu'elle s'attend à encaisser sur ses propres cases actives pendant un tour de table de
tous ses adversaires, moins la part du salaire de Boot gagnée en moyenne par lancer. Une IA SHALL NOT
abandonner en dehors de la phase `preRoll` : ni après son lancer, ni pendant un règlement de dette,
une enchère ou une offre d'échange.

#### Scenario: Partie perdue

- **WHEN** à 2 joueurs une IA normale commence son tour avec 20 Ᵽ et le seul Minitel, face à un adversaire qui a 500 Ᵽ et un rootkit sur chacun des trois systèmes de la famille Finance
- **THEN** elle déclare faillite

#### Scenario: Tous les niveaux

- **WHEN** une IA facile, puis une IA difficile, commence son tour dans la situation du scénario « Partie perdue »
- **THEN** chacune déclare faillite

#### Scenario: Distancée mais sans danger

- **WHEN** à 2 joueurs une IA normale commence son tour avec 200 Ᵽ et aucune case, face à un adversaire qui a 2 500 Ᵽ et la famille Finance complète sans construction
- **THEN** elle lance les dés, car le salaire de Boot couvre les loyers qu'elle s'attend à payer

#### Scenario: En danger mais pas distancée

- **WHEN** une IA commence son tour avec un patrimoine égal au sixième de celui de son adversaire le plus riche, alors que sa perte espérée par tour de table viderait son patrimoine mobilisable en moins de cinq tours de table
- **THEN** elle n'abandonne pas

#### Scenario: Meneur parmi plusieurs adversaires

- **WHEN** à 4 joueurs une IA dont la perte espérée viderait son patrimoine mobilisable en moins de cinq tours de table a un patrimoine égal au septième de celui du meneur et à la moitié de celui des deux autres adversaires
- **THEN** elle déclare faillite

#### Scenario: Pas d'abandon après le lancer

- **WHEN** une IA dans la situation du scénario « Partie perdue » est en `postRoll` sans double à rejouer
- **THEN** elle termine son tour

#### Scenario: Pas d'abandon pendant une dette

- **WHEN** une IA dans la situation du scénario « Partie perdue » doit un loyer de 40 Ᵽ avec 20 Ᵽ en poche
- **THEN** elle met en veille le Minitel puis paie, sans déclarer faillite
