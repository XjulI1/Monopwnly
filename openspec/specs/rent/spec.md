# rent Specification

## Purpose
Calculer et faire payer le loyer dû en s'arrêtant sur une case possédée par un adversaire :
systèmes, nœuds et services.

## Requirements

### Requirement: Loyer d'un système

Le loyer d'un système actif SHALL valoir : le loyer de base si son propriétaire ne possède pas toute
la famille ; le double du loyer de base si le propriétaire possède toute la famille et que le
système n'a pas de construction, même si un autre système de la famille est en veille ; le loyer du
niveau correspondant s'il porte des backdoors ou un rootkit.

#### Scenario: Loyer de base

- **WHEN** un joueur s'arrête sur le Forum d'un adversaire qui ne possède pas le Blog
- **THEN** il paie 14 Ᵽ à cet adversaire

#### Scenario: Famille complète

- **WHEN** l'adversaire possède Forum, Blog et Boutique en ligne sans construction et le joueur s'arrête sur le Forum
- **THEN** il paie 28 Ᵽ

#### Scenario: Famille complète avec un système en veille

- **WHEN** l'adversaire possède les trois systèmes Web, le Blog étant en veille, et le joueur s'arrête sur le Forum
- **THEN** il paie 28 Ᵽ

#### Scenario: Backdoors

- **WHEN** le joueur s'arrête sur la Boutique en ligne portant 3 backdoors
- **THEN** il paie 610 Ᵽ

#### Scenario: Rootkit

- **WHEN** le joueur s'arrête sur le Noyau de l'IA portant un rootkit
- **THEN** il paie 4 215 Ᵽ

### Requirement: Loyer d'un nœud

Le loyer d'un nœud actif SHALL dépendre du nombre de nœuds possédés par son propriétaire, en veille
compris : 25, 50, 100 ou 200 Ᵽ pour 1, 2, 3 ou 4 nœuds.

#### Scenario: Trois nœuds

- **WHEN** un joueur s'arrête sur le Nœud Tor d'un adversaire qui possède 3 nœuds
- **THEN** il paie 100 Ᵽ

### Requirement: Loyer d'un service

Le loyer d'un service actif SHALL valoir 4 fois le total des dés du lancer qui y a mené si son
propriétaire possède un seul service, 10 fois s'il possède les deux.

#### Scenario: Un service

- **WHEN** un joueur arrive sur le Datacenter d'un adversaire avec un lancer de 3 et 5, l'adversaire ne possédant pas le Cloud
- **THEN** il paie 32 Ᵽ

#### Scenario: Deux services

- **WHEN** un joueur arrive sur le Cloud avec un lancer de 6 et 4, le propriétaire possédant aussi le Datacenter
- **THEN** il paie 100 Ᵽ

### Requirement: Absence de loyer

Aucun loyer SHALL NOT être dû sur une case en veille, sur sa propre case ou sur une case à la banque.

#### Scenario: Sa propre case

- **WHEN** un joueur s'arrête sur son propre système
- **THEN** son argent ne change pas et aucun événement `paid` n'est émis

### Requirement: Paiement du loyer

Le loyer SHALL être versé au propriétaire par le mécanisme de paiement commun : immédiatement si
l'argent suffit, en règlement de dette sinon.

#### Scenario: Loyer non couvert

- **WHEN** un joueur avec 100 Ᵽ doit 610 Ᵽ de loyer
- **THEN** la partie passe en `debt` avec un paiement de 610 Ᵽ envers le propriétaire
