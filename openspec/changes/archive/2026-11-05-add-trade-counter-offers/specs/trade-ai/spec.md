## ADDED Requirements

### Requirement: Contre-proposition de l'IA

Une IA normale ou difficile qui n'accepte pas une offre de départ SHALL chercher le plus petit
complément de PwnCoins en sa faveur, multiple de 10 Ᵽ, qui la lui ferait accepter selon sa propre
évaluation, options de partie comprises : l'auteur paie davantage, ou l'IA paie moins quand l'offre
lui demandait de l'argent. Si ce complément existe, ne dépasse pas la moitié de la valeur totale
échangée dans l'offre de départ selon son évaluation, et laisse à l'auteur de quoi payer le montant
qui en résulte, elle SHALL répondre par une contre-proposition qui reprend l'offre à l'identique
pour les cases et les Clés, avec ce montant. Sinon, elle SHALL refuser. L'IA facile SHALL NOT
contre-proposer.

#### Scenario: Complément demandé à l'auteur

- **WHEN** une IA normale qui possède Satellite isolé reçoit l'offre « 300 Ᵽ contre Satellite » et ne l'accepte pas telle quelle
- **THEN** elle contre-propose « Satellite contre X Ᵽ », X étant le plus petit multiple de 10 Ᵽ au-dessus de 300 Ᵽ pour lequel elle accepterait l'offre

#### Scenario: Écart trop grand

- **WHEN** une IA normale qui possède Satellite isolé reçoit l'offre « 50 Ᵽ contre Satellite »
- **THEN** elle refuse sans contre-proposer

#### Scenario: Auteur sans les moyens

- **WHEN** l'auteur de l'offre « 300 Ᵽ contre Satellite » n'a pas assez d'argent pour payer le montant de la contre-proposition que l'IA ferait
- **THEN** l'IA refuse sans contre-proposer

#### Scenario: L'IA paie moins

- **WHEN** un joueur propose à une IA normale, qui ne possède aucune case Web, de lui vendre Forum contre 220 Ᵽ, et qu'elle ne l'accepte pas telle quelle
- **THEN** elle contre-propose « Y Ᵽ contre Forum », Y étant le plus grand multiple de 10 Ᵽ en dessous de 220 Ᵽ pour lequel elle accepterait l'offre

#### Scenario: Le niveau facile ne contre-propose pas

- **WHEN** une IA facile reçoit une offre qu'elle n'accepte pas
- **THEN** elle refuse sans contre-proposer

### Requirement: Réponse à une contre-proposition

Une IA qui reçoit une contre-proposition SHALL l'accepter si elle l'accepterait comme offre reçue,
options de partie comprises, et si l'argent qu'elle y donne lui laisse sa réserve ; l'IA difficile
SHALL garder en plus, au-dessus de sa réserve, de quoi poser une backdoor sur chaque système de la
famille que l'échange lui complète. Pendant son propre règlement de dette, une IA SHALL accepter une
contre-proposition à son offre de vente dès que l'argent reçu atteint la valeur de veille des cases
qu'elle cède. Elle SHALL refuser dans les autres cas. Une offre d'achat de l'IA qui a reçu une
contre-proposition SHALL compter comme refusée pour la montée de son prix d'un tour à l'autre.

#### Scenario: Contre-proposition acceptée

- **WHEN** une IA normale qui possède Forum et Blog, avec 1 000 Ᵽ et une réserve de 200 Ᵽ, a proposé 200 Ᵽ contre Boutique en ligne au joueur 2, qui contre-propose 260 Ᵽ
- **THEN** elle accepte

#### Scenario: Réserve entamée

- **WHEN** la même IA n'a que 400 Ᵽ quand le joueur 2 contre-propose 260 Ᵽ
- **THEN** elle refuse

#### Scenario: Constructions préservées par l'IA difficile

- **WHEN** une IA difficile accepterait à l'évaluation une contre-proposition qui lui complète la famille Web, mais qui ne lui laisse pas, au-dessus de sa réserve, les 300 Ᵽ de trois backdoors
- **THEN** elle refuse

#### Scenario: Vente en dette

