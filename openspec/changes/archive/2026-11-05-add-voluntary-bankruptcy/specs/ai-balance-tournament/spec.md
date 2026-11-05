## MODIFIED Requirements

### Requirement: Mesures produites

Le tournoi SHALL produire un rapport comprenant : le nombre de parties terminées et interrompues, la
durée des parties terminées en tours de table (moyenne, médiane, 90e centile), le taux de victoire
par place dans l'ordre de jeu, le taux de victoire par niveau, et pour chaque famille, nœuds et
services, le total des loyers encaissés rapporté au coût total investi (achat et constructions),
ainsi que le nombre d'échanges proposés et acceptés, la moyenne d'échanges acceptés par partie, et
le nombre de contre-propositions faites et acceptées, et le nombre d'abandons.

#### Scenario: Rapport complet

- **WHEN** on joue un tournoi de 20 parties à 4 joueurs
- **THEN** le rapport contient chacune des mesures, et la somme des taux de victoire par place vaut 100 % des parties terminées

#### Scenario: Contre-propositions comptées

- **WHEN** une partie du tournoi contient une contre-proposition acceptée et une contre-proposition refusée
- **THEN** le rapport compte deux contre-propositions faites, dont une acceptée, et l'échange issu de la contre-proposition acceptée compte parmi les échanges acceptés

#### Scenario: Abandons comptés

- **WHEN** une partie du tournoi se termine après l'abandon d'une IA puis la faillite subie d'une autre
- **THEN** le rapport compte un abandon pour cette partie
