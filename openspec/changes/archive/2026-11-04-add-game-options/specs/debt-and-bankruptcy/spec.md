# Spec Delta

## MODIFIED Requirements

### Requirement: Victoire

Quand il ne reste qu'un joueur non en faillite, il SHALL être déclaré vainqueur aussitôt, quels que
soient les réglages de fin de partie : `winner` est renseigné, `winReason` vaut `lastStanding`, la
partie passe en `gameOver` et un événement de victoire portant ce motif est émis. Les fins par
limite de tours et par objectif de patrimoine sont décrites par `game-end-conditions`.

#### Scenario: Dernier joueur solvable

- **WHEN** à 2 joueurs l'un déclare faillite
- **THEN** l'autre est vainqueur avec le motif `lastStanding` et la partie est en `gameOver`
