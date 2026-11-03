# debt-interface Specification

## Purpose
Guider un joueur qui doit plus qu'il n'a : lui montrer ce qu'il doit et à qui, l'aider à réunir la
somme en revendant et en mettant en veille, puis le laisser payer ou déclarer faillite.

## Requirements

### Requirement: Panneau de dette

En phase de règlement de dette, le HUD SHALL afficher le débiteur, le montant du paiement en cours et
son créancier (un joueur ou la banque), les paiements restants s'il y en a plusieurs, son argent
actuel et la somme qu'il pourrait encore réunir en revendant toutes ses constructions et en mettant
en veille tous ses systèmes.

#### Scenario: Loyer impayable

- **WHEN** Bob doit 600 Ᵽ de loyer à Alice avec 200 Ᵽ en poche
- **THEN** le panneau affiche « Bob doit 600 Ᵽ à Alice », son argent de 200 Ᵽ et la somme encore réunissable

#### Scenario: Paiements multiples

- **WHEN** Bob doit payer 50 Ᵽ à chacun de 3 autres joueurs et ne peut en payer qu'un
- **THEN** le panneau affiche le paiement en cours et les 2 paiements restants

### Requirement: Réunir la somme

Le panneau SHALL ouvrir directement le mode gestion du débiteur, limité à la revente de constructions
et à la mise en veille. L'argent affiché SHALL se mettre à jour après chaque revente ou mise en veille.

#### Scenario: Revente pendant la dette

- **WHEN** Bob revend une backdoor de 100 Ᵽ pendant le règlement
- **THEN** son argent affiché augmente de 50 Ᵽ

#### Scenario: Pas de construction pendant la dette

- **WHEN** Bob ouvre la fiche d'un de ses systèmes pendant le règlement
- **THEN** seuls « Revendre » et « Mettre en veille » sont proposés

### Requirement: Payer

Le bouton « Payer » (`payDebt`) SHALL être actif dès que l'argent du débiteur couvre le paiement en
cours. Après paiement, s'il reste des paiements non couverts, le panneau SHALL rester ouvert sur le
suivant ; sinon la partie reprend.

#### Scenario: Somme réunie

- **WHEN** l'argent de Bob atteint le montant dû
- **THEN** le bouton « Payer » devient actif

#### Scenario: Paiement

- **WHEN** Bob touche « Payer » avec assez d'argent pour tous les paiements restants
- **THEN** l'action `payDebt` est transmise et la partie reprend là où elle s'était arrêtée

### Requirement: Déclarer faillite

Le bouton « Déclarer faillite » (`declareBankruptcy`) SHALL demander une confirmation qui rappelle à
qui iront les biens du joueur. Quand la somme réunissable ne suffit pas à couvrir le paiement en
cours, le panneau SHALL l'indiquer, en précisant « sans échange » quand le débiteur peut encore
proposer un échange.

#### Scenario: Faillite inévitable

- **WHEN** l'argent de Bob plus la somme réunissable est inférieur au paiement en cours
- **THEN** le panneau indique que la faillite est inévitable

#### Scenario: Confirmation

- **WHEN** Bob touche « Déclarer faillite » puis confirme
- **THEN** l'action `declareBankruptcy` est transmise, Bob apparaît barré et ses systèmes passent à son créancier sur le plateau

#### Scenario: Annulation

- **WHEN** Bob touche « Déclarer faillite » puis annule
- **THEN** le règlement de dette continue sans changement

#### Scenario: Échange encore possible

- **WHEN** la somme réunissable de Bob ne couvre pas le paiement et qu'il peut encore proposer un échange
- **THEN** le panneau indique « sans échange, la faillite est inévitable » et propose le bouton « Échanger »
