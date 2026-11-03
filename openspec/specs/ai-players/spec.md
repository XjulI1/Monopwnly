# ai-players Specification

## Purpose
Permettre d'affronter des adversaires contrôlés par l'ordinateur : les déclarer à la création de la
partie, les laisser décider seuls dans et hors de leur tour, de façon lisible, légale et sans accès à
l'information cachée.

## Requirements

### Requirement: Déclaration des joueurs IA

Le formulaire de création SHALL permettre de choisir pour chaque joueur le type « Humain » ou « IA »,
et un niveau unique, parmi facile, normal et difficile, commun à toutes les IA de la partie. Par
défaut, le premier joueur SHALL être humain et les autres des IA, au niveau normal. Une partie sans
aucun humain SHALL être autorisée et se dérouler sans intervention. Le moteur SHALL refuser la
création d'une partie avec un niveau d'IA inconnu.

#### Scenario: Valeurs par défaut

- **WHEN** l'écran de création s'ouvre
- **THEN** le joueur 1 est humain et les autres joueurs sont des IA de niveau normal

#### Scenario: Niveau commun

- **WHEN** l'utilisateur choisit le niveau difficile, puis transforme un joueur humain en IA
- **THEN** toutes les IA de la partie, y compris ce joueur, sont de niveau difficile

#### Scenario: Partie entre IA

- **WHEN** l'utilisateur lance une partie dont tous les joueurs sont des IA
- **THEN** la partie se déroule seule jusqu'à la victoire et l'utilisateur peut la regarder

#### Scenario: Niveau inconnu refusé

- **WHEN** on crée une partie avec un joueur IA de niveau « expert »
- **THEN** la création est refusée avec une erreur de réglage

### Requirement: Noms des IA

Chaque IA SHALL recevoir un pseudonyme tiré au hasard dans une liste prédéfinie d'une vingtaine de
pseudonymes de hackers inventés. Deux joueurs d'une même partie SHALL NOT porter le même nom. Un
joueur humain SHALL garder un nom numéroté (« Joueur 2 »), et le nom de chaque joueur SHALL rester
modifiable.

#### Scenario: Noms distincts

- **WHEN** l'écran de création s'ouvre, puis l'utilisateur ajoute trois joueurs IA
- **THEN** chaque IA porte un pseudonyme de la liste et aucun nom n'est porté par deux joueurs

#### Scenario: Retour à un humain

- **WHEN** l'utilisateur transforme en humain l'IA du joueur 2
- **THEN** ce joueur s'appelle « Joueur 2 »

### Requirement: Joueur qui doit agir

Le moteur SHALL exposer une requête indiquant le joueur qui doit agir : le joueur courant en phases
avant le lancer, décision d'achat et après le lancer ; l'enchérisseur attendu pendant une enchère ;
le débiteur pendant un règlement de dette ; le destinataire pendant une offre d'échange ; aucun
joueur quand la partie est finie.

#### Scenario: Enchérisseur attendu

- **WHEN** la partie est en enchère et c'est au joueur 3 de miser alors que c'est le tour du joueur 1
- **THEN** la requête désigne le joueur 3

#### Scenario: Débiteur hors de son tour

- **WHEN** le joueur 1 tire « Serveur de jeu partagé » et que le joueur 2 n'a pas assez d'argent pour lui verser 10 Ᵽ
- **THEN** la requête désigne le joueur 2

#### Scenario: Destinataire d'une offre d'échange

- **WHEN** le joueur 1 propose un échange au joueur 2 pendant son tour
- **THEN** la requête désigne le joueur 2 jusqu'à sa réponse

### Requirement: Décisions automatiques

