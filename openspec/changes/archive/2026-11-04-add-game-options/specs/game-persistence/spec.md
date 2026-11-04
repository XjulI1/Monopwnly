# Spec Delta

## ADDED Requirements

### Requirement: Migration des formats antérieurs

Une sauvegarde d'une version de format antérieure à celle de l'application SHALL être migrée au
chargement vers la version courante, les champs ajoutés depuis recevant une valeur qui ne change
rien au déroulement de la partie, puis SHALL être reprise comme une sauvegarde de la version
courante. Au passage au format des options de partie : les quatre règles optionnelles sont
désactivées, la limite de tours et l'objectif de patrimoine sont absents, la cagnotte vaut 0, et une
partie terminée reçoit le motif de victoire `lastStanding`.

#### Scenario: Partie en cours d'avant les options

- **WHEN** le stockage contient la sauvegarde d'une partie en cours au format précédant les options de partie
- **THEN** l'accueil propose « Reprendre la partie » et la partie reprend sans option active, avec une cagnotte à 0

#### Scenario: Partie d'avant les échanges

- **WHEN** le stockage contient la sauvegarde d'une partie en cours au format précédant les échanges
- **THEN** elle est migrée jusqu'au format courant et l'accueil propose « Reprendre la partie »

#### Scenario: Partie terminée d'avant les options

- **WHEN** le stockage contient la sauvegarde d'une partie terminée au format précédant les options de partie
- **THEN** elle est chargée avec le motif de victoire `lastStanding`
