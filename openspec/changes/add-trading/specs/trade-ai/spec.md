# Spec Delta

## Purpose

Faire de l'IA un partenaire d'échange crédible : évaluer une offre selon son niveau, en pesant la
valeur des familles complètes et le danger d'en offrir une à un adversaire, l'accepter ou la refuser,
et proposer elle-même des échanges.

## ADDED Requirements

### Requirement: Évaluation d'une offre reçue

Une IA destinataire d'une offre SHALL calculer son gain net en PwnCoins : valeur des cases et des
Clés reçues moins valeur de celles données, plus l'argent reçu, moins l'argent donné, moins le
danger créé. Elle SHALL accepter si ce gain atteint un seuil propre à son niveau, rapporté à la
valeur totale échangée, et refuser sinon :

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
- **THEN** elle refuse, le danger de la famille Web complétée dépassant le gain

#### Scenario: Le niveau facile ignore le danger

- **WHEN** la même offre est faite à une IA facile
- **THEN** elle accepte

#### Scenario: Échange qui complète sa propre famille

- **WHEN** une IA normale possédant Minitel reçoit l'offre Modem 56k contre 60 Ᵽ
- **THEN** elle accepte

### Requirement: Propositions de l'IA

Le niveau facile SHALL NOT proposer d'échange. Le niveau normal SHALL proposer, avant son lancer ou
sa fin de tour, l'achat contre de l'argent de la dernière case qui lui manque pour compléter une
famille, quand son détenteur n'en tire pas de famille, à un prix croissant d'une proposition à
l'autre (prix de la case, puis +50 %, puis +100 %) dans la limite de son argent au-dessus de sa
réserve. Le niveau difficile SHALL, en plus, proposer des échanges croisés où chacun complète une
famille, seulement si la famille qu'il obtient a un loyer espéré supérieur à celle qu'il cède. Une IA
SHALL NOT répéter une offre refusée, SHALL respecter les limites du moteur, et SHALL faire au plus une
proposition par destinataire et par tour.

#### Scenario: Le niveau facile ne propose pas

- **WHEN** une IA facile possède Minitel et qu'un adversaire détient Modem 56k seul
- **THEN** elle termine son tour sans proposer d'échange

#### Scenario: Achat de la case manquante

- **WHEN** une IA normale possède Forum et Blog, 1 000 Ᵽ et une réserve de 200 Ᵽ, et que le joueur 2 détient Boutique en ligne seule
- **THEN** elle propose au joueur 2 un montant contre Boutique en ligne

#### Scenario: Échange croisé du niveau difficile

- **WHEN** une IA difficile possède Réseau électrique, Satellite et Forum, et qu'un adversaire possède Câble sous-marin, Blog et Boutique en ligne
- **THEN** elle propose Forum contre Câble sous-marin, la famille Infrastructure ayant un loyer espéré supérieur à la famille Web

#### Scenario: Pas de répétition

- **WHEN** l'offre d'une IA a été refusée
- **THEN** elle ne propose plus cette offre dans le même tour

### Requirement: Échanges pour éviter la faillite

En règlement de dette, une IA normale ou difficile SHALL, avant de mettre en veille, proposer la
vente d'une case hors famille complète contre au moins 1,5 fois sa valeur de veille au joueur le plus
riche qui n'est pas son créancier. En cas de refus, elle SHALL poursuivre son règlement de dette
comme sans échange.

#### Scenario: Vente avant mise en veille

- **WHEN** une IA normale doit 200 Ᵽ, a 50 Ᵽ en poche et possède Satellite isolé
- **THEN** elle propose Satellite contre au moins 225 Ᵽ au joueur le plus riche autre que son créancier

### Requirement: Échanges déterministes et sans triche

L'évaluation et la génération d'offres SHALL dépendre uniquement de la vue publique de l'IA et SHALL
être déterministes : même vue, même niveau, même décision. Le niveau d'un adversaire humain n'existant
pas, une IA difficile qui estime l'acceptation par un humain SHALL utiliser l'évaluation du niveau
normal.

#### Scenario: Même offre pour la même vue

- **WHEN** on demande deux fois une proposition à une IA difficile sur la même vue
- **THEN** les deux offres sont identiques

### Requirement: Tournois avec échanges

Le tournoi de force et le tournoi d'équilibrage SHALL être joués avec les échanges, et leurs critères
SHALL rester tenus. Le rapport du tournoi SHALL ajouter le nombre moyen d'échanges acceptés par
partie.

#### Scenario: Échanges mesurés

- **WHEN** on lance le tournoi d'équilibrage avec des IA normales
- **THEN** le rapport indique un nombre moyen d'échanges acceptés supérieur à zéro et tous les critères d'équilibre sont tenus
