# Spec Delta

## Purpose

Fournir le plateau original de Monopwnly sous forme de données : les 40 cases, les familles de
systèmes, les prix, loyers, coûts de construction et valeurs de mise en veille, ainsi que les cartes
Exploit et Patch. Toutes les règles et le rendu s'appuient sur ces données, dont `docs/plateau.md`
est la référence lisible.

## ADDED Requirements

### Requirement: Composition du plateau

Le plateau SHALL comporter exactement 40 cases numérotées de 0 à 39 dans le sens du déplacement.
Chaque case SHALL avoir un identifiant stable, un nom affichable en français et un type parmi
`corner`, `system`, `node`, `service`, `tax` et `card`. La composition SHALL être :

| Type | Nombre |
|---|---|
| Systèmes | 22, en 8 familles |
| Nœuds | 4 |
| Services | 2 |
| Cases carte | 6 (3 Exploit, 3 Patch) |
| Taxes | 2 |
| Coins | 4 |

#### Scenario: Décompte des cases

- **WHEN** on charge le plateau
- **THEN** il contient 40 cases d'indices 0 à 39, chacune une seule fois
- **AND** il contient 22 systèmes, 4 nœuds, 2 services, 6 cases carte, 2 taxes et 4 coins

#### Scenario: Identifiants uniques

- **WHEN** on charge le plateau
- **THEN** les 40 identifiants de case sont distincts

### Requirement: Coins

Les coins SHALL être Boot (case 0, départ), Quarantaine (case 10), DMZ (case 20, repos) et
Détecté ! (case 30, envoi en quarantaine).

#### Scenario: Positions des coins

- **WHEN** on lit les cases 0, 10, 20 et 30
- **THEN** ce sont respectivement Boot, Quarantaine, DMZ et Détecté !

### Requirement: Familles de systèmes

Les 22 systèmes SHALL être répartis dans les 8 familles suivantes, aux cases indiquées :

| Famille | Cases | Coût d'une backdoor |
|---|---|---|
| Rétro | 1, 3 | 50 |
| Objets connectés | 6, 7, 9 | 50 |
| Bureautique | 11, 12, 14 | 100 |
| Web | 16, 17, 19 | 100 |
| Social | 21, 23, 24 | 150 |
| Finance | 26, 28, 29 | 150 |
| Infrastructure | 31, 32, 34 | 200 |
| Cœur | 37, 39 | 200 |

#### Scenario: Tailles des familles

- **WHEN** on regroupe les systèmes par famille
- **THEN** Rétro et Cœur comptent 2 systèmes, les 6 autres familles en comptent 3

#### Scenario: Coût de construction homogène

- **WHEN** on lit le coût d'une backdoor des systèmes d'une même famille
- **THEN** il est identique pour tous et égal à la valeur du tableau

### Requirement: Prix et loyers des systèmes

Chaque système SHALL porter un prix et six niveaux de loyer (base, puis 1, 2, 3, 4 backdoors et
rootkit) conformes à `docs/plateau.md`. Le loyer d'une famille complète sans construction SHALL
valoir le double du loyer de base. La valeur de mise en veille SHALL valoir la moitié du prix.

#### Scenario: Lignes de référence

- **WHEN** on lit le Minitel (case 1)
- **THEN** son prix est 60 et ses loyers sont 4, 20, 55, 150, 200 et 250
- **AND** quand on lit le Noyau de l'IA (case 39), son prix est 400 et ses loyers sont 50, 250, 700, 1900, 2500 et 3100
- **AND** quand on lit la Boutique en ligne (case 19), son prix est 200 et ses loyers sont 16, 80, 225, 610, 800 et 990

#### Scenario: Loyers strictement croissants

- **WHEN** on parcourt les six niveaux de loyer de chaque système
- **THEN** chaque niveau est strictement supérieur au précédent

#### Scenario: Valeur de mise en veille

- **WHEN** on lit la valeur de mise en veille de chaque case achetable
- **THEN** elle vaut la moitié de son prix (30 pour le Minitel, 100 pour un nœud, 75 pour un service)

### Requirement: Nœuds, services et taxes

Les nœuds (cases 4, 18, 25, 36) SHALL coûter 200 chacun ; les services Datacenter (case 13) et
Cloud (case 33) SHALL coûter 150 chacun. Les taxes SHALL être Rançongiciel (case 5, 200) et Amende
RGPD (case 38, 100). Les cases Exploit SHALL être 2, 15 et 27 ; les cases Patch 8, 22 et 35.

#### Scenario: Cases non-systèmes

- **WHEN** on lit les cases 4, 13, 5, 38, 15 et 22
- **THEN** ce sont le Nœud VPN (200), le Datacenter (150), le Rançongiciel (taxe de 200), l'Amende RGPD (taxe de 100), une case Exploit et une case Patch

### Requirement: Cartes Exploit et Patch

Le jeu SHALL comporter 16 cartes Exploit et 16 cartes Patch, chacune avec un identifiant stable, un
titre, un texte affichable en français et un effet typé conforme à `docs/plateau.md`. Chaque paquet
SHALL contenir exactement une Clé de déchiffrement.

#### Scenario: Taille des paquets

- **WHEN** on charge les cartes
- **THEN** il y a 16 cartes Exploit et 16 cartes Patch, d'identifiants distincts

#### Scenario: Une clé par paquet

- **WHEN** on filtre chaque paquet sur l'effet « Clé de déchiffrement »
- **THEN** on obtient exactement une carte par paquet

#### Scenario: Cibles de déplacement valides

- **WHEN** on parcourt les cartes dont l'effet déplace vers une case précise
- **THEN** chaque case visée existe sur le plateau
