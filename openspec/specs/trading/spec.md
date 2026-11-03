# trading Specification

## Purpose
Permettre aux joueurs d'échanger cases, PwnCoins et Clés de déchiffrement par une proposition que le
destinataire accepte ou refuse, en une transaction atomique validée par le moteur, avec des limites
qui empêchent le harcèlement et une trace dans le journal.

## Requirements

### Requirement: Proposer un échange

Le joueur courant SHALL pouvoir proposer un échange à un autre joueur non en faillite pendant les
phases avant le lancer et après le lancer. Pendant un règlement de dette, le débiteur SHALL pouvoir
proposer un échange, même hors de son tour. Une proposition SHALL faire passer la partie en phase
d'offre d'échange, où seul le destinataire peut agir. Toute autre proposition SHALL être rejetée avec
un code d'erreur identifiable, sans modifier l'état.

#### Scenario: Proposition avant le lancer

- **WHEN** le joueur courant, en phase avant le lancer, propose Forum contre 150 Ᵽ au joueur 2
- **THEN** la partie passe en offre d'échange et le joueur qui doit agir est le joueur 2

#### Scenario: Proposition d'un joueur qui n'a pas la main

- **WHEN** le joueur 2 propose un échange pendant le tour du joueur 1, hors règlement de dette
- **THEN** la proposition est rejetée avec le code « pas votre tour »

#### Scenario: Proposition pendant une décision d'achat

- **WHEN** le joueur courant propose un échange en phase de décision d'achat
- **THEN** la proposition est rejetée avec le code « mauvaise phase »

#### Scenario: Débiteur hors de son tour

- **WHEN** le joueur 2 est en règlement de dette pendant le tour du joueur 1 et propose un échange au joueur 3
- **THEN** la partie passe en offre d'échange adressée au joueur 3

### Requirement: Contenu valide d'un échange

Une offre SHALL indiquer ce que l'auteur donne et ce qu'il demande, chaque côté pouvant contenir des
cases, des PwnCoins et des Clés de déchiffrement. Une offre SHALL contenir au moins un élément. Chaque
case SHALL appartenir au côté qui la cède, et les cases de sa famille SHALL NOT porter de
backdoor ni de rootkit. Les montants SHALL être des entiers positifs ou nuls, au plus égaux à
l'argent du côté qui paie. Les Clés SHALL être détenues par le côté qui les cède. L'auteur et le
destinataire SHALL être différents.

#### Scenario: Système d'une famille construite

- **WHEN** le joueur courant propose Blog alors qu'une backdoor est construite sur Forum, de la même famille
- **THEN** la proposition est rejetée avec le code « constructions présentes »

#### Scenario: Montant supérieur à l'argent

- **WHEN** le joueur courant, avec 100 Ᵽ, propose 200 Ᵽ contre Minitel
- **THEN** la proposition est rejetée avec le code « fonds insuffisants »

#### Scenario: Case d'un autre joueur

- **WHEN** le joueur courant propose de donner Satellite, qui appartient au joueur 3, au joueur 2
- **THEN** la proposition est rejetée avec le code « pas propriétaire »

#### Scenario: Offre vide

- **WHEN** le joueur courant propose une offre sans case, sans PwnCoin et sans Clé
- **THEN** la proposition est rejetée avec un code d'erreur d'offre vide

### Requirement: Réponse et transfert

Pendant une offre d'échange, seul le destinataire SHALL pouvoir accepter ou refuser. L'acceptation
SHALL revalider l'offre puis transférer en une seule action toutes les cases (avec leur état de mise
en veille, sans intérêts), les PwnCoins et les Clés des deux côtés. Après une acceptation comme après
un refus, la partie SHALL revenir exactement à la phase d'origine, avec ses données (paiements
restants d'une dette compris).

#### Scenario: Échange accepté

- **WHEN** le joueur 2 accepte l'offre du joueur 1 : Forum contre 150 Ᵽ
- **THEN** Forum appartient au joueur 2, le joueur 1 a 150 Ᵽ de plus, le joueur 2 150 Ᵽ de moins, et la partie revient à la phase d'origine

#### Scenario: Case en veille transférée

- **WHEN** un échange accepté transfère Minitel mis en veille
- **THEN** Minitel est en veille chez son nouveau propriétaire et aucun intérêt n'est prélevé

#### Scenario: Échange refusé

- **WHEN** le joueur 2 refuse l'offre
- **THEN** aucun bien ne change de main et la partie revient à la phase d'origine

#### Scenario: Retour en dette

- **WHEN** un débiteur obtient 300 Ᵽ par un échange accepté
- **THEN** la partie revient en règlement de dette avec les mêmes paiements restants, et le débiteur peut payer

#### Scenario: Réponse de l'auteur

- **WHEN** l'auteur de l'offre tente de l'accepter lui-même
- **THEN** l'action est rejetée avec le code « pas votre tour »

### Requirement: Limite des propositions

Un joueur SHALL pouvoir faire au plus trois propositions par tour de jeu. Une proposition refusée
SHALL NOT pouvoir être refaite à l'identique dans le même tour, l'ordre des éléments n'entrant pas
en compte. Les compteurs SHALL repartir de zéro au tour suivant et SHALL être tenus séparément pour
chaque auteur.

#### Scenario: Quatrième proposition

- **WHEN** le joueur courant a déjà fait trois propositions dans son tour et en fait une quatrième
- **THEN** elle est rejetée avec le code « limite d'échanges atteinte »

#### Scenario: Proposition refusée répétée

- **WHEN** le joueur 2 a refusé « Forum et Blog contre 400 Ᵽ » et que le joueur courant propose « Blog et Forum contre 400 Ᵽ » dans le même tour
- **THEN** la proposition est rejetée avec le code « échange déjà refusé »

#### Scenario: Nouveau tour

- **WHEN** le tour passe au joueur suivant puis revient au joueur 1
- **THEN** le joueur 1 peut de nouveau faire trois propositions, y compris une proposition refusée au tour précédent

### Requirement: Événements et journal

Une proposition, une acceptation et un refus SHALL produire chacun un événement portant l'offre
complète. Le journal de partie SHALL afficher chacun en une ligne lisible nommant l'auteur, le
destinataire et le contenu (« Nyx propose à Joueur 1 : Forum contre 150 Ᵽ »). Une partie sauvegardée
pendant une offre d'échange SHALL reprendre sur cette même offre.

#### Scenario: Ligne de journal d'un échange accepté

- **WHEN** le joueur 2 accepte l'offre « Forum contre 150 Ᵽ » du joueur 1
- **THEN** le journal contient la ligne de proposition puis la ligne d'acceptation, avec les noms et le contenu

#### Scenario: Reprise sur une offre en attente

- **WHEN** l'application est rechargée pendant qu'une offre attend la réponse d'un humain
- **THEN** la partie reprend sur la fenêtre de réception de cette offre

#### Scenario: Ancienne sauvegarde

- **WHEN** on charge une sauvegarde au format antérieur à ce change
- **THEN** la partie reprend avec des compteurs de propositions vides
