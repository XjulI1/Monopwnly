# auction-interface Specification

## Purpose
Permettre au joueur qui s'arrête sur une case libre de l'acheter ou de la refuser, puis, si les
enchères sont activées, de faire enchérir les joueurs à tour de rôle sur le même écran.

## Requirements

### Requirement: Décision d'achat

En phase de décision d'achat, le HUD SHALL afficher la fiche de la case avec son prix, l'argent du
joueur, un bouton « Acheter » (`buyProperty`) et un bouton de refus (`declineProperty`) intitulé
« Mettre aux enchères » quand les enchères sont activées et « Ne pas acheter » sinon. Le bouton
« Acheter » SHALL être désactivé si le joueur n'a pas assez d'argent.

#### Scenario: Achat

- **WHEN** le joueur s'arrête sur la Caméra IP libre avec 500 Ᵽ et touche « Acheter »
- **THEN** l'action `buyProperty` est transmise, la Caméra IP prend sa couleur et son argent passe à 380 Ᵽ

#### Scenario: Argent insuffisant

- **WHEN** le joueur s'arrête sur le Noyau de l'IA avec 300 Ᵽ
- **THEN** le bouton « Acheter » est désactivé et le refus reste possible

#### Scenario: Refus sans enchères

- **WHEN** les enchères sont désactivées
- **THEN** le bouton de refus s'intitule « Ne pas acheter »

### Requirement: Panneau d'enchère

En phase d'enchère, le HUD SHALL afficher la case mise aux enchères, la meilleure mise et son auteur,
la liste des joueurs encore en lice et le joueur dont c'est le tour de miser, sous la forme « À
<nom> d'enchérir ». Les joueurs qui ont passé SHALL apparaître retirés de la liste.

#### Scenario: Début de l'enchère

- **WHEN** Alice refuse d'acheter le Forum dans une partie à 3 joueurs avec enchères
- **THEN** le panneau d'enchère affiche le Forum, aucune mise, les 3 joueurs en lice et « À Alice d'enchérir »

#### Scenario: Joueur retiré

- **WHEN** Bob passe
- **THEN** Bob apparaît retiré de la liste des joueurs en lice

### Requirement: Miser ou passer

Le joueur attendu SHALL pouvoir saisir une mise, ajuster par des raccourcis « +10 », « +50 » et
« +100 » à partir de la meilleure mise, puis valider (`placeBid`), ou passer (`passBid`). La mise
proposée par défaut SHALL être la mise minimale autorisée par le moteur. La validation SHALL être
désactivée pour une mise inférieure au minimum ou supérieure à l'argent du joueur.

#### Scenario: Mise par défaut

- **WHEN** la meilleure mise est de 120 Ᵽ
- **THEN** la mise proposée est la mise minimale autorisée au-dessus de 120 Ᵽ

#### Scenario: Raccourci

- **WHEN** la meilleure mise est de 120 Ᵽ et que le joueur touche « +50 »
- **THEN** la mise saisie devient 170 Ᵽ

#### Scenario: Mise trop élevée

- **WHEN** le joueur saisit une mise supérieure à son argent
- **THEN** le bouton de validation est désactivé

### Requirement: Fin de l'enchère

À la fin de l'enchère, le HUD SHALL annoncer le résultat : « <nom> remporte <case> pour <montant> »,
ou « Personne n'a enchéri : <case> reste à la banque ». Le plateau SHALL afficher le nouveau
propriétaire.

#### Scenario: Enchère remportée

- **WHEN** Carol remporte le Forum pour 150 Ᵽ
- **THEN** le HUD annonce « Carol remporte Forum pour 150 Ᵽ » et le Forum prend la couleur de Carol

#### Scenario: Enchère sans mise

- **WHEN** tous les joueurs passent sans miser
- **THEN** le HUD annonce que la case reste à la banque
