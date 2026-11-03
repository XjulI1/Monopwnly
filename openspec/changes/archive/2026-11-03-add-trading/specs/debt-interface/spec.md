# Spec Delta

## MODIFIED Requirements

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
