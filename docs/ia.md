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
| Offre reçue | accepte si les prix reçus valent au moins les prix donnés | accepte si le gain atteint 10 % de la valeur échangée, danger compris | accepte si le gain atteint 20 % de la valeur échangée, danger et pénalité de tête compris |
| Propositions | jamais | achète la case qui lui manque pour compléter une famille ; en dette, vend une case isolée | idem, plus les échanges croisés où chacun complète une famille |

Tous les seuils sont regroupés dans `src/ai/constants.ts`.

## Échanges

Le moteur valide chaque offre à la proposition et de nouveau à l'acceptation, puis transfère tout en
une fois. Le joueur dont c'est le tour propose avant ou après son lancer ; un débiteur propose pendant
son règlement de dette, même hors de son tour. Trois propositions au plus par tour et par joueur, et
une offre refusée ne peut pas être refaite à l'identique dans le même tour. Le destinataire d'une
offre peut aussi y répondre une fois par une contre-proposition, que l'auteur accepte ou refuse sans
pouvoir contre-proposer à son tour ; elle ne compte pas dans ses propositions, et l'offre à laquelle
elle répond compte comme refusée. Le moteur garde aussi,
pour toute la partie, le nombre de refus essuyés par chaque joueur pour chaque case demandée :
l'information est publique (elle figure dans le journal) et sert à l'IA pour monter ses prix d'un
tour à l'autre.

### Évaluer une offre

`evaluateOffer` calcule le gain du destinataire en PwnCoins :

> gain = valeur des cases et Clés reçues − valeur de celles données + argent reçu − argent donné
> − danger − pénalité

- **Valeur** : celle de `squareValue` au niveau de l'IA. Les cases reçues sont évaluées sur l'état
  après l'échange, pour que la prime de famille complète ne compte que si l'échange complète
  vraiment la famille. Une Clé vaut 50 Ᵽ, l'amende qu'elle évite.
- **Danger** (normal et difficile) : pour chaque famille que l'échange complète chez l'auteur de
  l'offre, son loyer espéré sur 3 tours de table, avec trois backdoors par système au normal, et au
  niveau que l'auteur peut se payer avec son argent après l'échange au difficile.
- **Pénalité** (difficile) : si l'échange fait passer l'auteur en tête du patrimoine, l'avance qu'il
  prend.

L'IA accepte quand le gain atteint une part de la valeur échangée : 0 % au facile (qui ne compte
que les prix, sans prime ni danger), 10 % au normal, 20 % au difficile.

### Proposer

- **Achat de la case manquante** (normal et difficile) : quand il ne manque qu'une case pour
  compléter une famille et qu'un adversaire la détient, l'IA la lui propose contre son prix, puis
  150 %, puis 200 % au fil des refus de ce même détenteur (un tour à chaque fois), et abandonne
  après trois refus. Elle ne dépense que l'argent au-dessus de sa réserve.
- **Échange croisé** (difficile) : quand l'IA et un adversaire peuvent chacun compléter une famille
  en échangeant une case, et que la famille obtenue rapporte plus de loyer espéré que celle cédée,
  l'IA ajoute le moins d'argent possible pour que l'adversaire accepte selon sa propre évaluation
  (celle du normal pour un humain). Elle garde de quoi poser une backdoor sur chaque système de sa
  nouvelle famille et ne paie jamais plus que son surcroît de loyer espéré sur le reste de la partie.
- **Vente pour éviter la faillite** (normal et difficile) : en dette, après avoir revendu ses
  constructions et avant de mettre en veille, l'IA propose sa case isolée au plus faible loyer
  espéré contre 1,5 fois sa valeur de veille au joueur le plus riche qui n'est pas son créancier.

Une IA propose au plus une offre par destinataire et par tour, et jamais une offre déjà refusée.

### Contre-proposer

Au lieu de refuser une offre qu'elle n'accepte pas telle quelle, une IA normale ou difficile cherche
par dichotomie le plus petit complément de PwnCoins, par pas de 10 Ᵽ, qui la lui ferait accepter,
options de partie comprises : l'auteur paie davantage, ou l'IA paie moins quand l'offre lui
demandait de l'argent. Les cases et les Clés ne changent pas. Elle ne contre-propose que si ce
complément ne dépasse pas la moitié de la valeur totale échangée dans l'offre
(`COUNTER_MAX_SHARE`), et si l'auteur peut payer le montant qui en résulte ; sinon elle refuse.
Pour Satellite isolé, une offre de 300 Ᵽ reçoit ainsi une contre-proposition à 370 Ᵽ de l'IA
normale et à 410 Ᵽ de la difficile ; une offre de 50 Ᵽ est refusée. L'IA facile ne contre-propose
jamais.

