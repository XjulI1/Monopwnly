# Spec Delta

## Purpose

Faire jouer les IA de manière crédible avec les options actives : jouer le patrimoine quand la fin
approche, freiner un adversaire proche de l'objectif, profiter de la construction libre et sortir de
quarantaine quand y rester coûte des loyers, avec un écart de niveau préservé.

## ADDED Requirements

### Requirement: Niveau facile

L'IA facile SHALL garder ses décisions habituelles quelles que soient les options, tout en
respectant les règles qu'elles imposent. Avec la construction libre, elle SHALL ne construire que sur
les systèmes les moins construits de leur famille, comme sans l'option.

#### Scenario: Construction libre ignorée

- **WHEN** la construction libre est active et que l'IA facile construit sur une famille complète
- **THEN** elle répartit ses backdoors comme sans l'option

### Requirement: Fin de partie proche

Avec une limite de tours, pendant les 3 derniers tours de table (les tours 28, 29 et 30 pour une
limite de 30), les IA normale et difficile SHALL évaluer leurs décisions par leur patrimoine
immédiat : elles SHALL NOT réactiver de système, SHALL NOT revendre de construction sauf pour régler
une dette, SHALL enchérir jusqu'au prix de la case quand elles en ont les moyens, et SHALL accepter un
échange seulement s'il augmente strictement leur patrimoine.

#### Scenario: Pas de réactivation en fin de partie

- **WHEN** la limite est de 30 tours, que le tour de table 28 est en cours et qu'une IA normale a assez d'argent pour réactiver un système
- **THEN** elle ne le réactive pas

#### Scenario: Enchère jusqu'au prix

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours, qu'une IA difficile a 1 000 Ᵽ et qu'une enchère sur le Blog atteint 150 Ᵽ
- **THEN** elle surenchérit, sans dépasser 180 Ᵽ

#### Scenario: Échange qui fait perdre du patrimoine

- **WHEN** la limite est de 30 tours, que le tour de table 28 est en cours et qu'on propose à une IA normale un échange qui réduit son patrimoine
- **THEN** elle le refuse

#### Scenario: Échange neutre

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours et qu'on propose à une IA difficile un échange qui laisse son patrimoine inchangé
- **THEN** elle le refuse

#### Scenario: Comportement habituel plus tôt

- **WHEN** la limite est de 30 tours et que le tour de table 27 est en cours
- **THEN** les IA normale et difficile prennent les mêmes décisions que sans limite de tours

### Requirement: Adversaire proche de l'objectif

Avec un objectif de patrimoine, quand un adversaire atteint 80 % de l'objectif, l'IA difficile SHALL
refuser tout échange qui augmente le patrimoine de cet adversaire et SHALL surenchérir pour
l'empêcher de compléter une famille aux enchères ; l'IA normale SHALL refuser les échanges qui
complètent une famille de cet adversaire. La surenchère de blocage SHALL primer sur le plafond de la
fin de partie proche et SHALL NOT faire descendre l'IA sous sa réserve d'argent.

#### Scenario: Échange refusé au meneur

- **WHEN** l'objectif est de 6 000 Ᵽ, que Bob a un patrimoine de 5 100 Ᵽ et propose à une IA difficile un échange qui lui est favorable à elle mais augmente aussi le patrimoine de Bob
- **THEN** l'IA difficile refuse

#### Scenario: Famille bloquée aux enchères

- **WHEN** l'objectif est de 6 000 Ᵽ, que Bob a 5 100 Ᵽ de patrimoine, possède le Forum et le Blog, et qu'une enchère porte sur la Boutique en ligne
- **THEN** l'IA difficile surenchérit sur Bob, au-delà du prix de la case si besoin, tant qu'elle reste au-dessus de sa réserve d'argent

#### Scenario: Blocage en fin de partie proche

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours, que l'objectif est de 6 000 Ᵽ, que Bob a 5 100 Ᵽ de patrimoine, possède le Forum et le Blog, et qu'une enchère sur la Boutique en ligne atteint 200 Ᵽ
- **THEN** l'IA difficile surenchérit au-delà de 200 Ᵽ tant qu'elle reste au-dessus de sa réserve d'argent

#### Scenario: IA normale

- **WHEN** l'objectif est de 6 000 Ᵽ, que Bob a 5 100 Ᵽ de patrimoine et propose à une IA normale un échange qui lui compléterait la famille Web
- **THEN** l'IA normale refuse

### Requirement: Construction libre

Avec la construction libre, les IA normale et difficile SHALL construire d'abord sur le système de
la famille qui offre le meilleur gain de loyer espéré par Ᵽ investi, au lieu de répartir
uniformément. L'IA difficile SHALL alors évaluer une case sans le rendement futur d'une famille
construite uniformément, que la construction libre rend improbable, et SHALL garder une réserve
plus prudente face aux loyers concentrés sur quelques systèmes.

#### Scenario: Concentration sur le meilleur système

- **WHEN** la construction libre est active, qu'une IA normale ou difficile possède la famille Web sans construction et peut payer une seule backdoor
- **THEN** elle l'installe sur la Boutique en ligne, dont le gain de loyer par backdoor est le plus élevé

#### Scenario: Valeur d'une case pour l'IA difficile

- **WHEN** la construction libre est active et qu'une IA difficile qui possède le Forum évalue le Blog
- **THEN** elle lui donne la même valeur qu'une IA normale

#### Scenario: Réserve de l'IA difficile

- **WHEN** la construction libre est active et qu'un rootkit adverse est à portée de dés de l'IA difficile
- **THEN** la réserve qu'elle garde est plus élevée que sans l'option

### Requirement: Quarantaine sans loyer

Avec l'option « pas de loyer en quarantaine », les IA normale et difficile en quarantaine SHALL
sortir dès le début de leur tour quand le loyer qu'elles peuvent espérer de leurs cases sur un tour
de jeu des adversaires dépasse l'amende de sortie : avec une Clé de déchiffrement si elles en ont
une, sinon en payant l'amende si leur argent le permet. Sinon, elles SHALL décider comme sans
l'option.

#### Scenario: Sortie immédiate avec une clé

- **WHEN** l'option est active et qu'une IA difficile en quarantaine, face à deux adversaires, possède la famille Web avec 3 backdoors sur chaque système et une Clé de déchiffrement
- **THEN** elle utilise la clé au début de son tour

#### Scenario: Loyers espérés faibles

- **WHEN** l'option est active et qu'une IA normale en quarantaine ne possède que le Minitel, sans construction
- **THEN** elle décide de sortir ou non comme sans l'option

### Requirement: Cagnotte

Les IA SHALL NOT compter la cagnotte de la DMZ dans leurs projections de revenus, et SHALL traiter
la cagnotte remportée par un joueur comme de l'argent liquide ordinaire de ce joueur.

#### Scenario: Cagnotte ignorée dans les projections

- **WHEN** la cagnotte vaut 1 000 Ᵽ et qu'une IA normale évalue l'achat d'un système
- **THEN** son évaluation est identique à celle qu'elle ferait avec une cagnotte vide
