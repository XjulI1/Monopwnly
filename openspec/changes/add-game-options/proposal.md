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
  - **pas de loyer en quarantaine** : un joueur en quarantaine ne perçoit aucun loyer.
- **Fins de partie** : la faillite de tous sauf un reste la règle et s'applique toujours ; deux fins
  supplémentaires, cumulables :
  - **limite de tours** (20, 30, 40 ou 60 tours de table) : à la fin du dernier, le plus gros
    patrimoine gagne ;
  - **objectif de patrimoine** (5 000, 7 500, 10 000 ou 15 000 Ᵽ) : vérifié à la fin du tour de
    chaque joueur.
- **Interface** : section « Options de règles » dans la création de partie, rappel des options
  actives en jeu, cagnotte affichée sur la DMZ et dans le HUD, compteur de tours et progression vers
  l'objectif, entrées de journal et motif de victoire sur l'écran de fin.
- **IA** : les niveaux normal et difficile adaptent leurs décisions aux options actives (fin de
  partie proche, objectif adverse, construction libre, quarantaine sans loyer) ; le niveau facile
  les subit sans stratégie dédiée.

## Capabilities

### New Capabilities

- `house-rules` : réglages des quatre règles optionnelles et leur effet sur le moteur.
- `game-end-conditions` : patrimoine, limite de tours, objectif de patrimoine, départage et motif de victoire.
- `options-interface` : options dans la création, rappel en jeu, cagnotte, compteur de tours, progression, journal et écran de fin.
- `options-ai` : décisions des IA selon les options actives.

### Modified Capabilities

(aucune : les options s'ajoutent par de nouveaux champs de `GameSettings` aux valeurs par défaut
neutres, sans changer le comportement d'une partie sans option)

## Hors périmètre

- Autres règles maison (argent de départ réglable, double salaire en quarantaine, enchère au départ
  de chaque case, prêts entre joueurs) : non retenues.
- Valeurs libres pour la limite de tours et l'objectif : seules les valeurs proposées sont
  disponibles.
- Combinaisons interdites : aucune, toutes les options se cumulent.
- IA experte par simulation : après la V1.

## Impact

- Moteur : nouveaux champs de `GameSettings` (`dmzJackpot`, `doubleBootBonus`, `freeBuilding`,
  `noRentInQuarantine`, `turnLimit`, `netWorthTarget`), champ `dmzPot` dans l'état, motif de victoire
  `winReason`, nouveaux événements (cagnotte alimentée, cagnotte remportée, loyer non perçu, fin par
  limite de tours, objectif atteint). Branchements dans les fonctions dédiées prévues par
  `add-rules-engine` : loyers, arrivée sur Boot et la DMZ, règle d'uniformité, évaluation de la
  victoire.
- IA : ajustements des heuristiques des niveaux normal et difficile.
- Plateau 3D : compteur de cagnotte sur la DMZ.
- Interface : création, HUD, journal, écran de fin.
- Sauvegarde : `formatVersion` incrémentée ; une sauvegarde antérieure est rejetée proprement.
- Aucune nouvelle dépendance.
- Dépend de tous les changes précédents, dont `add-trading` pour l'évaluation des échanges par l'IA
  en fin de partie.
