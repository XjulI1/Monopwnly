# Spec Delta

## MODIFIED Requirements

### Requirement: Mesures produites

Le tournoi SHALL produire un rapport comprenant : le nombre de parties terminées et interrompues, la
durée des parties terminées en tours de table (moyenne, médiane, 90e centile), le taux de victoire
par place dans l'ordre de jeu, le taux de victoire par niveau, et pour chaque famille, nœuds et
services, le total des loyers encaissés rapporté au coût total investi (achat et constructions),
ainsi que le nombre d'échanges proposés et acceptés et la moyenne d'échanges acceptés par partie.

#### Scenario: Rapport complet

- **WHEN** on joue un tournoi de 20 parties à 4 joueurs
- **THEN** le rapport contient chacune des mesures, et la somme des taux de victoire par place vaut 100 % des parties terminées