Quand le joueur qui doit agir est une IA, son action SHALL être choisie et soumise automatiquement
par le même point d'entrée que les actions humaines, une par une, jusqu'à ce qu'un humain doive agir
ou que la partie soit finie. Cela SHALL s'appliquer à son tour complet (gestion, lancer, sortie de
quarantaine, achat, fin de tour), à ses mises dans une enchère et au règlement de ses dettes, même
hors de son tour. Aucune commande de jeu ne SHALL être proposée à l'humain pendant qu'une IA agit.

#### Scenario: Enchaînement d'un tour

- **WHEN** le tour passe à une IA
- **THEN** elle lance les dés, résout son arrivée, gère ses propriétés, puis termine son tour sans action de l'humain

#### Scenario: Enchère après un refus humain

- **WHEN** un humain refuse d'acheter une case et que les enchères sont activées
- **THEN** chaque IA en lice mise ou passe à son tour, et les commandes d'enchère ne sont proposées à l'humain que lorsque c'est à lui de miser

#### Scenario: Commandes masquées

- **WHEN** une IA agit
- **THEN** le HUD indique « <nom> réfléchit… » et ne propose aucune commande de jeu

### Requirement: Rythme lisible

Les actions d'une IA SHALL être espacées selon la vitesse d'animation choisie, et chaque action SHALL
attendre la fin de la présentation des événements de l'action précédente (déplacement du pion,
carte, paiement). En vitesse instantanée, les actions d'une IA SHALL s'enchaîner sans pause. Une
carte piochée par une IA SHALL se fermer seule après un délai qui dépend de la vitesse, alors que
celle d'un humain attend son toucher.

#### Scenario: Déplacement visible

- **WHEN** une IA lance les dés en vitesse normale
- **THEN** son action suivante n'est soumise qu'après l'animation de son pion jusqu'à la case d'arrivée

#### Scenario: Carte d'une IA

- **WHEN** une IA pioche une carte en vitesse normale
- **THEN** la carte s'affiche puis se ferme seule après le délai de la vitesse, sans toucher

### Requirement: Calcul hors du fil principal

Dans l'application, les décisions d'une IA SHALL être calculées dans un Web Worker. Une réponse
arrivée après que la partie a été quittée ou que l'état a changé SHALL être ignorée.

#### Scenario: Partie quittée pendant un calcul

- **WHEN** l'utilisateur quitte la partie pendant qu'une IA réfléchit
- **THEN** l'action calculée n'est pas soumise et aucun délai ne reste en attente

### Requirement: Information visible uniquement

Les décisions d'une IA SHALL dépendre uniquement de l'information publique (argent, positions,
propriétaires, constructions, mises en veille, Clés détenues, taille des paquets, réglages, phase) et
de son propre niveau. L'ordre des paquets Exploit et Patch et l'état du générateur aléatoire de la
partie SHALL NOT influencer ses décisions, et l'IA SHALL NOT consommer le générateur de la partie.

#### Scenario: Paquets dans un ordre différent

- **WHEN** on présente à une IA deux états identiques sauf l'ordre des cartes du paquet Exploit
- **THEN** l'IA choisit la même action dans les deux cas

#### Scenario: Générateur intact

- **WHEN** une IA choisit une action
- **THEN** l'état du générateur de la partie est inchangé avant la soumission de l'action

### Requirement: Décision déterministe

Pour une même vue, un même joueur et un même niveau, l'IA SHALL choisir la même action.

#### Scenario: Même vue

- **WHEN** on demande deux fois une décision à une IA normale sur la même vue
- **THEN** les deux actions sont identiques

### Requirement: Légalité et terminaison

Toute action choisie par une IA SHALL être acceptée par le moteur. Une IA SHALL toujours finir par
lancer les dés ou terminer son tour : au plus 40 actions de gestion (construction, revente, mise en
veille, réactivation) par phase.

#### Scenario: Robustesse

- **WHEN** on joue 100 parties entre IA, de 2 à 6 joueurs, niveaux, graines et réglage d'enchères variés
- **THEN** aucune action d'IA n'est rejetée et deux exécutions d'une même graine produisent la même partie
