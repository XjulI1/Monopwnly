## Why

L'objectif du projet est de jouer seul contre l'ordinateur. Après `add-game-ui`, Monopwnly ne se
joue qu'entre humains sur le même écran. Il faut des adversaires artificiels crédibles, de difficulté
réglable, qui respectent les mêmes règles que le joueur et ne trichent pas. Il faut aussi un moyen
de vérifier que les valeurs du plateau (`docs/plateau.md`) donnent des parties d'une durée
raisonnable : seules des parties simulées en grand nombre le permettent.

## What Changes

- **Joueurs IA** sélectionnables à la création d'une partie, avec un niveau commun à toutes les IA
  de la partie : facile, normal ou difficile. Par défaut : le premier joueur est humain, les autres
  sont des IA de niveau normal, chacune avec un pseudonyme de hacker inventé.
- **Décisions automatiques** : dès qu'une IA doit agir (son tour, une mise d'enchère, une dette à
  régler, y compris hors de son tour), elle choisit une action et la soumet par le même point
  d'entrée que les humains, à un rythme lisible qui suit la vitesse d'animation. Le calcul se fait
  dans un Web Worker pour ne jamais figer les animations.
- **Trois niveaux de stratégie heuristique**, différenciés sur chaque décision :
  - achat d'une case libre ;
  - enchère jusqu'à une valeur estimée de la case ;
  - construction de backdoors et de rootkits en gardant une réserve de sécurité ;
  - mise en veille et revente pour éviter la faillite, en sacrifiant d'abord ce qui rapporte le moins ;
  - sortie de quarantaine selon le moment de la partie (sortir tôt pour acheter, rester tard pour
    éviter les loyers).
- **Pas de triche** : une IA ne voit que l'information publique ; l'ordre des paquets Exploit et
  Patch et l'état du générateur aléatoire lui sont cachés.
- **Tournoi d'équilibrage** : un script simule des centaines de parties entre IA et produit la durée
  moyenne d'une partie, l'avantage du premier joueur, le taux de victoire par niveau et le
  rendement de chaque famille, avec une limite de tours de sécurité. Il sert à valider ou réajuster
  les loyers de `docs/plateau.md`.

## Capabilities

### New Capabilities

- `ai-players` : déclaration des joueurs IA, noms, décisions automatiques dans et hors du tour, rythme, worker, information visible, garanties de légalité et de terminaison.
- `ai-strategy` : comportements observables de chaque niveau (achat, enchère, construction, dettes, quarantaine) et écart de force attendu entre niveaux.
- `ai-balance-tournament` : tournoi de parties simulées, mesures produites, critères d'équilibre du plateau.

### Modified Capabilities

(aucune : les changes précédents ne sont pas encore archivés ; les exigences sur le formulaire de
création propres aux IA sont portées par `ai-players`)

## Hors périmètre

- Échanges entre joueurs : l'IA n'en propose ni n'en reçoit tant que `add-trading` n'est pas appliqué
  (les échanges n'existent pas encore dans le moteur).
- Règles optionnelles et fins alternatives : prises en compte par l'IA dans `add-game-options`.
- IA experte par simulation : après la V1.
- Sauvegarde d'une partie contre l'IA : `add-save-and-journal`.

## Impact

- Nouveau module `src/ai/` (pur, sans Vue ni Three.js, soumis à la même règle d'isolement ESLint que
  le moteur) et `src/ai/worker.ts`.
- Moteur : le joueur porte désormais un type `{ kind: 'human' } | { kind: 'ai'; level }` ; une
  requête `actingPlayerId(state)` indique qui doit agir (joueur courant, enchérisseur attendu ou
  débiteur). Aucune règle ne change.
- Interface : formulaire de création (type par joueur, niveau commun des IA), pilotage des décisions
  IA dans la session de jeu.
- Nouveau script `pnpm test:balance` (tournoi long, hors `pnpm test`).
- Aucune nouvelle dépendance.
- Dépend de `add-rules-engine`, `add-3d-board` et `add-game-ui`.
