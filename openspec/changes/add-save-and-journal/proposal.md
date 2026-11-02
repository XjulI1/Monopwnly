## Why

Une partie de Monopwnly dure longtemps : sans sauvegarde, un rechargement de page ou une fermeture
d'onglet fait tout perdre. Et contre plusieurs IA qui jouent vite, il est difficile de suivre qui a
payé quoi à qui pendant leurs tours, ou de comprendre a posteriori comment la partie a basculé.

## What Changes

- **Sauvegarde automatique** de la partie en cours dans le navigateur après chaque action acceptée,
  et **reprise** depuis l'accueil, au même point (décision d'achat, enchère, règlement de dette
  compris), IA comprises.
- « Quitter la partie » revient à l'accueil **en conservant** la sauvegarde ; créer une nouvelle
  partie demande confirmation avant de la remplacer.
- Gestion des sauvegardes illisibles, d'une version incompatible et d'un stockage plein ou
  indisponible, sans jamais bloquer le jeu.
- **Journal de partie** : chaque action décrite en français (lancers, déplacements, achats, enchères,
  loyers, cartes, constructions, mises en veille, faillites), regroupée par tour, aux couleurs des
  joueurs, synchronisée avec les animations pour ne pas dévoiler un résultat avant les dés.
- **Statistiques** : patrimoine et argent liquide de chaque joueur au fil des tours, loyers perçus et
  payés, systèmes les plus rentables, faillites, présentés en fin de partie sous forme de courbes et
  de tableaux.

## Capabilities

### New Capabilities

- `game-persistence` : sauvegarde automatique, reprise, remplacement, erreurs de stockage.
- `game-journal` : journal lisible des actions de la partie.
- `game-statistics` : collecte des statistiques au fil de la partie et écran de statistiques de fin.

### Modified Capabilities

(aucune : le changement de sens de « Quitter la partie » et les ajouts à l'accueil et à l'écran de fin
sont décrits dans `game-persistence` et `game-statistics`)

## Hors périmètre

- Plusieurs emplacements de sauvegarde, export ou import de fichier : non retenus pour la V1.
- Relecture pas à pas d'une partie terminée (« replay ») : possible plus tard grâce au déterminisme
  du moteur, non retenue pour la V1.
- Synchronisation entre appareils.
- Entrées de journal et statistiques des échanges : ajoutées par `add-trading`, qui étend les
  fonctions de ce change.
- Entrées de journal et statistiques liées aux options (cagnotte de la DMZ, fin par limite de tours
  ou objectif) : ajoutées par `add-game-options`.

## Impact

- Nouveau dossier `src/game/history/` (journal, statistiques) et module `src/game/persistence.ts`.
- La session de jeu (`add-game-ui`, `add-heuristic-ai`) enregistre journal et statistiques et
  déclenche la sauvegarde après chaque action.
- Écrans : bouton « Reprendre la partie » sur l'accueil, confirmation de remplacement, panneau de
  journal dans le HUD, onglet « Statistiques » sur l'écran de fin.
- « Quitter la partie » conserve désormais la partie au lieu de l'abandonner.
- Aucune nouvelle dépendance ; graphiques en SVG faits main.
- Dépend de `add-rules-engine`, `add-3d-board`, `add-game-ui` et `add-heuristic-ai`.
