# Spec Delta

## Purpose

Cadrer le plateau dans une vue du haut inclinée et permettre au joueur de zoomer et de se déplacer
sur le plateau, à la souris comme au tactile, sans jamais le perdre de vue.

## ADDED Requirements

### Requirement: Cadrage initial

Au chargement, la caméra SHALL regarder le plateau depuis le haut avec une inclinaison fixe comprise
entre 45° et 60° par rapport à l'horizontale, côté Boot, et SHALL cadrer le plateau entier dans la
zone d'affichage, quel que soit son format à partir de 1024 × 768.

#### Scenario: Plateau entier visible sur ordinateur

- **WHEN** le plateau s'affiche dans une zone de 1920 × 1080
- **THEN** les 40 cases sont visibles

#### Scenario: Plateau entier visible sur tablette

- **WHEN** le plateau s'affiche dans une zone de 1024 × 768
- **THEN** les 40 cases sont visibles

#### Scenario: Redimensionnement

- **WHEN** la fenêtre est redimensionnée
- **THEN** le rendu s'adapte à la nouvelle taille sans déformation

### Requirement: Zoom

Le joueur SHALL pouvoir zoomer à la molette et par pincement, entre le cadrage du plateau entier
(zoom minimal) et un niveau où une case ordinaire occupe environ un cinquième de la largeur de la
zone d'affichage (zoom maximal). Le zoom SHALL se faire vers le point visé par le pointeur ou par le
centre du pincement.

#### Scenario: Zoom borné

- **WHEN** le joueur continue de zoomer au-delà du zoom maximal
- **THEN** le zoom reste au maximal

#### Scenario: Zoom vers le pointeur

- **WHEN** le joueur zoome à la molette avec le pointeur sur la DMZ
- **THEN** la DMZ reste sous le pointeur pendant le zoom

### Requirement: Déplacement

Le joueur SHALL pouvoir déplacer la vue en glissant (bouton de souris ou un doigt). Le centre de la
vue SHALL rester dans les limites du plateau. L'inclinaison et l'orientation de la caméra SHALL NOT
pouvoir être modifiées.

#### Scenario: Déplacement borné

- **WHEN** le joueur glisse loin au-delà du bord du plateau
- **THEN** la vue s'arrête au bord du plateau

#### Scenario: Pas de rotation

- **WHEN** le joueur fait un clic droit glissé ou une rotation à deux doigts
- **THEN** l'orientation et l'inclinaison de la caméra restent inchangées

### Requirement: Recentrage

Le plateau SHALL offrir une commande de recentrage qui ramène la caméra au cadrage initial.

#### Scenario: Recentrer après un zoom

- **WHEN** le joueur a zoomé et déplacé la vue puis déclenche le recentrage
- **THEN** la caméra revient au cadrage du plateau entier

### Requirement: Suivi du pion

Quand l'appelant active le suivi, la caméra SHALL, pendant un déplacement de pion, se recentrer en
douceur sur le pion dès qu'il sort du tiers central de la zone d'affichage, sans changer le niveau
de zoom. Au zoom minimal, le suivi SHALL NOT déplacer la caméra.

#### Scenario: Pion qui sort du cadre

- **WHEN** le joueur a zoomé sur le côté bas et qu'un pion animé avec suivi actif tourne le coin de la Quarantaine
- **THEN** la vue se déplace pour garder le pion visible

#### Scenario: Zoom minimal

- **WHEN** la caméra est au cadrage initial et qu'un pion est animé avec suivi actif
- **THEN** la caméra ne bouge pas
