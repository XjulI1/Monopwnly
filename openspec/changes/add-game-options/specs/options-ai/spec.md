# Spec Delta

## Purpose

Faire jouer les IA de manière crédible avec les options actives : jouer le patrimoine quand la fin
approche, freiner un adversaire proche de l'objectif, profiter de la construction libre et sortir de
quarantaine quand y rester coûte des loyers, avec un écart de niveau préservé.

## ADDED Requirements

### Requirement: Niveau facile

L'IA facile SHALL garder ses décisions habituelles quelles que soient les options, tout en
respectant les règles qu'elles imposent.

#### Scenario: Construction libre ignorée

- **WHEN** la construction libre est active et que l'IA facile construit sur une famille complète
- **THEN** elle répartit ses backdoors comme sans l'option

### Requirement: Fin de partie proche

Avec une limite de tours, à 3 tours de table ou moins de la fin, les IA normale et difficile SHALL
évaluer leurs décisions par leur patrimoine immédiat : elles SHALL NOT réactiver de système, SHALL
NOT revendre de construction sauf pour régler une dette, SHALL enchérir jusqu'au prix de la case
quand elles en ont les moyens, et SHALL accepter un échange seulement s'il augmente leur patrimoine.

#### Scenario: Pas de réactivation en fin de partie

- **WHEN** la limite est de 30 tours, que le tour de table 28 est en cours et qu'une IA normale a assez d'argent pour réactiver un système
- **THEN** elle ne le réactive pas

#### Scenario: Enchère jusqu'au prix

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours, qu'une IA difficile a 1 000 Ᵽ et qu'une enchère sur le Blog atteint 150 Ᵽ
- **THEN** elle surenchérit, sans dépasser 180 Ᵽ

#### Scenario: Échange qui fait perdre du patrimoine

- **WHEN** la limite est de 30 tours, que le tour de table 28 est en cours et qu'on propose à une IA normale un échange qui réduit son patrimoine
- **THEN** elle le refuse

#### Scenario: Comportement habituel plus tôt

- **WHEN** la limite est de 30 tours et que le tour de table 10 est en cours
- **THEN** les IA normale et difficile prennent les mêmes décisions que sans limite de tours

### Requirement: Adversaire proche de l'objectif

Avec un objectif de patrimoine, quand un adversaire atteint 80 % de l'objectif, l'IA difficile SHALL
refuser tout échange qui augmente le patrimoine de cet adversaire et SHALL surenchérir, dans la
limite de ses moyens, pour l'empêcher de compléter une famille aux enchères ; l'IA normale SHALL
refuser les échanges qui complètent une famille de cet adversaire.

#### Scenario: Échange refusé au meneur

- **WHEN** l'objectif est de 10 000 Ᵽ, que Bob a un patrimoine de 8 500 Ᵽ et propose à une IA difficile un échange qui lui est favorable à elle mais augmente aussi le patrimoine de Bob
- **THEN** l'IA difficile refuse

#### Scenario: Famille bloquée aux enchères

- **WHEN** l'objectif est de 10 000 Ᵽ, que Bob a 8 500 Ᵽ de patrimoine, possède le Forum et le Blog, et qu'une enchère porte sur la Boutique en ligne
- **THEN** l'IA difficile surenchérit sur Bob tant que ses moyens le permettent

#### Scenario: IA normale

- **WHEN** l'objectif est de 10 000 Ᵽ, que Bob a 8 500 Ᵽ de patrimoine et propose à une IA normale un échange qui lui compléterait la famille Web
- **THEN** l'IA normale refuse

### Requirement: Construction libre

Avec la construction libre, les IA normale et difficile SHALL construire d'abord sur le système de
la famille qui offre le meilleur gain de loyer par Ᵽ investi, au lieu de répartir uniformément.

#### Scenario: Concentration sur le meilleur système

- **WHEN** la construction libre est active, qu'une IA normale possède la famille Web sans construction et peut payer une seule backdoor
- **THEN** elle l'installe sur la Boutique en ligne, dont le gain de loyer par backdoor est le plus élevé

### Requirement: Quarantaine sans loyer

Les IA normale et difficile SHALL, avec l'option « pas de loyer en quarantaine », si elles possèdent
au moins un système construit, sortir de quarantaine dès le début de leur tour, avec une Clé de
déchiffrement si elles en ont une, sinon en payant l'amende si leur argent le permet.

#### Scenario: Sortie immédiate avec une clé

- **WHEN** l'option est active, qu'une IA difficile en quarantaine possède des systèmes construits et une Clé de déchiffrement
- **THEN** elle utilise la clé au début de son tour

#### Scenario: Sans construction

- **WHEN** l'option est active et qu'une IA normale en quarantaine ne possède aucun système construit
- **THEN** elle décide de sortir ou non comme sans l'option

### Requirement: Cagnotte

Les IA SHALL NOT compter la cagnotte de la DMZ dans leurs projections de revenus, et SHALL traiter
la cagnotte remportée par un joueur comme de l'argent liquide ordinaire de ce joueur.

#### Scenario: Cagnotte ignorée dans les projections

- **WHEN** la cagnotte vaut 1 000 Ᵽ et qu'une IA normale évalue l'achat d'un système
- **THEN** son évaluation est identique à celle qu'elle ferait avec une cagnotte vide
