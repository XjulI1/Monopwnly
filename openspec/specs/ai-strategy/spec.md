# ai-strategy Specification

## Purpose
Décrire les comportements observables des trois niveaux d'IA sur chaque décision du jeu (achat,
enchère, construction, dettes, quarantaine), et l'écart de force attendu entre eux.

## Requirements

### Requirement: Réserve de sécurité

Une IA SHALL calculer une réserve de sécurité égale au loyer qu'elle risque de payer au prochain
tour, d'après les cases adverses à portée de dés et leur fréquence d'arrivée, multipliée par un
facteur de prudence propre à son niveau. Hors exceptions décrites ci-dessous, une IA SHALL NOT
dépenser son argent en dessous de cette réserve. Le niveau facile SHALL utiliser une réserve fixe
de 100 Ᵽ.

#### Scenario: Réserve face à un rootkit

- **WHEN** un adversaire possède un rootkit sur le Noyau de l'IA, situé à 6 cases devant une IA normale
- **THEN** la réserve de cette IA est supérieure à sa réserve sans ce rootkit

#### Scenario: Réserve du niveau facile

- **WHEN** une IA facile a 150 Ᵽ et peut construire une backdoor à 100 Ᵽ
- **THEN** elle ne construit pas

### Requirement: Achat d'une case libre

En décision d'achat, une IA SHALL suivre la règle de son niveau :

- le niveau facile SHALL acheter si son argent après achat reste au moins égal à sa réserve ;
- le niveau normal SHALL acheter dans les mêmes conditions, sauf un système d'une famille dont un
  adversaire possède déjà un système, qu'il laisse aux enchères, et SHALL acheter même en entamant
  sa réserve une case qui lui complète une famille ;
- le niveau difficile SHALL, en plus, acheter en entamant sa réserve une case qui empêche un
  adversaire de compléter une famille, et SHALL refuser une case de faible rendement espéré quand
  les enchères sont activées et que son argent est inférieur à celui de chaque adversaire, pour la
  récupérer à moindre prix.

Une IA SHALL NOT acheter une case dont le prix dépasse son argent.

#### Scenario: Achat qui complète une famille

- **WHEN** une IA normale, possédant Minitel, s'arrête sur Modem 56k avec 80 Ᵽ et une réserve de 100 Ᵽ
- **THEN** elle achète Modem 56k

#### Scenario: Famille entamée par un adversaire

- **WHEN** une IA normale riche s'arrête sur Messagerie pro alors qu'un adversaire possède Intranet
- **THEN** elle refuse l'achat

#### Scenario: Refus faute de réserve

- **WHEN** une IA facile s'arrête sur Intranet (160 Ᵽ) avec 200 Ᵽ
- **THEN** elle refuse l'achat

#### Scenario: Blocage d'une famille adverse

- **WHEN** un adversaire possède Forum et Blog et qu'une IA difficile s'arrête sur Boutique en ligne en entamant sa réserve
- **THEN** elle achète Boutique en ligne

### Requirement: Enchère jusqu'à une valeur estimée

En enchère, une IA SHALL estimer la valeur de la case pour elle, miser la plus petite mise valide si
elle est inférieure ou égale à cette valeur et à son argent au-dessus de sa réserve, et passer sinon.
L'estimation SHALL être :

- facile : le prix de la case, réduit de 20 % ;
- normal : le prix, augmenté d'une prime si la case complète ou approche une de ses familles, et
  diminué d'une décote si un adversaire possède déjà un système de sa famille ;
- difficile : la valeur normale, augmentée d'une prime si la case bloque une famille adverse et
  ajustée par le rendement espéré de la case.

La plus petite mise valide SHALL être de 10 Ᵽ au-dessus de la mise la plus haute (10 Ᵽ pour la
première mise).

#### Scenario: Mise sous la valeur

- **WHEN** une IA facile doit miser sur Forum (180 Ᵽ) avec une mise la plus haute de 120 Ᵽ et 1 000 Ᵽ en poche
- **THEN** elle mise 130 Ᵽ

#### Scenario: Passe au-dessus de la valeur

