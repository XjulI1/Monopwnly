# trade-interface Specification

## Purpose
Permettre à un joueur humain de composer et d'envoyer une offre d'échange, et de recevoir, comprendre
et trancher une offre venue d'un humain sur le même écran ou d'une IA, à la souris comme au tactile.

## Requirements

### Requirement: Accès aux échanges

Le HUD SHALL proposer un bouton « Échanger » quand le joueur qui agit est humain et que la phase
permet de proposer un échange (avant le lancer, après le lancer, règlement de dette). Le bouton SHALL
indiquer le nombre de propositions restantes dans le tour et SHALL être désactivé quand la limite
est atteinte ou qu'aucun autre joueur n'est en lice.

#### Scenario: Bouton avant le lancer

- **WHEN** c'est au tour d'un humain, en phase avant le lancer
- **THEN** le bouton « Échanger » est actif et indique 3 propositions restantes

#### Scenario: Limite atteinte

- **WHEN** l'humain a fait trois propositions dans son tour
- **THEN** le bouton « Échanger » est désactivé

#### Scenario: Pas d'échange pendant une enchère

- **WHEN** la partie est en enchère
- **THEN** le bouton « Échanger » n'est pas proposé

### Requirement: Composition d'une offre

Le panneau de composition SHALL permettre de choisir le partenaire, puis de sélectionner dans deux
colonnes « Vous donnez » et « Vous demandez » les cases, un montant de PwnCoins et les Clés de
chaque côté. Les cases non échangeables SHALL apparaître grisées avec la raison (« famille
construite »). Le montant SHALL se régler par pas de 10 Ᵽ, plafonné à l'argent du côté qui paie. Le
bouton « Proposer » SHALL n'être actif que si le moteur juge l'offre valide. Les cases sélectionnées
SHALL être mises en avant sur le plateau. Le panneau SHALL pouvoir être fermé sans rien proposer.

#### Scenario: Case grisée

- **WHEN** l'humain ouvre le panneau alors qu'il a une backdoor sur Forum
- **THEN** Forum et Blog sont grisés avec la mention « famille construite »

#### Scenario: Montant plafonné

- **WHEN** l'humain a 120 Ᵽ et augmente le montant donné
- **THEN** le montant s'arrête à 120 Ᵽ

#### Scenario: Offre vide

- **WHEN** aucun élément n'est sélectionné
- **THEN** le bouton « Proposer » est inactif

#### Scenario: Envoi

- **WHEN** l'humain propose Forum contre 150 Ᵽ au joueur 2
- **THEN** le panneau se ferme et la partie passe en offre d'échange adressée au joueur 2

### Requirement: Réception d'une offre

Quand le destinataire d'une offre est humain, une fenêtre SHALL s'ouvrir avec le titre « <auteur>
vous propose un échange », le nom du destinataire, un résumé en deux colonnes « Vous recevez » et
« Vous donnez » (cases avec leur famille et leur état de veille, PwnCoins, Clés), la mise en avant
des cases sur le plateau, et les boutons « Accepter » et « Refuser ». Aucune autre commande de jeu ne
SHALL être proposée tant que l'offre n'est pas tranchée. La fenêtre SHALL être la même que l'offre
vienne d'un humain ou d'une IA.

#### Scenario: Offre d'une IA

- **WHEN** une IA propose Satellite contre 400 Ᵽ à l'humain
- **THEN** la fenêtre affiche « <nom de l'IA> vous propose un échange », Satellite dans « Vous donnez » et 400 Ᵽ dans « Vous recevez »

#### Scenario: Offre entre deux humains

- **WHEN** le joueur 1 humain propose un échange au joueur 2 humain
- **THEN** la fenêtre s'adresse au joueur 2 par son nom, sans écran de passage de main

#### Scenario: Case en veille signalée

- **WHEN** l'offre contient une case en veille
- **THEN** la case porte la mention « en veille » dans le résumé

### Requirement: Réponse d'une IA à une offre humaine

Quand un humain propose un échange à une IA, le HUD SHALL afficher « <nom> étudie votre offre… »
pendant la réflexion, puis un message indiquant si l'offre est acceptée ou refusée, et le plateau
SHALL animer le changement de propriétaire des cases transférées.

#### Scenario: Offre refusée par une IA

- **WHEN** l'IA refuse l'offre de l'humain
- **THEN** le message « <nom> refuse votre offre » s'affiche et l'humain retrouve ses commandes dans la phase d'origine
