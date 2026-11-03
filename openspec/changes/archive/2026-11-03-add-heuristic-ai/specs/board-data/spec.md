# Spec Delta

## MODIFIED Requirements

### Requirement: Prix et loyers des systèmes

Chaque système SHALL porter un prix et six niveaux de loyer (base, puis 1, 2, 3, 4 backdoors et
rootkit) conformes à `docs/plateau.md`. Le loyer d'une famille complète sans construction SHALL
valoir le double du loyer de base. La valeur de mise en veille SHALL valoir la moitié du prix.

#### Scenario: Lignes de référence

- **WHEN** on lit le Minitel (case 1)
- **THEN** son prix est 60 et ses loyers sont 4, 20, 55, 150, 200 et 250
- **AND** quand on lit le Noyau de l'IA (case 39), son prix est 400 et ses loyers sont 68, 340, 950, 2585, 3400 et 4215
- **AND** quand on lit la Boutique en ligne (case 19), son prix est 200 et ses loyers sont 16, 80, 225, 610, 800 et 990

#### Scenario: Loyers strictement croissants

- **WHEN** on parcourt les six niveaux de loyer de chaque système
- **THEN** chaque niveau est strictement supérieur au précédent

#### Scenario: Valeur de mise en veille

- **WHEN** on lit la valeur de mise en veille de chaque case achetable
- **THEN** elle vaut la moitié de son prix (30 pour le Minitel, 100 pour un nœud, 75 pour un service)