- **WHEN** une IA facile doit miser sur Forum avec une mise la plus haute de 150 Ᵽ
- **THEN** elle passe

#### Scenario: Prime de famille

- **WHEN** une IA normale possédant Minitel et une IA normale ne possédant aucune case de Rétro enchérissent pour Modem 56k
- **THEN** la première mise plus haut que la seconde avant de passer

### Requirement: Construction

Pendant son tour, avant ou après le lancer, une IA SHALL construire sur ses familles complètes, une
backdoor à la fois, tant que son argent après construction reste au-dessus de sa réserve. Le niveau
facile SHALL construire sur la première famille complète dans l'ordre du plateau ; les niveaux normal
et difficile SHALL privilégier la famille dont la backdoor suivante apporte le plus de loyer espéré
par PwnCoin investi. Le niveau difficile SHALL viser trois backdoors par système avant de passer à
une autre famille, SHALL construire de préférence quand le stock de backdoors de la banque est
bas, pour en priver ses adversaires, et SHALL mettre en veille une case hors famille complète
quand cela lui permet de financer la backdoor suivante au-dessus de sa réserve. Une IA normale ou difficile SHALL réactiver une case en veille
d'une famille complète avant d'y construire, si sa réserve le permet.

#### Scenario: Construction au-dessus de la réserve

- **WHEN** une IA normale possède la famille Web complète, 1 000 Ᵽ et une réserve de 300 Ᵽ
- **THEN** elle construit une backdoor à la fois, uniformément, jusqu'à ce que la suivante la fasse passer sous 300 Ᵽ

#### Scenario: Mise en veille pour construire

- **WHEN** une IA difficile possède la famille Rétro complète, le Satellite et 60 Ᵽ
- **THEN** elle met le Satellite en veille pour pouvoir construire sur Rétro

#### Scenario: Pas de construction sous la réserve

- **WHEN** une IA difficile possède une famille complète et que son argent est inférieur à sa réserve plus le coût d'une backdoor
- **THEN** elle ne construit pas

### Requirement: Règlement des dettes

En règlement de dette, une IA SHALL payer dès que le premier paiement restant est couvert. Sinon,
elle SHALL lever des fonds dans cet ordre : revente des backdoors, puis, aux niveaux normal et
difficile, proposition de vente d'une case hors famille complète (voir `trade-ai`), puis mise en
veille des cases hors famille complète, puis mise en veille des familles complètes sans
construction. Les niveaux normal
et difficile SHALL, dans chaque étape, sacrifier d'abord ce qui rapporte le moins de loyer espéré ;
le niveau facile SHALL suivre l'ordre du plateau. Une IA SHALL déclarer faillite seulement quand son
patrimoine disponible ne couvre pas le premier paiement restant.

#### Scenario: Mise en veille plutôt que faillite

- **WHEN** une IA doit 250 Ᵽ, a 100 Ᵽ en poche et possède Forum et Nœud Tor sans famille complète
- **THEN** elle met en veille au moins une de ces cases puis paie, sans déclarer faillite

#### Scenario: Ordre de sacrifice

- **WHEN** une IA difficile doit lever 25 Ᵽ et possède Minitel et Satellite, hors famille complète
- **THEN** elle met en veille la case au plus faible loyer espéré et conserve l'autre active

#### Scenario: Faillite inévitable

- **WHEN** une IA doit 2 000 Ᵽ et que son patrimoine disponible est de 800 Ᵽ
- **THEN** elle déclare faillite

### Requirement: Sortie de quarantaine

Au début de son tour en quarantaine, une IA SHALL suivre la règle de son niveau :

- le niveau facile SHALL toujours tenter un double ;
- les niveaux normal et difficile SHALL utiliser une Clé de déchiffrement ou payer l'amende en début
  de partie, tant qu'il reste au moins 8 cases achetables libres, et tenter un double sinon ;
- le niveau difficile SHALL aussi tenter un double, même en début de partie, si le loyer espéré des
  cases adverses dans les 12 cases suivantes dépasse 3 fois l'amende.

Une IA SHALL préférer une Clé à l'amende quand elle en détient une.

#### Scenario: Sortie rapide en début de partie

