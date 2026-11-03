# Spec Delta

## MODIFIED Requirements

### Requirement: Carte affichée

Quand le joueur pioche une carte Exploit ou Patch, la carte SHALL être affichée avec son type, son
titre et le texte de son effet avant que l'effet ne soit présenté. La carte SHALL rester affichée
jusqu'à ce que le joueur la touche, à toutes les vitesses d'animation et même quand l'animation a été
passée : elle ne se ferme jamais seule. Toucher hors de la carte la ferme et passe le reste de
l'action. Une fois la carte et son effet présentés, le journal SHALL indiquer le joueur, le paquet,
le titre et l'effet de la carte.

#### Scenario: Carte de déplacement

- **WHEN** le joueur pioche la carte Exploit « Rollback »
- **THEN** la carte « Rollback — Reculez de 3 cases » est affichée, puis le pion recule de 3 cases

#### Scenario: Clé conservée

- **WHEN** le joueur pioche une Clé de déchiffrement
- **THEN** la carte est affichée puis le compteur de Clés du joueur augmente de 1

#### Scenario: Carte jamais fermée seule

- **WHEN** le joueur pioche une carte et ne touche pas l'écran
- **THEN** la carte reste affichée et la suite de l'action attend

#### Scenario: Carte dans le journal

- **WHEN** Alice pioche la carte Exploit « Rollback » sur la case Exploit qui suit l'Intranet, ferme la carte et que son pion a reculé
- **THEN** le journal affiche la ligne « Alice pioche Exploit : Rollback — recule sur Messagerie pro »

#### Scenario: Carte après un passage d'animation

- **WHEN** le joueur touche l'écran pendant le déplacement qui l'amène sur une case Exploit
- **THEN** le pion arrive aussitôt sur la case et la carte s'affiche jusqu'à ce que le joueur la touche
