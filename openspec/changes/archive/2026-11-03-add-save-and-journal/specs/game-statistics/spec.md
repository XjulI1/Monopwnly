# Spec Delta

## Purpose

Collecter des statistiques pendant la partie et les présenter à la fin, pour voir comment les
fortunes ont évolué, quels systèmes ont rapporté et comment chaque joueur a fait faillite.

## ADDED Requirements

### Requirement: Relevé à chaque tour

Au début de chaque tour de table, l'application SHALL relever pour chaque joueur non failli son
argent liquide et son patrimoine, ce dernier calculé par la requête de patrimoine du moteur (argent
liquide, prix des systèmes actifs, valeur de veille des systèmes en veille, coût des constructions).
Ces relevés SHALL être conservés dans la sauvegarde.

#### Scenario: Relevé de début de tour

- **WHEN** le tour de table 5 commence
- **THEN** un relevé est ajouté avec, pour chaque joueur non failli, son argent liquide et son patrimoine à cet instant

#### Scenario: Joueur failli sans relevé

- **WHEN** Bob a fait faillite au tour 12 et que le tour 13 commence
- **THEN** le relevé du tour 13 ne contient pas Bob

### Requirement: Compteurs par joueur

Pour chaque joueur, l'application SHALL compter au fil de la partie : loyers perçus, loyers payés,
taxes et amendes payées, salaires reçus au passage de Boot, systèmes achetés et montant dépensé en
achats, enchères remportées, backdoors et rootkits construits, passages en quarantaine, doubles
obtenus, ainsi que le tour de sa faillite et son créancier.

#### Scenario: Loyer compté des deux côtés

- **WHEN** Bob paie 250 Ᵽ de loyer à Alice
- **THEN** les loyers perçus d'Alice augmentent de 250 Ᵽ et les loyers payés de Bob de 250 Ᵽ

#### Scenario: Faillite datée

- **WHEN** Bob fait faillite au profit d'Alice au tour 23
- **THEN** les statistiques de Bob indiquent « faillite au tour 23 au profit d'Alice »

#### Scenario: Faillite envers la banque

- **WHEN** Carol fait faillite en payant la taxe Rançongiciel au tour 9
- **THEN** les statistiques de Carol indiquent « faillite au tour 9 au profit de la banque »

### Requirement: Rentabilité des cases

L'application SHALL cumuler, pour chaque case achetable, le total des loyers perçus sur cette case
au cours de la partie, quel qu'en ait été le propriétaire.

#### Scenario: Cumul par case

- **WHEN** le Blog rapporte 70 Ᵽ à Alice puis, après un changement de propriétaire, 195 Ᵽ à Bob
- **THEN** la rentabilité du Blog est de 265 Ᵽ

### Requirement: Écran de statistiques

L'écran de fin SHALL proposer un onglet « Statistiques » avec deux courbes (patrimoine par tour et
argent liquide par tour, une ligne par joueur dans sa couleur, avec légende, la courbe d'un joueur
failli s'arrêtant à sa faillite), un tableau récapitulatif des compteurs par joueur, le vainqueur en
premier puis les autres dans l'ordre inverse de leur faillite, et le classement des cinq cases les
plus rentables. Le contenu SHALL rester lisible dès 1024 × 768.

#### Scenario: Ordre du tableau

- **WHEN** Carol gagne, Bob a fait faillite au tour 30 et Alice au tour 18
- **THEN** le tableau liste Carol, puis Bob, puis Alice

#### Scenario: Courbes

- **WHEN** l'utilisateur ouvre l'onglet « Statistiques » après une partie de 40 tours à 3 joueurs sans faillite avant la fin
- **THEN** deux courbes de 40 points par joueur s'affichent avec une légende aux couleurs des joueurs

#### Scenario: Cases les plus rentables

- **WHEN** l'utilisateur ouvre l'onglet « Statistiques »
- **THEN** les cinq cases ayant rapporté le plus de loyers sont listées avec leur famille et leur total, de la plus rentable à la moins rentable

#### Scenario: Plus petit écran cible

- **WHEN** l'onglet « Statistiques » est ouvert en 1024 × 768
- **THEN** les courbes, le tableau et le classement sont lisibles sans défilement horizontal de la page
