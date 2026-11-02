# Spec Delta

## Purpose

Organiser l'application en écrans successifs (accueil, création, partie, fin de partie) et définir
comment on passe de l'un à l'autre.

## ADDED Requirements

### Requirement: Écran d'accueil

Au lancement, l'application SHALL afficher un écran d'accueil au nom de Monopwnly proposant de créer
une nouvelle partie.

#### Scenario: Lancement de l'application

- **WHEN** l'utilisateur ouvre l'application
- **THEN** l'écran d'accueil s'affiche avec un bouton « Nouvelle partie »

#### Scenario: Aller à la création

- **WHEN** l'utilisateur clique sur « Nouvelle partie »
- **THEN** l'écran de création de partie s'affiche

### Requirement: Écran de partie

Une fois la partie créée, l'application SHALL afficher le plateau 3D avec le panneau latéral du HUD.
L'utilisateur SHALL pouvoir abandonner la partie et revenir à l'accueil après confirmation.

#### Scenario: Démarrage d'une partie

- **WHEN** l'utilisateur valide la création d'une partie
- **THEN** l'écran de partie s'affiche avec le plateau, tous les pions sur Boot et le HUD du premier joueur

#### Scenario: Abandon confirmé

- **WHEN** l'utilisateur choisit « Quitter la partie » puis confirme
- **THEN** l'écran d'accueil s'affiche

#### Scenario: Abandon annulé

- **WHEN** l'utilisateur choisit « Quitter la partie » puis annule
- **THEN** la partie continue sans changement

### Requirement: Écran de fin de partie

Quand le moteur déclare un vainqueur, l'application SHALL afficher un écran de fin de partie
nommant le vainqueur dans sa couleur avec son argent final, par-dessus le plateau final, avec les
choix « Rejouer avec les mêmes paramètres » et « Retour à l'accueil ».

#### Scenario: Victoire

- **WHEN** le moteur déclare la victoire d'Alice
- **THEN** l'écran de fin affiche « Alice remporte la partie » dans la couleur d'Alice

#### Scenario: Rejouer

- **WHEN** l'utilisateur choisit « Rejouer avec les mêmes paramètres »
- **THEN** une nouvelle partie démarre avec les mêmes joueurs et réglages et une nouvelle graine
