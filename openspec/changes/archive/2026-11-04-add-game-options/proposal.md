## Why

Les parties de ce genre de jeu traînent souvent en longueur, et chaque table a ses règles maison.
Monopwnly doit offrir des parties courtes (limite de tours, objectif de patrimoine) et les règles
optionnelles les plus demandées, sans compliquer la partie par défaut : toutes sont désactivées tant
que le joueur ne les choisit pas, et l'IA doit en tenir compte pour rester crédible.

## What Changes

- **Règles optionnelles** à la création, toutes désactivées par défaut et cumulables :
  - **cagnotte de la DMZ** : les taxes et les paiements à la banque des cartes listées dans
    `docs/plateau.md` alimentent une cagnotte, que remporte le joueur qui s'arrête sur la DMZ ;
  - **bonus double sur Boot** : s'arrêter sur Boot rapporte 400 Ᵽ au lieu de 200 Ᵽ ;
  - **construction libre** : l'obligation de construire et de revendre uniformément dans une famille
    est levée ;
  - **pas de loyer en quarantaine** : un joueur en quarantaine ne perçoit aucun loyer, y compris
    les loyers imposés par les cartes « Tunnel chiffré » et « Ping ».
- **Fins de partie** : la faillite de tous sauf un reste la règle et s'applique toujours ; deux fins
  supplémentaires, cumulables :
  - **limite de tours** (20, 30, 40 ou 60 tours de table) : à la fin du dernier, le plus gros
    patrimoine gagne ;
  - **objectif de patrimoine** (3 000, 4 000, 5 000 ou 6 000 Ᵽ) : vérifié à la fin du tour de
    chaque joueur.
  - départage commun : patrimoine, puis argent liquide, puis ordre de jeu.
- **Interface** : section « Options de règles » dans la création de partie, pastilles des règles
  optionnelles actives en jeu, cagnotte affichée sur la DMZ et dans le HUD, compteur de tours et
  progression vers l'objectif, entrées de journal, motif de victoire et classement par patrimoine
  sur l'écran de fin.
- **IA** : les niveaux normal et difficile adaptent leurs décisions aux options actives (fin de
  partie proche, objectif adverse, construction libre, quarantaine sans loyer) ; le niveau facile
  garde ses décisions habituelles et reste à la construction uniforme même avec la construction
  libre.
- **Sauvegarde** : les sauvegardes des formats antérieurs sont migrées, aucune partie en cours n'est
  perdue à la mise à jour de l'application.

## Capabilities

### New Capabilities

- `house-rules` : réglages des quatre règles optionnelles et leur effet sur le moteur.
- `game-end-conditions` : patrimoine, limite de tours, objectif de patrimoine, départage et motif de victoire.
- `options-interface` : options dans la création, pastilles en jeu, cagnotte, compteur de tours et progression vers l'objectif.
- `options-ai` : décisions des IA selon les options actives.

### Modified Capabilities

- `turn-flow` : le compteur de tours part du premier joueur tiré au sort, pour que chaque joueur
  joue le même nombre de tours dans un tour de table.
- `debt-and-bankruptcy` : la victoire du dernier joueur solvable porte un motif et n'est plus la
  seule fin de partie possible.
- `game-screens` : l'écran de fin affiche le motif de victoire et classe les joueurs non faillis
  par patrimoine avant les faillis.
- `game-journal` : quatre nouvelles entrées et une entrée de victoire complétée par le motif.
- `game-persistence` : migration des sauvegardes des formats antérieurs.

## Hors périmètre

- Autres règles maison (argent de départ réglable, double salaire en quarantaine, enchère au départ
  de chaque case, prêts entre joueurs) : non retenues.
- Valeurs libres pour la limite de tours et l'objectif : seules les valeurs proposées sont
  disponibles.
- Combinaisons interdites : aucune, toutes les options se cumulent.
- Compteurs de cagnotte dans les statistiques de fin de partie.
- IA experte par simulation : après la V1.

## Impact

- Moteur : nouveaux champs de `GameSettings` (`dmzJackpot`, `doubleBootBonus`, `freeBuilding`,
  `noRentInQuarantine`, `turnLimit`, `netWorthTarget`), champs `dmzPot`, `winReason` et
  `firstPlayerIndex` dans l'état, compteur de tours qui part du premier joueur tiré au sort,
  code d'erreur `INVALID_SETTINGS`, nouveaux événements `potIncreased`, `potCollected`, `bootBonus`
  et `rentWaived`, motif ajouté à l'événement `gameWon`, requête de classement des joueurs non
  faillis. Branchements : `charge` (`payments.ts`) pour la cagnotte, `resolveLanding`
  (`movement.ts`) pour Boot, la DMZ et les loyers, `buildProblem` et `sellProblem`
  (`development.ts`) pour l'uniformité, `checkVictory` (`turn.ts`) appelée aussi en fin de tour.
- IA : module `src/ai/options.ts` pour les niveaux normal et difficile ; construction uniforme
  imposée à l'IA facile avec la construction libre.
- Plateau 3D : nouveau compteur de cagnotte au-dessus de la DMZ.
- Interface : création, HUD, journal, écran de fin ; statistiques qui comptent un paiement versé à
  la cagnotte comme le paiement qu'il remplace.
- Sauvegarde : `SAVE_FORMAT_VERSION` passe à 3, migration des formats 1 et 2.
- Tournoi d'équilibrage : séries avec options et par objectif de patrimoine.
- Aucune nouvelle dépendance.
- Dépend de tous les changes précédents, dont `add-trading` pour l'évaluation des échanges par l'IA
  en fin de partie.
