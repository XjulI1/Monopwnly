# Design

## Context

Le moteur offre déjà les points de branchement nécessaires :

- les paiements dus passent par `charge` (`payments.ts`) et portent un motif (`Payment.reason` :
  `tax`, `card`, `quarantineFine`, `rent`…) ;
- l'arrivée sur une case est résolue par `resolveLanding` (`movement.ts`), coins (Boot, DMZ) et
  loyers compris ;
- la règle d'uniformité des constructions est écrite directement dans `buildProblem` et
  `sellProblem` (`development.ts`), sans fonction dédiée ;
- `checkVictory` (`turn.ts`) n'est appelée qu'après une faillite ;
- `turnNumber` compte les tours de table, mais à partir du premier joueur de la liste, alors que le
  premier joueur de la partie est tiré au sort (`setup.ts`) ;
- `netWorth` (`queries.ts`) existe et correspond déjà à la définition du patrimoine ; les
  statistiques de `add-save-and-journal` l'utilisent ;
- la sauvegarde sait migrer un format antérieur (`migrateSavedGame`, `savedGame.ts`, du format 1 au
  format 2 pour `add-trading`).

Motivation : proposal.md ; exigences : `specs/`.

## Goals / Non-Goals

**Goals :**

- Une partie sans option se joue exactement comme avant : mêmes événements, même résultat pour une
  même graine.
- Une seule définition du patrimoine, partagée par la victoire, l'interface, les statistiques et
  l'IA.
- Aucune partie en cours perdue à la mise à jour de l'application.

**Non-Goals :**

