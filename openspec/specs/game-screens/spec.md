# game-screens Specification

## Purpose
Organiser l'application en écrans successifs (accueil, création, partie, fin de partie) et définir
comment on passe de l'un à l'autre.

## Requirements

### Requirement: Écran d'accueil

Au lancement, l'application SHALL afficher un écran d'accueil au nom de Monopwnly proposant de créer
une nouvelle partie.

#### Scenario: Lancement de l'application

- **WHEN** l'utilisateur ouvre l'application
- **THEN** l'écran d'accueil s'affiche avec un bouton « Nouvelle partie »

#### Scenario: Aller à la création

- **WHEN** l'utilisateur clique sur « Nouvelle partie »
- **THEN** l'écran de création de partie s'affiche

### Requirement: Écran de partie

Une fois la partie créée, l'application SHALL afficher le plateau 3D avec le panneau latéral du HUD.
« Quitter la partie » SHALL ramener aussitôt à l'accueil, sans confirmation, en conservant la
sauvegarde de la partie pour pouvoir la reprendre.

#### Scenario: Démarrage d'une partie

- **WHEN** l'utilisateur valide la création d'une partie
- **THEN** l'écran de partie s'affiche avec le plateau, tous les pions sur Boot et le HUD du premier joueur

#### Scenario: Quitter la partie

- **WHEN** l'utilisateur choisit « Quitter la partie »
- **THEN** l'écran d'accueil s'affiche aussitôt, sans confirmation, et propose « Reprendre la partie »

### Requirement: Écran de fin de partie

Quand le moteur déclare un vainqueur, l'application SHALL afficher par-dessus le plateau final et le
HUD un écran de fin de partie nommant le vainqueur dans sa couleur avec son argent final et le motif
de sa victoire (« Dernier hacker solvable », « Limite de <n> tours atteinte » ou « Objectif de
<montant> atteint »), avec un onglet « Résultat » classant les joueurs : le vainqueur, puis les
autres joueurs non faillis dans l'ordre du classement de `game-end-conditions` (patrimoine, argent
liquide, ordre de jeu) avec leur patrimoine, puis les faillis de la faillite la plus récente à la
plus ancienne avec son tour et son créancier, ou « Abandon au tour <n> » pour un joueur qui a
abandonné ; un onglet « Statistiques » ; et les choix « Rejouer
avec les mêmes paramètres » et « Retour à l'accueil ».

#### Scenario: Victoire

- **WHEN** le moteur déclare la victoire d'Alice
- **THEN** l'écran de fin affiche « Alice remporte la partie » dans la couleur d'Alice

#### Scenario: Classement

- **WHEN** Carol gagne, que Bob a fait faillite au tour 30 au profit de la banque et Alice au tour 18 au profit de Carol
- **THEN** l'onglet « Résultat » liste Carol « Vainqueur », Bob « Faillite au tour 30 au profit de la banque », puis Alice « Faillite au tour 18 au profit de Carol »

#### Scenario: Victoire par la limite de tours

- **WHEN** la partie se termine à la limite de 30 tours
- **THEN** l'écran de fin affiche « Limite de 30 tours atteinte » et le patrimoine de chaque joueur non failli

#### Scenario: Classement avec des joueurs non faillis

- **WHEN** la partie se termine par la limite de tours avec Carol à 7 000 Ᵽ de patrimoine, Alice à 4 000 Ᵽ et Bob failli au tour 12 au profit de la banque
- **THEN** l'onglet « Résultat » liste Carol « Vainqueur », Alice avec « 4 000 Ᵽ », puis Bob « Faillite au tour 12 au profit de la banque »

#### Scenario: Rejouer

- **WHEN** l'utilisateur choisit « Rejouer avec les mêmes paramètres »
- **THEN** une nouvelle partie démarre avec les mêmes joueurs et réglages et une nouvelle graine

#### Scenario: Classement avec un abandon

- **WHEN** Carol gagne, que Bob a abandonné au tour 30 et Alice a fait faillite au tour 18 au profit de Carol
- **THEN** l'onglet « Résultat » liste Carol « Vainqueur », Bob « Abandon au tour 30 », puis Alice « Faillite au tour 18 au profit de Carol »
