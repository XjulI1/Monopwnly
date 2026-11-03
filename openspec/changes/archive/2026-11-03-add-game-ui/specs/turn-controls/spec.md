# Spec Delta

## Purpose

Guider les joueurs pendant la partie : montrer où en est le tour et la situation de chacun, ne
proposer que des actions légales et transmettre les choix au moteur.

## ADDED Requirements

### Requirement: Bandeau d'état

Le HUD SHALL afficher en permanence le joueur courant (nom et couleur), la phase courante en
français et le dernier lancer de dés. Les phases SHALL être nommées « Avant le lancer », « Décision
d'achat », « Enchère », « Règlement de dette » et « Après le lancer ».

#### Scenario: Début du tour

- **WHEN** c'est le tour d'Alice en phase avant le lancer
- **THEN** le HUD affiche « Alice — Avant le lancer »

#### Scenario: Après un lancer

- **WHEN** Alice a obtenu 4 et 3
- **THEN** le HUD affiche le lancer 4 + 3 = 7

### Requirement: Panneau des joueurs

Le HUD SHALL afficher pour chaque joueur, dans l'ordre de jeu : son nom et sa couleur, son argent au
format des PwnCoins, ses systèmes, nœuds et services regroupés par famille avec la couleur de la
famille (en veille signalés atténués), son nombre de Clés de déchiffrement et un marqueur s'il est en
quarantaine. Le joueur courant SHALL être mis en évidence. Un joueur en faillite SHALL apparaître
barré. Toucher un système de ce panneau SHALL ouvrir sa fiche.

#### Scenario: Format de l'argent

- **WHEN** Bob a 1500 PwnCoins
- **THEN** le panneau affiche « 1 500 Ᵽ » pour Bob

#### Scenario: Quarantaine

- **WHEN** Bob est en quarantaine
- **THEN** un marqueur de quarantaine apparaît à côté de son nom

#### Scenario: Faillite

- **WHEN** Bob fait faillite
- **THEN** Bob apparaît barré dans la liste des joueurs

### Requirement: Seules les actions légales sont proposées

À chaque instant, les boutons du HUD correspondant à une action illégale SHALL être désactivés, avec
la raison donnée par le moteur en infobulle, et le plateau SHALL ne mettre en avant que les cases sur
lesquelles une action légale est possible. Si le moteur rejette malgré tout une action, son message
SHALL être affiché dans une notification sans modifier l'état.

#### Scenario: Rejet inattendu

- **WHEN** le moteur rejette une action
- **THEN** son message d'erreur s'affiche dans une notification et l'état affiché ne change pas

#### Scenario: Pas d'action pendant une animation

- **WHEN** une animation est en cours
- **THEN** les boutons d'action sont désactivés

### Requirement: Lancer et fin du tour

Avant le lancer, le HUD SHALL proposer « Lancer les dés » et « Gérer mes systèmes ». Après le
lancer, il SHALL proposer « Relancer » si le joueur a fait un double et peut rejouer, sinon « Fin du
tour », ainsi que « Gérer mes systèmes ». Ces boutons SHALL émettre respectivement `rollDice` et
`endTurn`.

#### Scenario: Lancer

- **WHEN** le joueur courant touche « Lancer les dés »
- **THEN** l'action `rollDice` est transmise au moteur et le lancer est présenté

#### Scenario: Double

- **WHEN** le lancer du joueur est un double et qu'il n'est pas parti en quarantaine
- **THEN** une fois les animations terminées, le bouton « Relancer » est proposé à la place de « Fin du tour »

#### Scenario: Fin du tour

- **WHEN** le joueur touche « Fin du tour »
- **THEN** le tour passe au joueur suivant et le bandeau affiche son nom

### Requirement: Sortie de quarantaine

Quand le joueur courant est en quarantaine avant son lancer, le HUD SHALL proposer « Payer 50 Ᵽ »
(`payQuarantineFine`), « Utiliser une Clé » (`useDecryptionKey`, actif seulement s'il en détient une)
et « Tenter un double » (`rollDice`), et SHALL afficher le nombre de tentatives déjà échouées.

#### Scenario: Sans Clé

- **WHEN** le joueur en quarantaine ne détient aucune Clé de déchiffrement
- **THEN** le bouton « Utiliser une Clé » est désactivé

#### Scenario: Deuxième tentative

- **WHEN** le joueur en quarantaine a déjà échoué une fois
- **THEN** le HUD indique « Tentative 2 sur 3 »

### Requirement: Utilisable à la souris et au doigt

Le HUD SHALL s'afficher en panneau latéral à côté du plateau sur les écrans paysage d'au moins
1024 × 768, et toute commande SHALL offrir une zone tactile d'au moins 44 × 44 pixels CSS.

#### Scenario: Tablette

- **WHEN** l'écran de partie s'affiche en 1024 × 768
- **THEN** le plateau entier et le panneau latéral sont visibles sans défilement de la page
