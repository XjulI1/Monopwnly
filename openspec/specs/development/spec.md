# development Specification

## Purpose
Installer et revendre des backdoors et des rootkits sur les familles complètes, en respectant la
construction uniforme et le stock de la banque, et mettre en veille ou réactiver des cases.
## Requirements
### Requirement: Conditions de construction

`buildBackdoor` SHALL être accepté seulement pendant le tour du joueur (`preRoll` ou `postRoll`),
sur un système dont il possède toute la famille, aucun système de la famille n'étant en veille. Les
nœuds et services SHALL NOT recevoir de construction. Le coût de la famille SHALL être débité.

#### Scenario: Première backdoor

- **WHEN** un joueur avec 500 Ᵽ possédant Minitel et Modem 56k construit sur le Minitel en `preRoll`
- **THEN** le Minitel est au niveau 1, le joueur a 450 Ᵽ et la banque a 31 backdoors

#### Scenario: Famille incomplète

- **WHEN** un joueur construit sur le Forum sans posséder le Blog
- **THEN** l'action est rejetée avec le code `GROUP_INCOMPLETE`

#### Scenario: Famille avec un système en veille

- **WHEN** un joueur construit sur le Forum alors que son Blog est en veille
- **THEN** l'action est rejetée avec le code `MORTGAGED`

#### Scenario: Nœud

- **WHEN** un joueur construit sur un nœud
- **THEN** l'action est rejetée avec le code `NOT_BUILDABLE`

#### Scenario: Hors de son tour

- **WHEN** un joueur construit pendant une enchère
- **THEN** l'action est rejetée avec le code `WRONG_PHASE`

### Requirement: Construction uniforme

Un système SHALL NOT recevoir de construction si son niveau dépasse déjà celui d'un autre système de
sa famille. Un système SHALL NOT être revendu si son niveau est inférieur à celui d'un autre
système de sa famille.

#### Scenario: Construction inégale

- **WHEN** Minitel est au niveau 1 et Modem 56k au niveau 0, et le joueur construit sur le Minitel
- **THEN** l'action est rejetée avec le code `UNEVEN_BUILDING`

#### Scenario: Revente inégale

- **WHEN** Minitel est au niveau 1 et Modem 56k au niveau 2, et le joueur revend sur le Minitel
- **THEN** l'action est rejetée avec le code `UNEVEN_BUILDING`

### Requirement: Rootkit

Une construction sur un système à 4 backdoors SHALL le passer au niveau 5 (rootkit) pour le coût
d'une backdoor : la banque reçoit les 4 backdoors et cède un rootkit.

#### Scenario: Passage au rootkit

- **WHEN** les trois systèmes Web sont au niveau 4, la banque a 20 backdoors et 12 rootkits, et le joueur construit sur le Forum
- **THEN** le Forum est au niveau 5, le joueur a payé 100 Ᵽ
- **AND** la banque a 24 backdoors et 11 rootkits

### Requirement: Stock de la banque

Une construction SHALL être refusée avec `NO_STOCK` si la banque n'a plus la pièce demandée.

#### Scenario: Pénurie de backdoors

- **WHEN** la banque n'a plus de backdoor et le joueur construit une première backdoor
- **THEN** l'action est rejetée avec le code `NO_STOCK`

### Requirement: Revente

`sellBackdoor` SHALL retirer un niveau et créditer le joueur de la moitié du coût d'une backdoor de
la famille, pendant son tour ou pendant le règlement de sa dette. Revendre un rootkit SHALL le
remplacer par 4 backdoors prises au stock ; si la banque en a moins de 4, la revente SHALL être
refusée avec `NO_STOCK`.

#### Scenario: Revente d'une backdoor

- **WHEN** un joueur revend une backdoor de la Boutique en ligne
- **THEN** il reçoit 50 Ᵽ et le niveau baisse de 1

#### Scenario: Revente d'un rootkit

- **WHEN** un joueur revend le rootkit du Noyau de l'IA, la banque ayant 10 backdoors
- **THEN** il reçoit 100 Ᵽ, le Noyau passe au niveau 4 et la banque a 6 backdoors et un rootkit de plus

### Requirement: Mise en veille et réactivation

`mortgage` SHALL mettre en veille une case possédée et créditer sa valeur de veille, à condition
qu'aucun système de sa famille ne porte de construction (`HAS_BUILDINGS` sinon). `unmortgage` SHALL
la réactiver contre sa valeur de veille majorée de 10 %, arrondie à l'entier supérieur, pendant le
tour du joueur seulement. La mise en veille SHALL être aussi permise pendant le règlement d'une
dette.

#### Scenario: Mise en veille

- **WHEN** un joueur met en veille le Nœud VPN
- **THEN** il reçoit 100 Ᵽ et le nœud est en veille

#### Scenario: Famille construite

- **WHEN** un joueur met en veille le Blog alors que le Forum porte une backdoor
- **THEN** l'action est rejetée avec le code `HAS_BUILDINGS`

#### Scenario: Réactivation

- **WHEN** un joueur réactive le Minitel en veille
- **THEN** il paie 33 Ᵽ et le Minitel est actif

#### Scenario: Réactivation pendant une dette

- **WHEN** un débiteur envoie `unmortgage` en phase `debt`
- **THEN** l'action est rejetée avec le code `WRONG_PHASE`