- **WHEN** une IA normale en règlement de dette a proposé Satellite, de valeur de veille 150 Ᵽ, contre 225 Ᵽ, et que l'acheteur contre-propose 160 Ᵽ
- **THEN** elle accepte, alors qu'elle refuserait une contre-proposition à 140 Ᵽ

#### Scenario: Prix qui monte après une contre-proposition

- **WHEN** le détenteur de Boutique en ligne a répondu par une contre-proposition, refusée par l'IA normale, à son offre de 200 Ᵽ
- **THEN** au tour suivant, l'IA lui propose 300 Ᵽ contre Boutique en ligne

## MODIFIED Requirements

### Requirement: Évaluation d'une offre reçue

Une IA destinataire d'une offre SHALL calculer son gain net en PwnCoins : valeur des cases et des
Clés reçues moins valeur de celles données, plus l'argent reçu, moins l'argent donné, moins le
danger créé. Elle SHALL accepter si ce gain atteint un seuil propre à son niveau, rapporté à la
valeur totale échangée, et sinon contre-proposer ou refuser (voir « Contre-proposition de
l'IA ») :

- facile : valeur des cases à leur prix, sans prime de famille ni danger, seuil de 0 % ;
- normal : valeur avec prime de famille complète pour soi, danger d'une famille complétée chez
  l'autre joueur, seuil de 10 % ;
- difficile : en plus, danger évalué selon ce que l'autre joueur peut construire avec son argent
  après l'échange, pénalité si l'échange le fait passer en tête du patrimoine, seuil de 20 %.

La valeur des cases SHALL être calculée sur l'état après l'échange, pour qu'une prime de famille ne
compte que si l'échange complète réellement la famille.

#### Scenario: Offre généreuse acceptée

- **WHEN** on propose à une IA normale 300 Ᵽ contre Minitel, isolé chez elle, sans que l'échange complète une famille
- **THEN** elle accepte

#### Scenario: Offre déséquilibrée refusée

- **WHEN** on propose à une IA normale 50 Ᵽ contre Satellite, isolé chez elle
- **THEN** elle refuse

#### Scenario: Famille offerte à un adversaire

- **WHEN** un joueur possédant Forum et Blog propose à une IA normale 250 Ᵽ contre Boutique en ligne
- **THEN** elle ne l'accepte pas telle quelle, le danger de la famille Web complétée dépassant le gain

#### Scenario: Le niveau facile ignore le danger

- **WHEN** la même offre est faite à une IA facile
- **THEN** elle accepte

#### Scenario: Échange qui complète sa propre famille

- **WHEN** une IA normale possédant Minitel reçoit l'offre Modem 56k contre 60 Ᵽ
- **THEN** elle accepte

### Requirement: Échanges déterministes et sans triche

L'évaluation, la génération d'offres, la contre-proposition et la réponse à une contre-proposition
SHALL dépendre uniquement de la vue publique de l'IA et SHALL être déterministes : même vue, même
niveau, même décision. Le niveau d'un adversaire humain n'existant pas, une IA difficile qui estime
l'acceptation par un humain SHALL utiliser l'évaluation du niveau normal.

#### Scenario: Même offre pour la même vue

- **WHEN** on demande deux fois une proposition à une IA difficile sur la même vue
- **THEN** les deux offres sont identiques

#### Scenario: Même contre-proposition pour la même vue

- **WHEN** on demande deux fois sa réponse à une IA normale sur la même vue d'une offre qu'elle n'accepte pas telle quelle
- **THEN** les deux réponses sont la même contre-proposition

### Requirement: Tournois avec échanges

Le tournoi de force et le tournoi d'équilibrage SHALL être joués avec les échanges et les
contre-propositions, et leurs critères SHALL rester tenus. Le rapport du tournoi SHALL ajouter le
nombre moyen d'échanges acceptés par partie et le nombre de contre-propositions faites et acceptées.

#### Scenario: Échanges mesurés

- **WHEN** on lance le tournoi d'équilibrage avec des IA normales
- **THEN** le rapport indique un nombre moyen d'échanges acceptés supérieur à zéro, un nombre de contre-propositions supérieur à zéro, et tous les critères d'équilibre sont tenus