- Pas de système générique de « modificateurs de règles » : quatre options booléennes et deux fins
  de partie ne le justifient pas.

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
  netWorthTarget: 3000 | 4000 | 5000 | 6000 | null
}
```

Valeurs par défaut : booléens à `false`, `turnLimit` et `netWorthTarget` à `null`. La création
rejette une valeur hors liste avec le nouveau code `INVALID_SETTINGS` de `RuleErrorCode`. Des unions
littérales plutôt que des nombres libres : l'interface propose une liste fermée et le typage
l'impose.

### Cagnotte

`dmzPot: number` est ajouté à l'état, toujours présent (0 sans l'option) pour garder une forme
d'état unique.

`charge` n'a pas besoin de nouveau paramètre : avec l'option, un paiement adressé à la banque dont
le motif est `tax` ou `card` est versé à la cagnotte. Cette règle couvre exactement les deux taxes
et les sept cartes de `docs/plateau.md` (effets `pay` et `payPerBuilding`) ; « Conférence de
sécurité » paie les autres joueurs et n'est pas concernée, et les achats, enchères, constructions,
réactivations et l'amende de quarantaine ont d'autres motifs. Le paiement versé à la cagnotte émet
`potIncreased { playerId, amount, reason }` **à la place** de `paid` : un `paid` vers la banque
ferait écrire « payé à la banque » au journal et aux statistiques pour de l'argent qui n'y est pas
allé. Le journal et les statistiques traitent `potIncreased` comme le paiement qu'il remplace : une
taxe versée à la cagnotte reste comptée dans `taxesPaid`.

L'arrivée sur la DMZ, dans `resolveLanding`, verse la cagnotte au joueur (`potCollected { playerId,
amount }`) puis la remet à 0 ; une cagnotte vide ne produit aucun événement. Une faillite envers la
banque n'alimente pas la cagnotte (motif `bankruptcy`) : les biens retournent à la banque comme
avant.

L'amende de sortie de quarantaine n'alimente pas la cagnotte : `docs/plateau.md` ne la cite pas, et
la garder hors cagnotte évite qu'une stratégie de quarantaine prolongée enrichisse la DMZ.

L'invariant de conservation de l'argent de `fullGame.test.ts`, calculé sur les événements `paid`,
compte aussi `dmzPot`.

### Bonus double sur Boot

Le salaire est versé par `moveForward` dès que le chemin passe par la case 0, arrêt compris. Avec
l'option, l'arrivée sur Boot dans `resolveLanding` émet `bootBonus` puis verse un second salaire de
200 Ᵽ avec le motif `salary`, sur le modèle de `passedBoot` ; les statistiques le comptent comme un
salaire. « Redémarrage à chaud » et « Réinitialisation d'usine » avancent jusqu'à la case 0 et
rapportent donc 400 Ᵽ. Aucune carte ne fait reculer jusqu'à Boot (« Rollback » mène des cases
Exploit 2, 15 et 27 aux cases 39, 12 et 24, « Cache vidé » au Minitel) : un arrêt sur Boot rapporte
toujours 400 Ᵽ au total. Un envoi en quarantaine ne passe pas par Boot et n'est pas concerné.

### Construction libre

Les deux contrôles d'uniformité, dans `buildProblem` (construction) et `sellProblem` (revente), ne
s'appliquent que si `freeBuilding` est inactif. Les autres contrôles ne changent pas : famille
complète, aucun système en veille dans la famille, stock, argent. Un système ne passe au rootkit que
depuis le niveau 4 : les 4 backdoors sur le système concerné restent exigées sans code
supplémentaire. La mise en veille exige toujours une famille sans construction (`HAS_BUILDINGS`).
`buildableSquares` et `sellableSquares` dérivent de ces deux fonctions : l'interface et l'IA suivent
sans modification.

### Pas de loyer en quarantaine

Le contrôle se fait dans `resolveLanding`, avant le calcul du loyer : avec l'option, si le
propriétaire est en quarantaine, l'arrivée émet `rentWaived { playerId, ownerId, squareId }`, ne
produit aucun paiement et passe en `postRoll`. `rentFor` garde sa valeur nominale : les évaluations
de l'IA (`valuation.ts`, `strategy.ts`) l'utilisent et ne doivent pas voir les loyers d'un
adversaire tomber à 0 pendant sa quarantaine.

Les loyers imposés par une carte sont aussi concernés : « Tunnel chiffré » (double loyer d'un nœud)
et « Ping » (10 fois le total des dés pour un service). Pour « Ping », la quarantaine est vérifiée
avant le lancer, qui n'a pas lieu : la suite des tirages ne change qu'avec l'option active. Les
taxes et les paiements des cartes entre joueurs (« Conférence de sécurité ») ne sont pas concernés.

### Tours de table

Le compteur de tours avançait quand l'ordre de jeu repartait du premier joueur de la liste. Le
premier joueur étant tiré au sort, les joueurs placés avant lui dans la liste jouaient un tour de
moins dans le premier tour de table, ce qui fausserait la limite de tours. L'état reçoit
`firstPlayerIndex`, le rang du joueur tiré au sort à la création, et `advanceToNextPlayer` augmente
`turnNumber` quand le passage du joueur courant au joueur suivant atteint ou dépasse la place de ce
joueur dans l'ordre cyclique, qu'il soit en jeu ou failli. Avec `firstPlayerIndex` à 0, le comptage
est celui d'avant. Ce changement touche aussi les parties sans option : les numéros de tour
diffèrent quand le joueur tiré au sort n'est pas le premier de la liste.

### Patrimoine et fins de partie

`netWorth(state, playerId)` (`queries.ts`) ne change pas : argent liquide + prix des systèmes,
nœuds et services actifs + valeur de veille de ceux en veille + coût des backdoors et rootkits
installés (un rootkit compte pour 5 constructions). La cagnotte n'appartient à personne et n'est pas
comptée ; un joueur failli n'a plus ni argent ni case et vaut 0.

Une nouvelle requête `standings(state)` de `queries.ts` classe les joueurs non faillis par
patrimoine, puis argent liquide, puis ordre de jeu à partir de `firstPlayerIndex`. Elle désigne le vainqueur
d'une fin par limite ou par objectif et sert à l'écran de fin.

`checkVictory` devient une suite ordonnée de contrôles, appelée après chaque faillite et en fin de
tour (action `endTurn`, ou passage au joueur suivant après la faillite du joueur courant), **avant**
que `advanceToNextPlayer` ne fasse avancer `turnNumber` :

1. dernier joueur non failli → `winReason: 'lastStanding'` (vérifié aussitôt après chaque
   faillite, comme avant) ;
2. objectif de patrimoine : si au moins un joueur non failli l'atteint, le premier d'entre eux dans
   `standings` gagne → `'netWorthTarget'` ;
3. limite de tours : si `turnNumber === turnLimit` et que le joueur suivant ouvrirait un nouveau
   tour de table (même fonction que l'incrément de `advanceToNextPlayer`), le premier de
   `standings` gagne → `'turnLimit'`.

Le vainqueur va dans `winner`, le motif dans `winReason: 'lastStanding' | 'netWorthTarget' |
'turnLimit' | null`, et l'événement existant `gameWon` reçoit un champ `reason`. Pas de nouvel
événement de fin ni de classement dans l'événement : l'ordre des faillites est déjà connu des
statistiques (`Bankruptcy.rank`), dont l'écran de fin se sert aujourd'hui.

Le contrôle avant l'incrément couvre le cas où le dernier joueur du dernier tour de table fait
faillite pendant son tour : la partie se termine sans entamer le tour suivant.

Le contrôle de l'objectif en fin de tour plutôt qu'à chaque action évite qu'un joueur gagne au
milieu d'un règlement de dette ou d'une enchère, et rend le moment de la victoire prévisible.

### Interface

- Création : une section « Options de règles » sous les réglages existants, sur le modèle de la case
  « Enchères » de `CreateGameScreen.vue`, avec quatre cases à cocher et deux listes (« Limite de
  tours : aucune, 20, 30, 40, 60 », « Objectif de patrimoine : aucun, 5 000 Ᵽ… »). `toConfig`
  reçoit l'ensemble des réglages. Phrases d'aide :
  - Cagnotte de la DMZ : « Les taxes et les cartes qui font payer la banque remplissent une
    cagnotte, gagnée par le joueur qui s'arrête sur la DMZ. »
  - Bonus double sur Boot : « S'arrêter sur Boot rapporte 400 Ᵽ au lieu de 200 Ᵽ. »
  - Construction libre : « Plus besoin de construire ni de revendre de façon égale dans une
    famille. »
  - Pas de loyer en quarantaine : « Un joueur en quarantaine ne touche aucun loyer. »
  - Limite de tours : « À la fin du dernier tour de table, le plus gros patrimoine gagne. »
  - Objectif de patrimoine : « La partie s'arrête dès qu'un joueur atteint ce patrimoine à la fin
    d'un tour. »
- « Rejouer avec les mêmes paramètres » reprend les options sans travail dédié : `GameConfig`
  conserve déjà l'ensemble des réglages.
- HUD : une pastille par règle optionnelle active (les quatre booléens seulement), avec info-bulle ;
  « Tour 12 / 30 » dans la barre d'état quand la limite est active ; jauge de progression de chaque
  joueur non failli vers l'objectif quand il est actif ; montant de la cagnotte avec l'option.
- Plateau : le plateau n'a aucun compteur flottant aujourd'hui ; ses textes sont dessinés en
  textures (`labelTexture.ts`). Un nouveau composant 3D au-dessus de la DMZ affiche la cagnotte avec
  la même technique, lit l'état affiché de la file de présentation pour suivre le rythme des
  animations, joue une animation au versement et reste masqué sans l'option.
- Journal : quatre nouvelles entrées et une entrée de victoire complétée par le motif. Les entrées
  sont enregistrées sous forme de texte : celles des parties déjà sauvegardées restent valides.
- Écran de fin : motif de victoire (« Dernier hacker solvable », « Limite de 30 tours atteinte »,
  « Objectif de 5 000 Ᵽ atteint ») ; l'onglet « Résultat » classe le vainqueur, puis les autres
  joueurs non faillis dans l'ordre de `standings` avec leur patrimoine, puis les faillis de la
  faillite la plus récente à la plus ancienne.

### IA

Les ajustements des niveaux normal et difficile sont regroupés dans un module `src/ai/options.ts`
qui expose des modificateurs appliqués aux évaluations existantes (valeur d'un achat, enchère, choix
de construction, sortie de quarantaine, évaluation d'un échange), plutôt que dispersés dans chaque
heuristique.

- **Fin proche** : limite de tours active et `turnNumber > turnLimit - 3`, soit les tours 28, 29 et
  30 pour une limite de 30. L'IA évalue tout par le patrimoine immédiat : elle ne réactive plus de
  système (perte de 10 %), ne revend plus de construction sans y être forcée par une dette (perte de
  50 %), enchérit jusqu'au prix de la case (achat neutre en patrimoine) et n'accepte un échange que
  s'il augmente strictement son patrimoine.
- **Objectif de patrimoine** : quand un adversaire atteint 80 % de l'objectif, l'IA difficile refuse
  tout échange qui l'enrichit et surenchérit pour l'empêcher de compléter une famille ; l'IA normale
  refuse seulement les échanges qui lui complètent une famille. La surenchère de blocage prime sur le
  plafond de la fin proche et s'arrête à la réserve d'argent de l'IA, comme les enchères actuelles
  (`strategy.ts`).
- **Construction libre** : les niveaux normal et difficile choisissent déjà leurs constructions
  parmi les constructions permises, par gain de loyer espéré par Ᵽ investi (`bestBuildsFirst`,
  `buildGainPerCoin` ; `buildOrder` du niveau difficile regroupe par famille puis applique
  `bestBuildsFirst`). Avec l'option, ils se concentrent d'eux-mêmes sur le meilleur système : des
  tests suffisent. Le niveau facile prend la première construction permise dans l'ordre du plateau
  (`easy.ts`) et empilerait tout sur le premier système : avec l'option, ses candidats sont réduits
  aux systèmes les moins construits de leur famille, pour garder la répartition uniforme. Le tournoi
  a montré qu'avec toutes les options cumulées l'IA difficile tombait à 42-44 % des victoires
  (53 % sans option), la paire construction libre et pas de loyer en quarantaine pesant le plus.
  Deux ajustements du niveau difficile, actifs avec la construction libre seulement, la ramènent à
  53 % avec toutes les options et 49 % avec une limite de 30 tours (360 parties, graines distinctes
  de celles du réglage) : `squareValue` n'ajoute plus l'ajustement de rendement, calculé pour des
  familles construites uniformément à 3 backdoors, et la réserve pèse le risque de loyer à
  `FREE_BUILDING_HARD_PRUDENCE` (1,6) au lieu de 0,8, les loyers se concentrant sur quelques
  systèmes. Ils sont dans `valuation.ts`, que `options.ts` importe déjà.
- **Pas de loyer en quarantaine** : l'IA sort au début de son tour (clé, puis amende si son argent
  le permet) quand la somme des `expectedRent` de ses cases, loyer espéré sur un tour de jeu des
  adversaires (`valuation.ts`), dépasse `QUARANTINE_FINE` ; sinon elle garde son comportement
  habituel.
- **Cagnotte** : l'IA ne la compte pas dans ses projections (gain trop aléatoire) ; la cagnotte
  remportée par un joueur devient de l'argent liquide ordinaire.
- **Bonus double sur Boot** : aucune adaptation (effet aléatoire, faible).

Les IA n'utilisent aucun hasard : le test de non-régression couvre aussi leurs décisions sans
option.

### Sauvegarde

`SAVE_FORMAT_VERSION` passe de 2 à 3 dans `savedGame.ts`. `migrateSavedGame` enchaîne les
migrations du format 1 au format 2, puis du format 2 au format 3, qui ajoute :

- dans `engineState.settings` et `creation.settings` : les quatre booléens à `false`, `turnLimit`
  et `netWorthTarget` à `null` ;
- `dmzPot` à 0 ;
- `winReason` à `'lastStanding'` si `winner` est renseigné, sinon `null` ;
- `firstPlayerIndex` à 0, qui conserve le comptage des tours de la partie sauvegardée.

Les statistiques ne changent pas de forme et le journal est enregistré en texte : rien d'autre à
migrer. Les gardes de type vérifient `dmzPot`, les nouveaux réglages et `winReason`.

## Risks / Trade-offs

- [Une option change le déroulé d'une partie sans option] → test de non-régression écrit avant
  toute modification : partie complète entre les trois niveaux d'IA avec une graine fixe, sans
  option, enregistrée dans un fichier d'instantané et comparée après retrait des seuls champs
  ajoutés par ce change (`dmzPot`, nouveaux réglages, `winReason`, `firstPlayerIndex`, motif de
  `gameWon`). Le nouveau comptage des tours est le seul changement voulu des parties sans option :
  l'instantané est repris une fois, après avoir vérifié que seuls les numéros de tour diffèrent.
- [Cagnotte qui gonfle et déséquilibre la partie] → limitée aux taxes et aux cartes ; mesurée par
  le tournoi d'équilibrage avec l'option active.
- [Objectif de patrimoine trop long à atteindre] → mesuré par le tournoi (200 parties à 4 IA
  normales, sans limite de tours, 42 tours de table en médiane sans objectif) : 10 000 et 15 000 Ᵽ
  ne terminaient que 11 % et 2 % des parties, les autres finissant par une faillite. Les valeurs
  retenues, 3 000, 4 000, 5 000 et 6 000 Ᵽ, donnent des parties de 18, 23, 28 et 31 tours de table
  en médiane, terminées par l'objectif dans 97 à 100 % des cas.
- [Partie qui se termine sur égalité parfaite] → départage par l'ordre de jeu, toujours déterminé.
- [Objectif atteint par plusieurs joueurs dans le même tour] → le plus gros patrimoine gagne, comme
  pour la limite de tours.
- [Partie en cours perdue à la mise à jour] → migration des formats 1 et 2 au chargement.

## Migration Plan

Les sauvegardes des formats 1 et 2 sont migrées au chargement vers le format 3 (voir « Sauvegarde »).
Aucune autre donnée n'est persistée.
