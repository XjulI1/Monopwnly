# Design

## Context

`add-rules-engine` a prévu les points d'extension : `GameSettings` est un objet plat, et le calcul
des loyers, l'arrivée sur Boot et la DMZ, la règle d'uniformité des constructions et l'évaluation de
la victoire sont chacun dans une fonction dédiée. La requête de patrimoine existe déjà dans
`queries.ts` (utilisée par les statistiques de `add-save-and-journal`). Ce change s'y branche sans
toucher au reste. Motivation : proposal.md ; exigences : `specs/`.

## Goals / Non-Goals

**Goals :**

- Une partie sans option se joue exactement comme avant : mêmes événements, même résultat pour une
  même graine.
- Une seule définition du patrimoine, partagée par la victoire, l'interface, les statistiques et
  l'IA.

**Non-Goals :**

- Pas de système générique de « modificateurs de règles » : quatre options booléennes et deux fins
  de partie ne le justifient pas.
- Pas de migration des sauvegardes antérieures.

## Decisions

### Réglages

```ts
type GameSettings = {
  auctions: boolean
  dmzJackpot: boolean
  doubleBootBonus: boolean
  freeBuilding: boolean
  noRentInQuarantine: boolean
  turnLimit: 20 | 30 | 40 | 60 | null
  netWorthTarget: 5000 | 7500 | 10000 | 15000 | null
}
```

Valeurs par défaut : booléens à `false`, `turnLimit` et `netWorthTarget` à `null`. La création
rejette une valeur hors liste avec `INVALID_SETTINGS`. Des unions littérales plutôt que des
nombres libres : l'interface propose une liste fermée et le typage l'impose.

### Cagnotte

`dmzPot: number` est ajouté à l'état, toujours présent (0 sans l'option) pour garder une forme
d'état unique. La fonction `charge` de `payments.ts` reçoit pour chaque paiement à la banque une
origine (`tax`, `card`, `quarantineFine`, `building`, `unmortgage`, `purchase`, `auction`) ; avec
l'option, seuls `tax` et `card` (cartes dont l'effet est un paiement à la banque) sont détournés vers
la cagnotte et produisent l'événement `potIncreased`. L'arrivée sur la DMZ verse la cagnotte
(`potCollected`) puis la remet à 0 ; une cagnotte vide ne produit aucun événement. Une faillite
envers la banque n'alimente pas la cagnotte : les biens retournent à la banque comme avant.

L'amende de sortie de quarantaine n'alimente pas la cagnotte : `docs/plateau.md` ne la cite pas, et
la garder hors cagnotte évite qu'une stratégie de quarantaine prolongée enrichisse la DMZ.

### Bonus double sur Boot

L'arrivée sur une case est résolue par une fonction unique ; pour la case Boot, elle verse un second
salaire de 200 Ᵽ quand l'option est active (événement `bootBonus`). Le salaire de passage, versé par
le déplacement, ne change pas. Toute arrivée finale sur Boot compte, y compris par les cartes
« Redémarrage à chaud » et « Réinitialisation d'usine ». Un envoi en quarantaine ne passe pas par
Boot et n'est pas concerné.

### Construction libre

La règle d'uniformité est une fonction `isEvenBuildAllowed(state, squareId, delta)`. Avec l'option,
elle renvoie toujours vrai ; les autres conditions (famille complète, aucun système en veille dans la
famille, stock, argent) restent vérifiées par leurs propres fonctions. Le passage au rootkit exige
toujours 4 backdoors sur le système concerné, mais plus sur les autres systèmes de la famille.

### Pas de loyer en quarantaine

Le calcul du loyer dû renvoie 0 avec le motif `ownerInQuarantine` quand l'option est active et que
le propriétaire est en quarantaine ; l'arrivée produit alors `rentWaived` au lieu d'un paiement.
Les taxes et les cartes ne sont pas concernées.

### Patrimoine et fins de partie

`netWorth(state, playerId)` (déjà dans `queries.ts`) = argent liquide + prix des systèmes, nœuds et
services actifs + valeur de veille de ceux en veille + coût d'achat des backdoors et rootkits
installés (un rootkit compte pour 5 constructions). La cagnotte n'appartient à personne et n'est pas
comptée.

`checkVictory(state)` de `turn.ts` devient une suite ordonnée de contrôles, évaluée en fin de tour
de joueur (action `endTurn`, ou passage au joueur suivant après une faillite) :

1. dernier joueur non failli → `winReason: 'lastStanding'` (vérifié aussi aussitôt après chaque
   faillite, comme avant) ;
