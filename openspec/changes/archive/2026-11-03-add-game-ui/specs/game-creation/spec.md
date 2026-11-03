# Spec Delta

## Purpose

Permettre de configurer une partie avant de la lancer : joueurs, couleurs et réglage des enchères,
avec des valeurs par défaut qui permettent de jouer en un clic.

## ADDED Requirements

### Requirement: Liste des joueurs

Le formulaire SHALL proposer par défaut 3 joueurs nommés « Joueur 1 », « Joueur 2 », « Joueur 3 »
avec des couleurs distinctes, et SHALL permettre d'ajouter ou de retirer des joueurs entre 2 et 6.
Chaque joueur SHALL avoir un nom modifiable et une couleur choisie dans la palette de 6 couleurs de
joueurs du plateau.

#### Scenario: Valeurs par défaut

- **WHEN** l'écran de création s'ouvre
- **THEN** 3 joueurs sont proposés avec des noms par défaut et des couleurs toutes différentes

#### Scenario: Limite haute

- **WHEN** la liste compte déjà 6 joueurs
- **THEN** l'ajout d'un joueur est désactivé

#### Scenario: Limite basse

- **WHEN** la liste compte 2 joueurs
- **THEN** le retrait d'un joueur est désactivé

#### Scenario: Couleur déjà prise

- **WHEN** l'utilisateur choisit pour un joueur une couleur déjà utilisée par un autre
- **THEN** les deux joueurs échangent leurs couleurs

### Requirement: Validation des noms

Un nom de joueur SHALL être non vide après suppression des espaces, d'au plus 20 caractères, et
unique dans la partie. Le lancement SHALL être impossible tant qu'un nom est invalide, avec un
message à côté du champ fautif.

#### Scenario: Nom vide

- **WHEN** l'utilisateur vide le nom d'un joueur
- **THEN** un message « Nom obligatoire » s'affiche et le bouton de lancement est désactivé

#### Scenario: Noms en double

- **WHEN** deux joueurs portent le nom « Alice »
- **THEN** un message signale le doublon et le bouton de lancement est désactivé

### Requirement: Réglage des enchères

Le formulaire SHALL exposer le réglage des enchères du moteur, activé par défaut, avec une phrase
expliquant son effet : une case refusée est mise aux enchères, ou reste à la banque.

#### Scenario: Réglages par défaut

- **WHEN** l'utilisateur lance une partie sans toucher aux réglages
- **THEN** la partie est créée avec les enchères activées

#### Scenario: Enchères désactivées

- **WHEN** l'utilisateur désactive les enchères puis lance la partie
- **THEN** la partie est créée avec les enchères désactivées

### Requirement: Lancement

Le lancement SHALL créer la partie via le moteur avec une graine aléatoire et afficher l'écran de
partie. Si le moteur refuse la configuration, son message d'erreur SHALL être affiché et
l'utilisateur SHALL rester sur le formulaire.

#### Scenario: Lancement réussi

- **WHEN** l'utilisateur lance une partie valide
- **THEN** la partie est créée et l'écran de partie s'affiche

#### Scenario: Refus du moteur

- **WHEN** le moteur rejette la configuration transmise
- **THEN** son message est affiché et le formulaire reste ouvert avec les valeurs saisies
