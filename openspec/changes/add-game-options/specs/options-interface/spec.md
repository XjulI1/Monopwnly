# Spec Delta

## Purpose

Permettre de choisir les options à la création et de les garder en vue pendant la partie : options
actives, cagnotte, tours restants, progression vers l'objectif et motif de la victoire.

## ADDED Requirements

### Requirement: Options à la création

L'écran de création SHALL présenter une section « Options de règles » avec quatre cases à cocher
(« Cagnotte de la DMZ », « Bonus double sur Boot », « Construction libre », « Pas de loyer en
quarantaine »), une liste « Limite de tours » (aucune, 20, 30, 40, 60) et une liste « Objectif de
patrimoine » (aucun, 5 000 Ᵽ, 7 500 Ᵽ, 10 000 Ᵽ, 15 000 Ᵽ), toutes désactivées par défaut, chacune
accompagnée d'une phrase d'aide. La section SHALL tenir dans l'écran de création en 1024 × 768 sans
défilement horizontal.

#### Scenario: Valeurs par défaut

- **WHEN** l'utilisateur ouvre l'écran de création
- **THEN** les quatre cases sont décochées et les deux listes sont sur « aucune » et « aucun »

#### Scenario: Options transmises

- **WHEN** l'utilisateur coche « Construction libre », choisit une limite de 30 tours et lance la partie
- **THEN** la partie est créée avec `freeBuilding` à vrai et `turnLimit` à 30

#### Scenario: Rejouer avec les mêmes paramètres

- **WHEN** une partie avec la cagnotte active se termine et que l'utilisateur choisit « Rejouer avec les mêmes paramètres »
- **THEN** la nouvelle partie a aussi la cagnotte active

### Requirement: Rappel des options en jeu

Le HUD SHALL afficher une pastille par option active, avec une info-bulle qui rappelle la règle. Sans
option active, aucune pastille SHALL NOT être affichée. Avec une limite de tours, le HUD SHALL
afficher « Tour <n> / <limite> ». Avec un objectif de patrimoine, le HUD SHALL afficher pour chaque
joueur non failli une jauge de progression vers l'objectif.

#### Scenario: Pastilles

- **WHEN** la partie a la cagnotte et la construction libre actives
- **THEN** le HUD affiche exactement deux pastilles, « Cagnotte » et « Construction libre »

#### Scenario: Compteur de tours

- **WHEN** la limite est de 30 tours et que le tour de table 12 est en cours
- **THEN** le HUD affiche « Tour 12 / 30 »

#### Scenario: Jauge d'objectif

- **WHEN** l'objectif est de 10 000 Ᵽ et que le patrimoine d'Alice vaut 4 000 Ᵽ
- **THEN** la jauge d'Alice est remplie à 40 %

### Requirement: Cagnotte visible

Avec la cagnotte de la DMZ, le plateau SHALL afficher au-dessus de la case DMZ un compteur du montant
de la cagnotte, et le HUD SHALL l'afficher aussi. Le compteur SHALL se mettre à jour au rythme des
animations de paiement. Sans l'option, aucun compteur de cagnotte SHALL NOT être affiché.

#### Scenario: Cagnotte alimentée

- **WHEN** la cagnotte vaut 200 Ᵽ et que Bob paie la Facture du fournisseur cloud
- **THEN** une fois l'animation du paiement jouée, le compteur au-dessus de la DMZ affiche 300 Ᵽ

#### Scenario: Cagnotte remportée

- **WHEN** Carol s'arrête sur la DMZ avec une cagnotte de 300 Ᵽ
- **THEN** une animation montre le versement à Carol et le compteur revient à 0 Ᵽ

### Requirement: Journal et fin de partie

Le journal SHALL décrire les événements des options : « <joueur> alimente la cagnotte de
<montant> », « <joueur> remporte la cagnotte de la DMZ : <montant> », « <joueur> reçoit le bonus
double de Boot », « <joueur> ne perçoit pas de loyer (en quarantaine) ». L'écran de fin SHALL
afficher le motif de victoire (« Dernier hacker solvable », « Limite de <n> tours atteinte »,
« Objectif de <montant> atteint ») et le classement des joueurs par patrimoine.

#### Scenario: Victoire par la limite de tours

- **WHEN** la partie se termine à la limite de 30 tours
- **THEN** l'écran de fin affiche « Limite de 30 tours atteinte » et le classement avec le patrimoine de chaque joueur

#### Scenario: Loyer non perçu au journal

- **WHEN** Bob s'arrête sur le Forum d'Alice alors qu'Alice est en quarantaine et que l'option est active
- **THEN** le journal contient « Alice ne perçoit pas de loyer (en quarantaine) »