2. objectif de patrimoine : si au moins un joueur non failli l'atteint, le plus gros patrimoine parmi
   eux gagne → `'netWorthTarget'` ;
3. limite de tours : si le tour qui se termine est le dernier du dernier tour de table
   (`turnNumber === turnLimit` et le joueur suivant ouvrirait un nouveau tour de table), le plus gros
   patrimoine gagne → `'turnLimit'`.

Départage, commun aux deux fins : patrimoine, puis argent liquide, puis ordre de jeu (le premier
dans l'ordre à partir du premier joueur de la partie). L'événement `gameEnded` porte le motif et le
classement complet (patrimoine de chaque joueur), pour l'écran de fin.

Le contrôle de l'objectif en fin de tour plutôt qu'à chaque action évite qu'un joueur gagne au
milieu d'un règlement de dette ou d'une enchère, et rend le moment de la victoire prévisible.

### Interface

- Création : une section « Options de règles » sous les réglages existants, avec quatre cases à
  cocher et deux listes (« Limite de tours : aucune, 20, 30, 40, 60 », « Objectif de patrimoine :
  aucun, 5 000 Ᵽ… »). Une courte phrase d'aide sous chaque option.
- HUD : une ligne de pastilles pour les options actives, avec info-bulle ; compteur « Tour 12 / 30 »
  quand la limite est active ; jauge de progression de chaque joueur vers l'objectif quand il est
  actif.
- Plateau : un compteur flottant au-dessus de la DMZ montrant la cagnotte (même composant que les
  compteurs existants du plateau), masqué sans l'option.
- Écran de fin : motif de victoire (« Dernier hacker solvable », « Limite de 30 tours atteinte »,
  « Objectif de 10 000 Ᵽ atteint ») et classement par patrimoine.

### IA

Les heuristiques des niveaux normal et difficile lisent les réglages ; le niveau facile ne change
pas. Les ajustements sont regroupés dans un module `src/ai/options.ts` qui expose des modificateurs
appliqués aux évaluations existantes (valeur d'un achat, seuil de réserve d'argent, choix de
construction, décision de sortie de quarantaine, évaluation d'un échange), plutôt que dispersés dans
chaque heuristique.

- **Fin proche** (limite de tours, à 3 tours de table ou moins de la fin) : l'IA évalue tout par le
  patrimoine immédiat. Elle ne réactive plus de système (perte de 10 %), ne revend plus de
  construction sans y être forcée (perte de 50 %), enchérit jusqu'au prix de la case (achat neutre
  en patrimoine) et accepte un échange seulement s'il augmente son patrimoine ou réduit celui du
  meneur.
- **Objectif de patrimoine** : quand un adversaire dépasse 80 % de l'objectif, l'IA difficile refuse
  tout échange qui l'enrichit et enchérit pour lui bloquer une famille ; l'IA normale refuse
  seulement les échanges qui lui complètent une famille.
- **Construction libre** : l'IA concentre ses constructions sur le système de la famille au meilleur
  gain de loyer par Ᵽ investi, au lieu de répartir.
- **Pas de loyer en quarantaine** : l'IA possédant des systèmes construits sort de quarantaine au
  plus vite (clé, puis amende) ; sinon elle garde son comportement habituel.
- **Cagnotte** : l'IA ne la compte pas dans ses projections (gain trop aléatoire), mais la prend en
  compte dans le patrimoine des adversaires quand elle vient d'être versée, comme tout argent.
- **Bonus double sur Boot** : aucune adaptation (effet aléatoire, faible).

## Risks / Trade-offs

- [Une option change le déroulé d'une partie sans option] → test de non-régression : partie
  complète entre IA avec une graine fixe, sans option, qui produit la même suite d'événements avant
  et après le change.
- [Cagnotte qui gonfle et déséquilibre la partie] → limitée aux taxes et aux cartes ; mesurable par
  le tournoi d'IA de `add-heuristic-ai` avec l'option active.
- [Partie qui se termine sur égalité parfaite] → départage par l'ordre de jeu, toujours déterminé.
- [Objectif atteint par plusieurs joueurs dans le même tour] → le plus gros patrimoine gagne, comme
  pour la limite de tours.
- [Sauvegardes antérieures illisibles] → `formatVersion` incrémentée, rejet propre déjà géré par
  `game-persistence`.

## Migration Plan

Sans objet : une sauvegarde antérieure est rejetée et signalée par `game-persistence`.
