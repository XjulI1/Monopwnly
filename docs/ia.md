# IA de Monopwnly

L'IA joue les adversaires contrôlés par l'ordinateur, en trois niveaux : facile, normal et
difficile. Elle vit dans `src/ai/`, sans dépendance à Vue ni à Three.js, et passe par le même point
d'entrée que les humains : elle choisit une action, la session la soumet au moteur avec
`applyAction`, et le moteur la valide comme n'importe quelle autre.

## Principes

- **Pas de triche.** L'IA ne reçoit qu'une vue publique de la partie (voir plus bas). L'ordre des
  paquets Exploit et Patch et l'état du générateur aléatoire ne lui sont jamais transmis, et elle
  ne consomme jamais le générateur de la partie.
- **Décisions déterministes.** `chooseAction(vue, joueur, niveau)` est une fonction pure : la même
  vue donne toujours la même action. Les égalités se départagent dans l'ordre du plateau. Deux
  parties jouées avec la même graine sont identiques.
- **Une action à la fois.** La gestion (construire, revendre, mettre en veille, réactiver) se fait
  action par action ; la boucle redemande une décision jusqu'à ce que l'IA lance les dés ou
  termine son tour. Garde-fou : 40 actions de gestion d'affilée au plus.
- **Qui doit agir.** La requête `expectedActor` du moteur désigne le joueur courant, l'enchérisseur
  attendu pendant une enchère ou le débiteur pendant une dette. Une IA peut donc miser ou régler
  une dette hors de son tour.

## Vue joueur

`playerView(état)` copie l'état public : argent, positions, propriétaires, constructions, mises en
veille, Clés détenues, phase, réglages, numéro de tour. Les paquets sont réduits à leur taille et
le générateur disparaît. Le type `PlayerView` ne contient pas ces champs : y accéder depuis l'IA est
une erreur de typage. Les requêtes du moteur dont l'IA se sert (loyer d'une case, constructions
possibles, patrimoine disponible) acceptent ce type public.

## Fréquences d'arrivée

`landingOdds()` calcule une fois, à partir des seules données du plateau, la part des lancers qui
laissent un pion sur chaque case : chaîne de Markov sur la position, le nombre de doubles d'affilée
et les tentatives en quarantaine, avec les cartes de déplacement et Détecté !. La Quarantaine
arrive en tête (11,6 %, en comptant les tours passés à tenter un double), Détecté ! vaut 0 et les
cases Exploit, dont la plupart des cartes déplacent le pion, sont les moins fréquentes (0,8 à 1 %).

Le loyer espéré d'une case vaut sa fréquence × son loyer × le nombre d'adversaires.

## Valeur d'une case

`squareValue` estime en PwnCoins ce que vaut une case pour un joueur :

| Niveau | Valeur |
|---|---|
| Facile | le prix |
| Normal | le prix, + 75 % s'il complète une famille, + 25 % s'il entame une famille que personne d'autre n'a commencée, − 15 % si un adversaire possède déjà un système de la famille |
| Difficile | la valeur normale, + 50 % si la case empêche un adversaire de compléter une famille, ajustée par le rendement espéré sur le reste de la partie (entre − 10 % et + 50 % du prix) |

La décote d'une famille entamée par un adversaire est essentielle tant qu'il n'y a pas d'échanges :
une telle case ne peut pas être complétée. Les IA normales et difficiles la laissent aux enchères,
où celui qui a commencé la famille la remporte. Sans cette règle, les familles s'éparpillaient et
la plupart des parties n'avaient pas de vainqueur après 300 tours.

## Réserve de sécurité

Une IA ne dépense (achat, mise, construction, réactivation) que l'argent au-dessus de sa réserve,
sauf exception de son niveau :

- facile : 100 Ᵽ, quoi qu'il arrive ;
- normal et difficile : 50 Ᵽ, plus un facteur de prudence (1 au normal, 0,8 au difficile) appliqué
  au loyer espéré des cases adverses à portée de dés (2 à 12 cases), augmenté de la moitié du pire
  de ces loyers.

## Comportement de chaque niveau

