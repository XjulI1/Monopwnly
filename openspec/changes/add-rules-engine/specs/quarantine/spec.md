# Spec Delta

## Purpose

Mettre un joueur en quarantaine et lui permettre d'en sortir en payant, en utilisant une Clé de
déchiffrement ou en tentant un double.

## ADDED Requirements

### Requirement: Entrée en quarantaine

Un joueur SHALL entrer en quarantaine en s'arrêtant sur Détecté !, en tirant une carte « Repéré par
l'antivirus » ou « Alerte du SOC », ou au troisième double d'affilée. Il SHALL être placé en
case 10 avec `quarantine.failedAttempts` à 0, sans salaire, et son double en cours SHALL NOT lui
permettre de relancer.

#### Scenario: Entrée par carte après un double

- **WHEN** un joueur ayant fait un double tire « Alerte du SOC »
- **THEN** il est en case 10 en quarantaine et la partie est en `postRoll` avec `mayRollAgain` à faux

### Requirement: Payer pour sortir

En `preRoll`, un joueur en quarantaine SHALL pouvoir payer 50 Ᵽ à la banque
(`payQuarantineFine`) pour sortir, puis lancer normalement. L'action SHALL être refusée avec
`INSUFFICIENT_FUNDS` s'il a moins de 50 Ᵽ.

#### Scenario: Amende payée

- **WHEN** un joueur en quarantaine avec 300 Ᵽ envoie `payQuarantineFine`
- **THEN** il a 250 Ᵽ, n'est plus en quarantaine et reste en `preRoll`

### Requirement: Clé de déchiffrement

En `preRoll`, un joueur en quarantaine qui détient une Clé de déchiffrement SHALL pouvoir l'utiliser
(`useDecryptionKey`) pour sortir sans payer. La clé SHALL retourner sous le paquet dont elle
provient. Sans clé, l'action SHALL être refusée avec `NO_KEY`.

#### Scenario: Clé utilisée

- **WHEN** un joueur en quarantaine détenant la clé Exploit envoie `useDecryptionKey`
- **THEN** il n'est plus en quarantaine, ne détient plus de clé
- **AND** la clé est la dernière carte du paquet Exploit

#### Scenario: Pas de clé

- **WHEN** un joueur en quarantaine sans clé envoie `useDecryptionKey`
- **THEN** l'action est rejetée avec le code `NO_KEY`

### Requirement: Tenter un double

Un joueur en quarantaine qui envoie `rollDice` SHALL tenter un double. Un double SHALL le libérer et
le faire avancer du total sans relancer. Un échec SHALL incrémenter `failedAttempts` et terminer son
déplacement (phase `postRoll`). Au troisième échec, il SHALL payer 50 Ᵽ puis avancer du total du
lancer ; s'il ne peut pas payer, la partie SHALL passer en règlement de dette avant le déplacement.

#### Scenario: Double réussi

- **WHEN** un joueur en quarantaine lance 4 et 4
- **THEN** il sort, avance en case 18 et la partie est en `postRoll` avec `mayRollAgain` à faux

#### Scenario: Échec

- **WHEN** un joueur en quarantaine sans échec préalable lance 2 et 5
- **THEN** il reste en case 10 avec `failedAttempts` à 1 et la partie est en `postRoll`

#### Scenario: Troisième échec

- **WHEN** un joueur en quarantaine avec 2 échecs et 400 Ᵽ lance 1 et 3
- **THEN** il paie 50 Ᵽ, sort de quarantaine et arrive en case 14

#### Scenario: Troisième échec sans argent

- **WHEN** un joueur en quarantaine avec 2 échecs et 20 Ᵽ lance 1 et 3
- **THEN** la partie passe en `debt` pour 50 Ᵽ envers la banque
- **AND** une fois la dette payée, il avance en case 14

### Requirement: Droits en quarantaine

Un joueur en quarantaine SHALL continuer à percevoir ses loyers, construire, revendre et mettre en
veille pendant son tour.

#### Scenario: Loyer perçu en quarantaine

- **WHEN** un adversaire s'arrête sur un système d'un joueur en quarantaine
- **THEN** le loyer est payé normalement