### Répondre à une contre-proposition

L'IA qui reçoit une contre-proposition l'accepte si elle l'accepterait comme une offre reçue et si
l'argent qu'elle y donne lui laisse sa réserve ; la difficile garde en plus de quoi poser une
backdoor sur chaque système de la famille que l'échange lui complète, comme pour ses échanges
croisés. Pendant son propre règlement de dette, elle accepte la contre-proposition à sa vente dès que
le prix atteint la valeur de veille de la case : elle n'obtiendrait pas plus en la mettant en veille.
Une offre d'achat qui a reçu une contre-proposition compte comme un refus pour la montée de son prix
au tour suivant.

## Dans l'application

Les décisions sont calculées dans un Web Worker (`src/ai/worker.ts`) pour ne jamais figer les
animations. La session de jeu attend la fin de la présentation de l'action précédente, demande la
décision, attend une courte pause qui dépend de la vitesse (600 ms en normale, 250 ms en rapide,
aucune en instantanée), puis soumet l'action. Pendant ce temps, le panneau indique
« <nom> réfléchit… » (« <nom> étudie votre offre… » quand elle répond à l'offre d'un humain, qui
reçoit ensuite « <nom> accepte votre offre », « <nom> refuse votre offre » ou la fenêtre de sa
contre-proposition ; « <nom> étudie votre contre-proposition… » quand elle répond à celle d'un
humain) et ne propose aucune commande de jeu. Une carte tirée par une IA se ferme
seule après 2,4 s (1,4 s en rapide) ; celle d'un humain attend son toucher. Quitter la partie
annule la décision en cours et tous les délais.

## Tournois

`runTournament` joue des parties entre IA sans interface, échanges compris, avec une limite de
sécurité de 300 tours de table (une partie qui l'atteint est comptée comme interrompue). Il mesure
la durée des parties, les victoires par place et par niveau, le rendement de chaque famille, le
nombre d'échanges proposés et acceptés, et le nombre de contre-propositions faites et acceptées.

- **Force des niveaux** (`src/ai/tournament/strength.test.ts`, dans `pnpm test`) : 180 parties
  facile, normal et difficile, les six ordres de jeu à parts égales. Les victoires doivent être
  strictement croissantes et le difficile doit remporter au moins 45 % des parties terminées. Les
  échanges ajoutent de la variance : sur les 60 parties d'avant, la normale passait parfois devant
  la difficile par le seul hasard des graines.
- **Équilibrage du plateau** (`pnpm test:balance`) : 400 parties entre 4 IA normales, enchères et
  échanges activés. Il doit y avoir des échanges acceptés et des contre-propositions. Critères et
  réajustement des loyers :
  voir [docs/plateau.md](plateau.md#équilibrage).

Derniers résultats (4 novembre 2026, avec les contre-propositions) :

| Tournoi | Parties terminées | Facile | Normal | Difficile | Échanges acceptés par partie | Contre-propositions faites (acceptées) |
|---|---|---|---|---|---|---|
| Force, 180 parties | 180 | 12,8 % | 37,8 % | 49,4 % | 3,5 | 219 (20) |
| Force, 600 parties | 599 | 12,9 % | 33,7 % | 53,4 % | 3,5 | 810 (65) |

| Équilibrage, 400 parties | Mesure |
|---|---|
| Parties interrompues | 0,5 % |
| Durée médiane (90e centile) | 41 tours de table (66) |
| Victoires de la 1re à la 4e place | 26,6 %, 24,9 %, 25,9 %, 22,6 % |
| Écart de rendement entre familles | 2,96 |
| Échanges acceptés par partie | 4,7 |
| Contre-propositions faites (acceptées) | 1 961 (1 026) |

Avant les échanges, environ une partie sur cinq à trois niveaux atteignait la limite de 300 tours :
l'IA facile bloquait des familles que personne ne pouvait plus compléter. Les échanges ont fait
disparaître ces parties interminables. Ils resserrent en revanche l'écart entre le normal et le
difficile, qui complètent tous deux leurs familles en rachetant à l'IA facile la case qui leur
manque.

Les contre-propositions laissent la force des niveaux presque inchangée : entre niveaux différents,
une sur dix environ est acceptée. Entre IA normales, une sur deux l'est, et le nombre d'échanges
conclus par partie double (de 2,0 à 4,7). L'écart de rendement entre familles monte en conséquence
de 2,5 à 2,96, juste sous la limite de 3 (voir [docs/plateau.md](plateau.md#équilibrage)).
