# Spec Delta

## MODIFIED Requirements

### Requirement: Cadrage initial

Au chargement, la caméra SHALL regarder le plateau depuis le haut avec une inclinaison fixe comprise
entre 45° et 60° par rapport à l'horizontale, côté Boot, et SHALL cadrer le plateau entier dans la
zone d'affichage, quel que soit son format à partir de 1024 × 768. Le plateau cadré SHALL être
centré verticalement dans la zone d'affichage et laisser une marge entre ses bords et ceux de la
zone.

#### Scenario: Plateau entier visible sur ordinateur

- **WHEN** le plateau s'affiche dans une zone de 1920 × 1080
- **THEN** les 40 cases sont visibles

#### Scenario: Plateau entier visible sur tablette

- **WHEN** le plateau s'affiche dans une zone de 1024 × 768
- **THEN** les 40 cases sont visibles

#### Scenario: Plateau centré

- **WHEN** le plateau est cadré, au chargement ou après un recentrage
- **THEN** son bord proche est aussi loin du bas de la zone que son bord lointain l'est du haut, et aucun bord du plateau ne touche celui de la zone

#### Scenario: Redimensionnement

- **WHEN** la fenêtre est redimensionnée
- **THEN** le rendu s'adapte à la nouvelle taille sans déformation
