# ai-balance-tournament Specification

## Purpose
Simuler un grand nombre de parties entre IA pour mesurer l'équilibre du plateau de
`docs/plateau.md` (durée des parties, avantage du premier joueur, rendement des familles) et valider
ou réajuster ses loyers.

## Requirements

### Requirement: Simulation de parties

Un utilitaire de tournoi SHALL jouer sans interface un nombre donné de parties entre IA, avec un
nombre de joueurs, des niveaux, des graines et des réglages donnés, en passant uniquement par
`applyAction` et la boucle automatique de l'IA. Chaque partie SHALL être interrompue après une limite
de sécurité de tours de table (300 par défaut) et comptée comme interrompue. Cette limite SHALL NOT
être une règle du jeu.

#### Scenario: Partie interrompue

- **WHEN** une partie simulée atteint 300 tours de table sans vainqueur
- **THEN** elle s'arrête et le rapport la compte parmi les parties interrompues

#### Scenario: Reproductibilité

- **WHEN** on lance deux fois le même tournoi avec les mêmes graines
- **THEN** les deux rapports sont identiques

### Requirement: Mesures produites

Le tournoi SHALL produire un rapport comprenant : le nombre de parties terminées et interrompues, la
durée des parties terminées en tours de table (moyenne, médiane, 90e centile), le taux de victoire
par place dans l'ordre de jeu, le taux de victoire par niveau, et pour chaque famille, nœuds et
services, le total des loyers encaissés rapporté au coût total investi (achat et constructions).

#### Scenario: Rapport complet

- **WHEN** on joue un tournoi de 20 parties à 4 joueurs
- **THEN** le rapport contient chacune des mesures, et la somme des taux de victoire par place vaut 100 % des parties terminées

### Requirement: Critères d'équilibre du plateau

Le projet SHALL fournir un tournoi d'équilibrage d'au moins 400 parties, à 4 joueurs de niveau
normal, enchères activées, lancé par une commande dédiée (`pnpm test:balance`), hors de
`pnpm test`. Il SHALL
imprimer son rapport et échouer si l'un des critères suivants n'est pas tenu :

- au plus 5 % de parties interrompues ;
- durée médiane des parties terminées entre 25 et 80 tours de table ;
- taux de victoire de chaque place dans l'ordre de jeu entre 18 % et 32 % ;
- aucune famille dont le rendement (loyers encaissés / coût investi) dépasse 3 fois celui de la
  famille la moins rentable.

Si un critère échoue, les loyers SHALL être réajustés dans `docs/plateau.md` et dans les données du
plateau du moteur ensemble, jusqu'à ce que le tournoi passe.

#### Scenario: Critères tenus

- **WHEN** on lance `pnpm test:balance` avec les valeurs validées du plateau
- **THEN** le rapport s'imprime et tous les critères sont tenus

#### Scenario: Critère non tenu

- **WHEN** la part de parties interrompues dépasse 5 %
- **THEN** le tournoi échoue en indiquant le critère non tenu et la valeur mesurée
