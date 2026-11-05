## MODIFIED Requirements

### Requirement: Compteurs par joueur

Pour chaque joueur, l'application SHALL compter au fil de la partie : loyers perçus, loyers payés,
taxes et amendes payées, salaires reçus au passage de Boot, systèmes achetés et montant dépensé en
achats, enchères remportées, backdoors et rootkits construits, passages en quarantaine, doubles
obtenus, ainsi que le tour de sa faillite, son créancier et si elle était volontaire (abandon).

#### Scenario: Loyer compté des deux côtés

- **WHEN** Bob paie 250 Ᵽ de loyer à Alice
- **THEN** les loyers perçus d'Alice augmentent de 250 Ᵽ et les loyers payés de Bob de 250 Ᵽ

#### Scenario: Faillite datée

- **WHEN** Bob fait faillite au profit d'Alice au tour 23
- **THEN** les statistiques de Bob indiquent « faillite au tour 23 au profit d'Alice »

#### Scenario: Faillite envers la banque

- **WHEN** Carol fait faillite en payant la taxe Rançongiciel au tour 9
- **THEN** les statistiques de Carol indiquent « faillite au tour 9 au profit de la banque »

#### Scenario: Abandon daté

- **WHEN** Bob abandonne pendant son tour au tour 15
- **THEN** les statistiques de Bob indiquent « abandon au tour 15 »
