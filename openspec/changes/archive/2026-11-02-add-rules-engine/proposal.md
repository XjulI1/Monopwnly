## Why

Le projet part de zéro. Tout ce qui viendra ensuite (rendu 3D, interface, IA, échanges, options)
consomme l'état d'une partie et doit respecter les mêmes règles. Il faut donc d'abord un **socle
applicatif** et un **moteur de règles** pur, déterministe et sérialisable, testé en TDD, sur lequel
brancher l'affichage et l'IA sans jamais dupliquer de logique de jeu.

## What Changes

- **Socle du projet** : application Vite + Vue 3 + TypeScript strict, gérée avec pnpm, avec Vitest,
  ESLint et vérification de types. L'application affiche seulement un écran d'accueil provisoire.
- **Plateau en données** : les 40 cases de [`docs/plateau.md`](../../../docs/plateau.md) (systèmes
  et familles, nœuds, services, taxes, cases carte, coins), avec prix, loyers, coûts de
  construction et valeurs de mise en veille, ainsi que les 16 cartes Exploit et les 16 cartes Patch.
- **Moteur de règles** (`src/engine/`, sans dépendance à Vue ni à Three.js) :
  - création d'une partie de 2 à 6 joueurs, argent de départ, paquets mélangés, premier joueur tiré
    au sort ;
  - tour de jeu en phases : avant le lancer, décision d'achat, enchère, règlement de dette, après le
    lancer ;
  - déplacement aux deux dés, doubles, salaire au passage de Boot, envoi en quarantaine et sortie ;
  - achat d'une case libre, ou enchère ouverte à tous si le joueur refuse ;
  - loyers des systèmes (base, famille complète, constructions), des nœuds et des services, taxes ;
  - cartes Exploit et Patch, dont la Clé de déchiffrement conservée en main ;
  - backdoors et rootkits avec construction uniforme et stock limité, revente, mise en veille et
    réactivation ;
  - dettes, faillite envers un joueur ou envers la banque, victoire du dernier joueur solvable.
- **Réglage** à la création : enchères activées ou non.
- **API d'actions** : chaque action est validée par le moteur, qui renvoie un nouvel état et une
  liste d'événements (pour le futur journal et les animations), ou une erreur de règle explicite.
  Le hasard passe par un générateur pseudo-aléatoire à graine stocké dans l'état : même graine +
  mêmes actions = même partie.

## Capabilities

### New Capabilities

- `board-data` : les 40 cases, familles, prix, loyers et cartes, avec leurs invariants.
- `game-setup` : création d'une partie, joueurs, réglages, argent de départ, paquets, premier joueur.
- `turn-flow` : phases d'un tour, passage au joueur suivant, validation des actions, événements, déterminisme, sérialisation.
- `movement` : lancer de dés, déplacement, doubles, salaire de Boot, cases spéciales.
- `quarantine` : entrée en quarantaine et façons d'en sortir.
- `property-acquisition` : achat d'une case libre et enchère.
- `rent` : loyers des systèmes, nœuds et services, taxes.
- `event-cards` : paquets Exploit et Patch, effets des cartes, Clé de déchiffrement.
- `development` : backdoors et rootkits, construction uniforme, stock, revente, mise en veille.
- `debt-and-bankruptcy` : paiements, règlement de dette, faillite et victoire.

### Modified Capabilities

(aucune, projet vierge)

## Hors périmètre

Chaque point fera l'objet d'un change ultérieur, dans cet ordre :

1. `add-3d-board` : plateau 3D TresJS (cases en relief, pions, constructions, caméra inclinée
   zoom/pan, sélection à la souris et au tactile).
2. `add-game-ui` : écran de création de partie, HUD du tour, dés animés et vitesse d'animation,
   décisions d'achat, enchères, constructions et mise en veille, règlement de dette. Jouable d'abord
   avec tous les joueurs humains sur le même écran.
3. `add-heuristic-ai` : IA heuristique en trois niveaux (facile, normal, difficile).
4. `add-save-and-journal` : sauvegarde automatique en localStorage, reprise, journal de partie et
   statistiques de fin.
5. `add-trading` : échanges entre joueurs (moteur, interface, IA qui propose et évalue).
6. `add-game-options` : cagnotte de la DMZ, bonus double sur Boot, construction libre, pas de loyer
   en quarantaine, limite de tours, objectif de patrimoine.
7. `add-offline-pwa` : application installable et jouable hors ligne.

Rien de ce change n'est visible en jeu : il se vérifie par les tests du moteur.

## Impact

- Nouveau dépôt : `package.json`, configuration Vite, TypeScript, Vitest et ESLint, `index.html`,
  `src/main.ts`, `src/App.vue`.
- Nouveau module `src/engine/` (types, données du plateau, générateur aléatoire, règles) avec tests
  colocalisés.
- Dépendances à installer par l'utilisateur (`pnpm install`) : vue, vite, @vitejs/plugin-vue,
  typescript, vue-tsc, vitest, eslint, typescript-eslint, eslint-plugin-vue.
- Aucune dépendance runtime ajoutée au moteur.
