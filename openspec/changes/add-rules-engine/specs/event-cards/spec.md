# Spec Delta

## Purpose

Piocher et appliquer les cartes Exploit et Patch, et gérer la Clé de déchiffrement conservée par
le joueur.

## ADDED Requirements

### Requirement: Pioche

S'arrêter sur une case Exploit ou Patch SHALL faire piocher la première carte du paquet
correspondant, émettre un événement avec son identifiant puis appliquer son effet. Une carte jouée
SHALL retourner sous son paquet ; une Clé de déchiffrement SHALL être conservée par le joueur et
quitter le paquet.

#### Scenario: Carte remise sous le paquet

- **WHEN** un joueur pioche la carte « Bug bounty » en tête du paquet Exploit
- **THEN** il reçoit 150 Ᵽ et la carte est la dernière du paquet Exploit

#### Scenario: Clé conservée

- **WHEN** un joueur pioche la Clé de déchiffrement du paquet Patch
- **THEN** il la détient et le paquet Patch compte 15 cartes

### Requirement: Cartes d'argent

Les cartes de gain SHALL créditer le joueur du montant indiqué par la banque. Les cartes de
paiement SHALL le débiter au profit de la banque par le mécanisme de paiement commun.

#### Scenario: Gain

- **WHEN** un joueur avec 500 Ᵽ pioche « Divulgation responsable »
- **THEN** il a 700 Ᵽ

#### Scenario: Paiement

- **WHEN** un joueur avec 500 Ᵽ pioche « Facture du fournisseur cloud »
- **THEN** il a 400 Ᵽ

### Requirement: Cartes de paiement par construction

« Mise à jour forcée » SHALL coûter 25 Ᵽ par backdoor et 100 Ᵽ par rootkit ; « Audit de sécurité »
40 Ᵽ par backdoor et 115 Ᵽ par rootkit, sur tous les systèmes du joueur.

#### Scenario: Audit

- **WHEN** un joueur qui possède 5 backdoors et 1 rootkit pioche « Audit de sécurité »
- **THEN** il paie 315 Ᵽ à la banque

### Requirement: Cartes entre joueurs

« Conférence de sécurité » SHALL faire payer 50 Ᵽ au joueur envers chaque autre joueur non en
faillite, dans l'ordre de jeu. « Serveur de jeu partagé » SHALL faire payer 10 Ᵽ à chaque autre
joueur envers lui, chaque payeur passant au besoin en règlement de dette.

#### Scenario: Conférence à 4 joueurs

- **WHEN** à 4 joueurs un joueur avec 500 Ᵽ pioche « Conférence de sécurité »
- **THEN** il a 350 Ᵽ et chacun des trois autres a reçu 50 Ᵽ

#### Scenario: Conférence non couverte

- **WHEN** à 4 joueurs un joueur avec 120 Ᵽ pioche « Conférence de sécurité »
- **THEN** il paie les deux premiers créanciers, puis la partie passe en `debt` avec un paiement restant de 50 Ᵽ envers le troisième

### Requirement: Cartes de déplacement

Les cartes de déplacement vers une case SHALL faire avancer le joueur jusqu'à cette case, avec
salaire s'il passe par Boot, puis résoudre l'arrivée. « Rollback » SHALL faire reculer de 3 cases et
« Cache vidé » reculer jusqu'au Minitel, sans salaire. Les cartes d'envoi en quarantaine SHALL suivre
la spec `quarantine`.

#### Scenario: Avance avec passage par Boot

- **WHEN** un joueur en case 27 avec 300 Ᵽ pioche « Pivot latéral »
- **THEN** il arrive en case 19 avec 500 Ᵽ avant la résolution de la Boutique en ligne

#### Scenario: Rollback sur une carte

- **WHEN** un joueur en case 2 pioche « Rollback »
- **THEN** il arrive en case 39 sans salaire et l'arrivée sur le Noyau de l'IA est résolue

#### Scenario: Cache vidé

- **WHEN** un joueur en case 22 pioche « Cache vidé »
- **THEN** il est en case 1 sans avoir reçu de salaire

### Requirement: Tunnel chiffré et Ping

« Tunnel chiffré » SHALL faire avancer jusqu'au prochain nœud ; s'il appartient à un adversaire et
est actif, le loyer dû SHALL être doublé ; s'il est libre, la décision d'achat s'applique. « Ping »
SHALL faire avancer jusqu'au prochain service ; s'il appartient à un adversaire et est actif, le
joueur SHALL lancer les dés et payer 10 fois le total, quel que soit le nombre de services possédés.

#### Scenario: Tunnel vers un nœud possédé

- **WHEN** un joueur en case 7 pioche « Tunnel chiffré » et que le Nœud Tor appartient à un adversaire possédant 2 nœuds
- **THEN** il arrive en case 18 et paie 100 Ᵽ

#### Scenario: Tunnel en fin de plateau

- **WHEN** un joueur en case 35 pioche « Tunnel chiffré »
- **THEN** il arrive en case 36

#### Scenario: Ping vers un service possédé

- **WHEN** un joueur en case 27 pioche « Ping », le Cloud appartenant à un adversaire, et que les dés donnent 2 et 3
- **THEN** il arrive en case 33 et paie 50 Ᵽ

#### Scenario: Ping vers un service libre

- **WHEN** un joueur en case 2 pioche « Ping » et que le Datacenter est libre
- **THEN** il arrive en case 13 et la partie est en `buyDecision` sur le Datacenter
