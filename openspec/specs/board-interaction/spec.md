# board-interaction Specification

## Purpose
Permettre de désigner une case du plateau à la souris ou au doigt, et afficher les états de
surbrillance que l'interface de jeu lui demande, sans que le plateau ne connaisse les règles.
## Requirements
### Requirement: Sélection d'une case

Un clic ou un toucher bref sur une case SHALL signaler à l'appelant l'index de cette case. Un geste
de déplacement ou de zoom SHALL NOT être interprété comme une sélection. Un clic hors des cases (au
centre du plateau ou en dehors) SHALL signaler une désélection. Toucher une construction ou un pion
posé sur une case SHALL être traité comme un toucher de cette case.

#### Scenario: Clic sur une case

- **WHEN** le joueur clique sur la Néobanque
- **THEN** le plateau signale la sélection de la case 28

#### Scenario: Glisser n'est pas sélectionner

- **WHEN** le joueur appuie sur une case puis glisse de plus de quelques pixels avant de relâcher
- **THEN** la vue se déplace et aucune sélection n'est signalée

#### Scenario: Clic au centre

- **WHEN** le joueur clique au centre du plateau
- **THEN** le plateau signale une désélection

#### Scenario: Clic sur un rootkit

- **WHEN** le joueur clique sur le rootkit posé sur le Forum
- **THEN** le plateau signale la sélection de la case 16

### Requirement: États de surbrillance pilotés par l'appelant

Le plateau SHALL afficher pour chaque case l'état de surbrillance fourni par l'appelant parmi :
aucun, sélectionnable, sélectionné. Les cases non sélectionnables SHALL être atténuées dès qu'au
moins une case est marquée sélectionnable. Le plateau SHALL NOT décider seul de ces états.

#### Scenario: Sélectionnables mis en avant

- **WHEN** l'appelant marque les 3 systèmes de la famille Web comme sélectionnables
- **THEN** ces 3 cases sont mises en avant et les autres sont atténuées

#### Scenario: Case sélectionnée

- **WHEN** l'appelant marque une case comme sélectionnée
- **THEN** elle est visuellement distincte des cases sélectionnables et des autres

#### Scenario: Aucune surbrillance

- **WHEN** l'appelant ne fournit aucune surbrillance
- **THEN** toutes les cases sont affichées normalement

### Requirement: Survol

Sur un appareil à pointeur, la case survolée SHALL être légèrement mise en avant et son nom affiché.
Sur un appareil tactile, aucun état de survol ne SHALL rester affiché après un toucher.

#### Scenario: Survol à la souris

- **WHEN** le pointeur survole le Câble sous-marin
- **THEN** la case est mise en avant et le nom « Câble sous-marin » est affiché

