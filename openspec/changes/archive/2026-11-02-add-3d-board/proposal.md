## Why

Le moteur de règles (`add-rules-engine`) produit un état de partie, mais rien ne permet encore de le
voir. Le plateau 3D est la pièce centrale de l'expérience : il doit afficher fidèlement l'état du
moteur (qui possède quoi, ce qui est construit, où sont les pions), rester lisible à toutes les
échelles et réagir à la souris comme au doigt, avant même que l'interface de jeu ne soit branchée
dessus.

## What Changes

- **Géométrie du plateau calculée** : un plateau carré de 40 cases, 11 par côté, coins plus grands
  que les cases ordinaires, entièrement généré en code à partir des données du moteur (aucun
  asset de géométrie). Une fonction pure donne la position, l'orientation et la taille de chaque
  case.
- **Rendu des cases** : tuiles en léger relief façon plateau low-poly, bandeau de couleur par famille
  de systèmes, icône pour les nœuds, services, taxes et cases carte, nom et prix lisibles, centre du
  plateau décoré (logo Monopwnly, emplacements des paquets Exploit et Patch).
- **Thème cyber** : fond sombre, bords néon, éclairage froid, propriétaire signalé par un liseré
  lumineux à sa couleur et une couleur atténuée pour une case en veille.
- **Constructions en relief** : de 1 à 4 backdoors (petits blocs) ou un rootkit (bloc plus haut) sur
  la case du système, mis à jour avec l'état.
- **Pions** : un pion 3D low-poly par joueur à sa couleur, posé sur sa case, plusieurs pions sur une
  même case disposés sans se chevaucher, pion en quarantaine distinct du pion en simple visite.
- **Déplacement animé** : le plateau sait faire avancer un pion case par case le long d'une liste de
  cases (celle de l'événement `moved` du moteur), à une durée par case donnée par l'appelant.
- **Caméra** : vue du haut inclinée fixe, zoom et déplacement à la souris et au tactile, bornés,
  recentrage, et suivi optionnel du pion en mouvement.
- **Interaction** : survol avec nom de la case, sélection au clic ou au toucher, états de
  surbrillance pilotés de l'extérieur (sélectionnable, sélectionné), sans aucune logique de règle.
- **Composant de plateau réutilisable**, purement présentationnel : il reçoit l'état, les
  surbrillances et les déplacements à animer, et émet la case choisie.
- **Écran de démonstration provisoire** : l'écran d'accueil affiche une partie générée par le moteur
  et rejouée sur quelques tours aléatoires, en attendant `add-game-ui`.

## Capabilities

### New Capabilities

- `board-rendering` : géométrie du plateau carré, cases, familles, propriétaires, mise en veille, constructions, pions et déplacement case par case.
- `board-camera` : cadrage incliné, zoom et déplacement bornés, recentrage et suivi du pion.
- `board-interaction` : survol, sélection et états de surbrillance des cases, pilotés par l'appelant.

### Modified Capabilities

(aucune)

## Hors périmètre

- HUD, déroulement d'un tour, dés animés, cartes Exploit et Patch affichées, enchères : `add-game-ui`.
- Enchaînement des animations à partir des événements du moteur (paiements, cartes, constructions) :
  `add-game-ui` ; le plateau n'offre ici que l'animation de déplacement d'un pion.
- Sons et musique : non retenus pour la V1.

## Impact

- Nouvelles dépendances à installer par l'utilisateur (`pnpm add`) : `three`, `@tresjs/core`,
  `@tresjs/cientos`, et en dev `@types/three`.
- Nouveau dossier `src/board/` (géométrie, modèle de vue, composants) ; remplacement du contenu
  provisoire de `src/App.vue`.
- Dépend de `add-rules-engine` (types, données du plateau, `createGame`, `applyAction`).
- Le moteur n'est pas modifié ; la règle ESLint qui l'isole de Three.js reste en place.
