# Spec Delta

## MODIFIED Requirements

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