- **WHEN** une IA normale commence son tour en quarantaine avec 20 cases achetables libres et une Clé de déchiffrement
- **THEN** elle utilise la Clé

#### Scenario: Rester en fin de partie

- **WHEN** une IA normale commence son tour en quarantaine et qu'il ne reste aucune case achetable libre
- **THEN** elle tente un double

### Requirement: Écart de force entre niveaux

Les niveaux SHALL se distinguer en force : dans un tournoi à trois joueurs facile, normal et difficile, joué sur des graines fixées avec chaque
ordre de jeu à parts égales, le nombre de victoires SHALL être strictement croissant du facile au
difficile, et le niveau difficile SHALL gagner au moins 45 % des parties terminées.

#### Scenario: Tournoi de force

- **WHEN** on joue 180 parties facile / normal / difficile, échanges compris, avec les six ordres de jeu à parts égales
- **THEN** les victoires sont strictement croissantes par niveau et le difficile en remporte au moins 45 % des parties terminées

### Requirement: Abandon d'une partie perdue

Au début de son tour, en phase `preRoll`, une IA de tout niveau SHALL abandonner
(`declareBankruptcy`, voir `debt-and-bankruptcy`) quand sa partie est perdue, et seulement dans ce
cas. Sa partie SHALL être considérée comme perdue quand les deux conditions suivantes sont réunies :

- son patrimoine (voir `game-end-conditions`) vaut au plus 15 % de celui de l'adversaire non failli
  le plus riche ;
- sa perte espérée par tour de table est positive, et son patrimoine mobilisable (voir
  `debt-and-bankruptcy`) est inférieur à cinq fois cette perte.

La perte espérée par tour de table SHALL valoir le loyer qu'elle s'attend à payer sur un lancer
(pour chaque case active d'un adversaire, la chance moyenne de s'y arrêter multipliée par son loyer),
moins le loyer qu'elle s'attend à encaisser sur ses propres cases actives pendant un tour de table de
tous ses adversaires, moins la part du salaire de Boot gagnée en moyenne par lancer. Une IA SHALL NOT
abandonner en dehors de la phase `preRoll` : ni après son lancer, ni pendant un règlement de dette,
une enchère ou une offre d'échange.

#### Scenario: Partie perdue

- **WHEN** à 2 joueurs une IA normale commence son tour avec 20 Ᵽ et le seul Minitel, face à un adversaire qui a 500 Ᵽ et un rootkit sur chacun des trois systèmes de la famille Finance
- **THEN** elle déclare faillite

#### Scenario: Tous les niveaux

- **WHEN** une IA facile, puis une IA difficile, commence son tour dans la situation du scénario « Partie perdue »
- **THEN** chacune déclare faillite

#### Scenario: Distancée mais sans danger

- **WHEN** à 2 joueurs une IA normale commence son tour avec 200 Ᵽ et aucune case, face à un adversaire qui a 2 500 Ᵽ et la famille Finance complète sans construction
- **THEN** elle lance les dés, car le salaire de Boot couvre les loyers qu'elle s'attend à payer

#### Scenario: En danger mais pas distancée

- **WHEN** une IA commence son tour avec un patrimoine égal au sixième de celui de son adversaire le plus riche, alors que sa perte espérée par tour de table viderait son patrimoine mobilisable en moins de cinq tours de table
- **THEN** elle n'abandonne pas

#### Scenario: Meneur parmi plusieurs adversaires

- **WHEN** à 4 joueurs une IA dont la perte espérée viderait son patrimoine mobilisable en moins de cinq tours de table a un patrimoine égal au septième de celui du meneur et à la moitié de celui des deux autres adversaires
- **THEN** elle déclare faillite

#### Scenario: Pas d'abandon après le lancer

- **WHEN** une IA dans la situation du scénario « Partie perdue » est en `postRoll` sans double à rejouer
- **THEN** elle termine son tour

#### Scenario: Pas d'abandon pendant une dette

- **WHEN** une IA dans la situation du scénario « Partie perdue » doit un loyer de 40 Ᵽ avec 20 Ᵽ en poche
- **THEN** elle met en veille le Minitel puis paie, sans déclarer faillite