| Décision | Facile | Normal | Difficile |
|---|---|---|---|
| Achat | si la réserve reste intacte | idem, sauf une case d'une famille entamée par un adversaire ; achète en entamant la réserve une case qui complète une famille | comme le normal, et achète en entamant la réserve une case qui bloque une famille adverse ; refuse une case de faible rendement quand les enchères sont activées et qu'il est plus pauvre que chaque adversaire |
| Enchère | mise 10 Ᵽ au-dessus de la meilleure mise tant qu'elle reste sous 80 % du prix et au-dessus de la réserve | jusqu'à sa valeur | jusqu'à sa valeur |
| Construction | sur la première famille complète, dans l'ordre du plateau | sur la famille où la backdoor suivante rapporte le plus de loyer espéré par PwnCoin ; réactive d'abord une case en veille de la famille | trois backdoors par système avant d'attaquer une autre famille ; construit plus volontiers quand le stock de la banque est bas ; met en veille une case isolée pour financer une backdoor |
| Réactivation | jamais | les familles complètes, puis les autres cases s'il reste 300 Ᵽ au-dessus de la réserve | idem |
| Dette | revend les backdoors, puis met en veille les cases hors famille complète, puis les familles complètes, dans l'ordre du plateau ; faillite seulement si le patrimoine ne couvre pas le paiement | même ordre, en sacrifiant d'abord ce qui rapporte le moins de loyer espéré | idem |
| Quarantaine | tente toujours un double | sort tout de suite (Clé de préférence, sinon amende) tant qu'il reste au moins 8 cases à vendre, tente un double ensuite | idem, mais reste en quarantaine si le loyer espéré des 12 cases suivantes dépasse 3 fois l'amende |

Tous les seuils sont regroupés dans `src/ai/constants.ts`.

## Dans l'application

Les décisions sont calculées dans un Web Worker (`src/ai/worker.ts`) pour ne jamais figer les
animations. La session de jeu attend la fin de la présentation de l'action précédente, demande la
décision, attend une courte pause qui dépend de la vitesse (600 ms en normale, 250 ms en rapide,
aucune en instantanée), puis soumet l'action. Pendant ce temps, le panneau indique
« <nom> réfléchit… » et ne propose aucune commande de jeu. Une carte tirée par une IA se ferme
seule après 2,4 s (1,4 s en rapide) ; celle d'un humain attend son toucher. Quitter la partie
annule la décision en cours et tous les délais.

## Tournois

`runTournament` joue des parties entre IA sans interface, avec une limite de sécurité de 300 tours
de table (une partie qui l'atteint est comptée comme interrompue). Il mesure la durée des parties,
les victoires par place et par niveau, et le rendement de chaque famille.

- **Force des niveaux** (`src/ai/tournament/strength.test.ts`, dans `pnpm test`) : 60 parties
  facile, normal et difficile, les six ordres de jeu à parts égales. Les victoires doivent être
  strictement croissantes et le difficile doit remporter au moins 45 % des parties terminées.
- **Équilibrage du plateau** (`pnpm test:balance`) : 400 parties entre 4 IA normales, enchères
  activées. Critères et réajustement des loyers : voir [docs/plateau.md](plateau.md#équilibrage).

Derniers résultats (3 novembre 2026) :

| Tournoi | Parties terminées | Facile | Normal | Difficile |
|---|---|---|---|---|
| Force, 60 parties | 49 | 12,2 % | 18,4 % | 69,4 % |
| Force, 600 parties | 487 | 9,2 % | 23,8 % | 66,9 % |

| Équilibrage, 400 parties | Mesure |
|---|---|
| Parties interrompues | 0,5 % |
| Durée médiane (90e centile) | 41 tours de table (69) |
| Victoires de la 1re à la 4e place | 27,9 %, 24,1 %, 23,6 %, 24,4 % |
| Écart de rendement entre familles | 2,7 |

Dans les parties à trois niveaux, environ une partie sur cinq atteint la limite de 300 tours :
l'IA facile achète tout ce qu'elle peut et bloque des familles que personne ne peut plus compléter
sans échange. Les échanges (`add-trading`) devraient faire baisser cette part.
