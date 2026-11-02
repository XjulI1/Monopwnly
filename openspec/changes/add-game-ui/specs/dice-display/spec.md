# Spec Delta

## Purpose

Rendre lisible et vivant tout ce que produit un lancer : dés, déplacement du pion case par case,
passage par Boot, carte Exploit ou Patch, paiements, dans l'ordre où le moteur les a produits et à
une vitesse réglable.

## ADDED Requirements

### Requirement: Dés animés

Chaque lancer produit par le moteur SHALL être montré par l'animation de deux dés qui s'arrêtent
exactement sur les valeurs de l'événement, avec le total affiché. Un double SHALL être signalé par
la mention « Double ! ».

#### Scenario: Lancer simple

- **WHEN** le moteur produit un lancer 5 et 2
- **THEN** les dés s'arrêtent sur 5 et 2 et le total 7 est affiché

#### Scenario: Double

- **WHEN** le moteur produit un lancer 3 et 3
- **THEN** la mention « Double ! » est affichée avec les dés

### Requirement: Présentation ordonnée des événements

Les événements d'une action SHALL être présentés un à un dans l'ordre produit par le moteur : dés,
déplacement case par case selon l'événement `moved`, salaire au passage de Boot, carte piochée,
déplacement dû à la carte, paiements. Le plateau et le panneau des joueurs SHALL être mis à jour à la
fin de l'étape qui les concerne, et non avant.

#### Scenario: Déplacement case par case

- **WHEN** le joueur avance de la case 3 à la case 10
- **THEN** son pion traverse chacune des cases 4 à 9 avant de s'arrêter sur la case 10

#### Scenario: Passage par Boot

- **WHEN** le déplacement traverse Boot
- **THEN** l'argent du joueur augmente du salaire au moment où le pion passe Boot, avec l'indication « +200 Ᵽ »

#### Scenario: Loyer payé

- **WHEN** le joueur s'arrête sur un système d'un autre joueur et paie 50 Ᵽ de loyer
- **THEN** à la fin du déplacement l'argent du payeur diminue de 50 Ᵽ et celui du propriétaire augmente de 50 Ᵽ, avec une indication visible du paiement

#### Scenario: Envoi en quarantaine

- **WHEN** le joueur s'arrête sur Détecté !
- **THEN** son pion est ensuite déplacé directement sur la Quarantaine et marqué en quarantaine

### Requirement: Carte affichée

Quand le joueur pioche une carte Exploit ou Patch, la carte SHALL être affichée avec son type, son
titre et le texte de son effet avant que l'effet ne soit présenté. La carte SHALL se fermer au
toucher ou après un délai qui dépend de la vitesse d'animation.

#### Scenario: Carte de déplacement

- **WHEN** le joueur pioche la carte Exploit « Rollback »
- **THEN** la carte « Rollback — Reculez de 3 cases » est affichée, puis le pion recule de 3 cases

#### Scenario: Clé conservée

- **WHEN** le joueur pioche une Clé de déchiffrement
- **THEN** la carte est affichée puis le compteur de Clés du joueur augmente de 1

### Requirement: Passer l'animation

L'utilisateur SHALL pouvoir passer l'animation restante d'un toucher : le plateau et le HUD affichent
alors immédiatement l'état final de l'action.

#### Scenario: Toucher pendant un déplacement

- **WHEN** l'utilisateur touche l'écran pendant le déplacement d'un pion
- **THEN** le pion, l'argent et les cases affichent immédiatement l'état final de l'action

### Requirement: Vitesse d'animation

L'utilisateur SHALL pouvoir choisir la vitesse d'animation parmi lente, normale, rapide et
instantanée, depuis le HUD, à tout moment. Le choix SHALL être mémorisé sur l'appareil. En vitesse
instantanée, aucune animation n'est jouée : le résultat du lancer, la carte et les paiements sont
résumés en texte dans le HUD.

#### Scenario: Vitesse mémorisée

- **WHEN** l'utilisateur choisit « rapide » puis recharge l'application
- **THEN** la vitesse est toujours « rapide »

#### Scenario: Vitesse instantanée

- **WHEN** la vitesse est « instantanée » et que le joueur lance les dés
- **THEN** le plateau est mis à jour sans animation et le résultat s'affiche en texte dans le HUD

### Requirement: Mouvement réduit

Si le système de l'utilisateur demande de réduire les animations, la vitesse par défaut SHALL être
« instantanée ».

#### Scenario: Préférence système

- **WHEN** le navigateur signale la préférence de mouvement réduit et qu'aucune vitesse n'a été mémorisée
- **THEN** la vitesse est « instantanée »
