# game-persistence Specification

## Purpose
Ne jamais perdre une partie en cours : la sauvegarder automatiquement dans le navigateur et
permettre de la reprendre exactement où elle s'était arrêtée.

## Requirements

### Requirement: Sauvegarde automatique

L'application SHALL enregistrer, après chaque action acceptée par le moteur, qu'elle vienne d'un
humain ou d'une IA, dans le stockage local du navigateur une sauvegarde unique contenant une version
de format, la date, la configuration de création, l'état du moteur, le journal et les statistiques.
Les actions d'une même rafale d'IA sans animation intermédiaire MAY être regroupées en une seule
écriture à la fin de la rafale.

#### Scenario: Sauvegarde après un achat

- **WHEN** le joueur achète le Forum
- **THEN** la sauvegarde contient l'état du moteur où le Forum lui appartient

#### Scenario: Sauvegarde pendant le tour d'une IA

- **WHEN** une IA construit une backdoor
- **THEN** la sauvegarde est mise à jour avec cette backdoor au plus tard à la fin de la rafale d'actions de l'IA

### Requirement: Reprise

Quand une sauvegarde d'une partie non terminée existe, l'accueil SHALL proposer « Reprendre la
partie » avec un résumé (joueurs, numéro de tour, date de dernière sauvegarde). La reprise SHALL
restaurer l'état du moteur, le journal et les statistiques, sans rejouer d'animation, puis
poursuivre la partie dans la phase où elle s'était arrêtée : si le joueur attendu est une IA, elle
reprend la main.

#### Scenario: Reprise après rechargement

- **WHEN** l'utilisateur recharge la page en pleine partie puis choisit « Reprendre la partie »
- **THEN** le plateau, l'argent des joueurs, les constructions, le HUD, le journal et le joueur courant sont ceux d'avant le rechargement

#### Scenario: Reprise pendant une décision d'achat

- **WHEN** la page est rechargée alors que le joueur devait décider d'acheter la Caméra IP
- **THEN** à la reprise la décision d'achat de la Caméra IP est de nouveau proposée

#### Scenario: Reprise pendant une enchère

- **WHEN** la page est rechargée pendant une enchère sur le Nœud Tor dont la mise la plus haute est 120 Ᵽ
- **THEN** à la reprise l'enchère est de nouveau affichée avec la mise de 120 Ᵽ et le prochain enchérisseur attendu

#### Scenario: Reprise pendant un règlement de dette

- **WHEN** la page est rechargée alors qu'un joueur humain doit réunir 400 Ᵽ pour régler un loyer
- **THEN** à la reprise l'écran de règlement de dette est de nouveau proposé avec le même montant

#### Scenario: Reprise au tour d'une IA

- **WHEN** l'utilisateur reprend une partie sauvegardée au tour d'une IA
- **THEN** l'IA poursuit son tour automatiquement

#### Scenario: Pas de sauvegarde

- **WHEN** aucune sauvegarde n'existe
- **THEN** l'accueil ne propose pas « Reprendre la partie »

### Requirement: Quitter et remplacer

« Quitter la partie » SHALL revenir à l'accueil sans demander de confirmation et en conservant la
sauvegarde. Créer une nouvelle partie alors qu'une sauvegarde non terminée existe SHALL demander
confirmation avant de la remplacer.

#### Scenario: Quitter conserve la partie

- **WHEN** l'utilisateur choisit « Quitter la partie »
- **THEN** l'accueil s'affiche aussitôt, sans confirmation, et propose « Reprendre la partie »

#### Scenario: Remplacement confirmé

- **WHEN** une sauvegarde existe et que l'utilisateur lance une nouvelle partie puis confirme le remplacement
- **THEN** la nouvelle partie démarre et remplace la sauvegarde

#### Scenario: Remplacement annulé

- **WHEN** une sauvegarde existe et que l'utilisateur annule le remplacement
- **THEN** il revient à l'accueil et la sauvegarde est intacte

### Requirement: Partie terminée

Une partie terminée SHALL rester sauvegardée tant que l'écran de fin est affiché, pour survivre à un
rechargement, et SHALL être supprimée dès que l'utilisateur quitte l'écran de fin.

#### Scenario: Rechargement sur l'écran de fin

- **WHEN** l'utilisateur recharge la page sur l'écran de fin
- **THEN** l'accueil propose « Voir la dernière partie » qui rouvre l'écran de fin et ses statistiques

#### Scenario: Sortie de l'écran de fin

- **WHEN** l'utilisateur choisit « Retour à l'accueil » sur l'écran de fin
- **THEN** la sauvegarde est supprimée et l'accueil ne propose plus de reprise

### Requirement: Sauvegarde illisible ou incompatible

Une sauvegarde illisible, incomplète, incohérente ou d'une version de format inconnue SHALL être
supprimée, et l'accueil SHALL afficher une fois le message « La sauvegarde précédente n'a pas pu
être chargée ».

#### Scenario: Données corrompues

- **WHEN** le stockage contient une sauvegarde qui n'est pas du JSON valide
- **THEN** l'accueil affiche le message, ne propose pas de reprise, et la sauvegarde est supprimée

#### Scenario: Version inconnue

- **WHEN** la sauvegarde porte une version de format supérieure à celle que l'application connaît
- **THEN** elle est traitée comme illisible

#### Scenario: État incohérent

- **WHEN** la sauvegarde attribue un propriétaire à la case Patch numéro 8, qui n'est pas achetable
- **THEN** elle est traitée comme illisible

### Requirement: Stockage indisponible

Si le stockage est plein ou indisponible (navigation privée, données de site bloquées), le jeu SHALL
continuer normalement et SHALL afficher une seule fois par partie l'avertissement « La partie ne peut
pas être sauvegardée sur cet appareil ».

#### Scenario: Stockage plein

- **WHEN** l'écriture de la sauvegarde échoue faute de place
- **THEN** l'avertissement s'affiche une fois et la partie continue

#### Scenario: Stockage inaccessible

- **WHEN** l'accès au stockage local lève une exception dès le lancement
- **THEN** l'accueil s'affiche sans « Reprendre la partie » et une partie peut être créée et jouée

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
