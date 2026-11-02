# Spec Delta

## Purpose

Afficher en 3D, dans le style d'un plateau low-poly au thème cyber, les 40 cases de Monopwnly et
l'état d'une partie : propriétaire et mise en veille de chaque case, constructions, position des
pions et leurs déplacements case par case.

## ADDED Requirements

### Requirement: Géométrie du plateau carré

Le plateau SHALL être un carré de 40 cases, 11 par côté coins compris, dont les 4 coins (Boot,
Quarantaine, DMZ, Détecté !) sont des carrés plus grands que les cases ordinaires. La position de
chaque case SHALL être calculée à partir de son index dans le moteur, dans le sens du déplacement,
avec Boot dans le coin en bas à droite vu de la caméra. Les cases ne SHALL NOT se chevaucher et
SHALL couvrir tout le pourtour du plateau.

#### Scenario: Correspondance avec le moteur

- **WHEN** on calcule la disposition du plateau
- **THEN** elle contient exactement une tuile pour chacun des 40 index de case du moteur

#### Scenario: Coins

- **WHEN** on calcule la disposition des cases 0, 10, 20 et 30
- **THEN** ce sont les quatre coins du plateau et chacun est plus grand qu'une case ordinaire

#### Scenario: Sens du déplacement

- **WHEN** on compare les positions des cases 0, 1 et 9
- **THEN** elles sont alignées sur le même côté et la case 1 est voisine de la case 0

#### Scenario: Pas de chevauchement

- **WHEN** on compare deux à deux les rectangles des 40 cases
- **THEN** aucun ne chevauche un autre

### Requirement: Contenu des cases

Chaque système SHALL afficher un bandeau de la couleur de sa famille, son nom et son prix en
PwnCoins. Les nœuds, services, taxes, cases carte et coins SHALL afficher une icône propre à leur
type et leur nom, ainsi que leur prix ou leur montant quand ils en ont un. Le texte d'une case SHALL
être orienté pour être lisible depuis le bord du plateau où elle se trouve.

#### Scenario: Système

- **WHEN** le plateau est affiché
- **THEN** la case Minitel porte un bandeau de la couleur de la famille Rétro, le nom « Minitel » et « 60 Ᵽ »

#### Scenario: Taxe

- **WHEN** le plateau est affiché
- **THEN** la case Rançongiciel affiche son icône de taxe et « 200 Ᵽ »

#### Scenario: Familles distinctes

- **WHEN** on compare les couleurs des 8 familles
- **THEN** elles sont toutes différentes entre elles

### Requirement: Propriétaire et mise en veille

Une case possédée SHALL être signalée par un liseré lumineux à la couleur de son propriétaire. Une
case en veille SHALL rester signalée à la couleur de son propriétaire mais visiblement atténuée.
Une case à la banque SHALL NOT porter de liseré. Un changement de l'état fourni SHALL être reflété
sans recharger le plateau.

#### Scenario: Achat

- **WHEN** l'état fourni passe d'un état où le Blog est à la banque à un état où il appartient à un joueur rouge
- **THEN** le Blog porte un liseré rouge sans rechargement de la scène

#### Scenario: Mise en veille

- **WHEN** l'état fourni indique que le Blog du joueur rouge est en veille
- **THEN** le Blog est affiché atténué avec un liseré rouge

#### Scenario: Retour à la banque

- **WHEN** l'état fourni indique que le Blog n'a plus de propriétaire
- **THEN** le Blog ne porte plus de liseré

### Requirement: Constructions en relief

Un système SHALL afficher autant de backdoors en relief que son niveau de construction de 1 à 4, et
un rootkit unique, plus haut, au niveau 5, aux couleurs de son propriétaire. Les constructions SHALL
être mises à jour avec l'état fourni.

#### Scenario: Trois backdoors

- **WHEN** l'état fourni indique un niveau 3 sur l'Intranet
- **THEN** trois backdoors sont visibles sur l'Intranet

#### Scenario: Rootkit

- **WHEN** l'état fourni passe le Forum du niveau 4 au niveau 5
- **THEN** les quatre backdoors du Forum disparaissent et un rootkit apparaît

### Requirement: Pions des joueurs

Chaque joueur non en faillite SHALL être représenté par un pion 3D à sa couleur posé sur la case de
sa position. Plusieurs pions sur une même case SHALL être disposés sans se chevaucher, jusqu'à 6. Sur
la case Quarantaine, un pion en quarantaine SHALL être placé dans la zone de quarantaine et un pion en
simple visite à l'extérieur de cette zone.

#### Scenario: Six pions sur Boot

- **WHEN** une partie à 6 joueurs commence et que tous sont sur Boot
- **THEN** les 6 pions sont visibles sur Boot sans se chevaucher

#### Scenario: Quarantaine et simple visite

- **WHEN** un joueur est en quarantaine et un autre en simple visite sur la case 10
- **THEN** leurs pions occupent des zones distinctes de la case

#### Scenario: Faillite

- **WHEN** l'état fourni indique qu'un joueur est en faillite
- **THEN** son pion n'est plus affiché

### Requirement: Déplacement case par case

Le plateau SHALL offrir à l'appelant une commande qui fait avancer le pion d'un joueur le long d'une
liste de cases, dans l'ordre donné, avec une durée par case fixée par l'appelant, et qui signale la
fin du déplacement. Une durée nulle SHALL placer le pion directement à l'arrivée. À la fin, le pion
SHALL reprendre la position que donne l'état fourni.

#### Scenario: Avance de 7 cases

- **WHEN** l'appelant demande de déplacer un pion le long des cases 3 à 10
- **THEN** le pion passe successivement par chacune de ces cases puis s'arrête sur la case 10 et la fin est signalée

#### Scenario: Passage par Boot

- **WHEN** l'appelant demande de déplacer un pion le long des cases 37, 38, 39, 0, 1, 2
- **THEN** le pion traverse Boot et s'arrête sur la case 2

#### Scenario: Recul

- **WHEN** l'appelant demande de déplacer un pion le long des cases 22, 21, 20, 19
- **THEN** le pion recule case par case jusqu'à la case 19

#### Scenario: Durée nulle

- **WHEN** l'appelant demande un déplacement avec une durée par case de 0
- **THEN** le pion est placé immédiatement sur la dernière case et la fin est signalée

### Requirement: Fluidité

Le plateau SHALL rester fluide sur un ordinateur portable ou une tablette récents, et SHALL adapter
sa résolution à la densité d'écran sans dépasser un rendu au double de la résolution CSS.

#### Scenario: Écran haute densité

- **WHEN** le plateau est affiché sur un écran de densité 3
- **THEN** le rendu se fait à une densité de 2 au maximum
