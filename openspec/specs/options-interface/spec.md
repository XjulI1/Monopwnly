# options-interface Specification

## Purpose
Permettre de choisir les options à la création et de les garder en vue pendant la partie : règles
optionnelles actives, cagnotte, tours restants et progression vers l'objectif.

## Requirements

### Requirement: Options à la création

L'écran de création SHALL présenter une section « Options de règles » avec quatre cases à cocher
(« Cagnotte de la DMZ », « Bonus double sur Boot », « Construction libre », « Pas de loyer en
quarantaine »), une liste « Limite de tours » (aucune, 20, 30, 40, 60) et une liste « Objectif de
patrimoine » (aucun, 3 000 Ᵽ, 4 000 Ᵽ, 5 000 Ᵽ, 6 000 Ᵽ), toutes désactivées par défaut. La section
SHALL tenir dans l'écran de création en 1024 × 768 sans défilement horizontal. Chaque réglage SHALL
être accompagné de sa phrase d'aide :

| Réglage | Phrase d'aide |
|---|---|
| Cagnotte de la DMZ | « Les taxes et les cartes qui font payer la banque remplissent une cagnotte, gagnée par le joueur qui s'arrête sur la DMZ. » |
| Bonus double sur Boot | « S'arrêter sur Boot rapporte 400 Ᵽ au lieu de 200 Ᵽ. » |
| Construction libre | « Plus besoin de construire ni de revendre de façon égale dans une famille. » |
| Pas de loyer en quarantaine | « Un joueur en quarantaine ne touche aucun loyer. » |
| Limite de tours | « À la fin du dernier tour de table, le plus gros patrimoine gagne. » |
| Objectif de patrimoine | « La partie s'arrête dès qu'un joueur atteint ce patrimoine à la fin d'un tour. » |

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

Le HUD SHALL afficher une pastille par règle optionnelle active (cagnotte de la DMZ, bonus double sur
Boot, construction libre, pas de loyer en quarantaine), avec une info-bulle qui rappelle la règle.
Sans règle optionnelle active, le HUD SHALL n'afficher aucune pastille. La limite de tours et
l'objectif de patrimoine n'ont pas de pastille : avec une limite de tours, le HUD SHALL afficher
« Tour <n> / <limite> » ; avec un objectif de patrimoine, le HUD SHALL afficher pour chaque joueur
non failli une jauge de progression vers l'objectif.

#### Scenario: Pastilles

- **WHEN** la partie a la cagnotte et la construction libre actives
- **THEN** le HUD affiche exactement deux pastilles, « Cagnotte » et « Construction libre »

#### Scenario: Limite sans pastille

- **WHEN** la partie n'a qu'une limite de 30 tours et que le tour de table 1 est en cours
- **THEN** le HUD n'affiche aucune pastille et affiche « Tour 1 / 30 »

#### Scenario: Compteur de tours

- **WHEN** la limite est de 30 tours et que le tour de table 12 est en cours
- **THEN** le HUD affiche « Tour 12 / 30 »

#### Scenario: Jauge d'objectif

- **WHEN** l'objectif est de 5 000 Ᵽ et que le patrimoine d'Alice vaut 2 000 Ᵽ
- **THEN** la jauge d'Alice est remplie à 40 %

### Requirement: Cagnotte visible

Avec la cagnotte de la DMZ, le plateau SHALL afficher au-dessus de la case DMZ un compteur du montant
de la cagnotte, et le HUD SHALL l'afficher aussi. Le compteur SHALL se mettre à jour au rythme des
animations de paiement. Sans l'option, le plateau et le HUD SHALL n'afficher aucun compteur de
cagnotte.

#### Scenario: Cagnotte alimentée

- **WHEN** la cagnotte vaut 200 Ᵽ et que Bob paie la Facture du fournisseur cloud
- **THEN** une fois l'animation du paiement jouée, le compteur au-dessus de la DMZ affiche 300 Ᵽ

#### Scenario: Cagnotte remportée

- **WHEN** Carol s'arrête sur la DMZ avec une cagnotte de 300 Ᵽ
- **THEN** une animation montre le versement à Carol et le compteur revient à 0 Ᵽ

#### Scenario: Sans l'option

- **WHEN** la partie est créée sans la cagnotte de la DMZ
- **THEN** ni le plateau ni le HUD n'affichent de compteur de cagnotte
