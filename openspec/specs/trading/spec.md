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

Pendant une offre d'échange, seul le destinataire SHALL pouvoir accepter, refuser ou, quand il
s'agit d'une offre de départ, contre-proposer (voir « Contre-proposition »). L'acceptation SHALL
revalider l'offre en attente, offre de départ ou contre-proposition, puis transférer en une seule
action toutes les cases (avec leur état de mise en veille, sans intérêts), les PwnCoins et les Clés
des deux côtés. Après une acceptation comme après un refus, la partie SHALL revenir exactement à la
phase d'avant l'offre de départ, avec ses données (paiements restants d'une dette compris).

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

#### Scenario: Contre-proposition acceptée

- **WHEN** le joueur 1, en phase avant le lancer, accepte la contre-proposition « 200 Ᵽ contre Forum » que le joueur 2 a faite à son offre « Forum contre 150 Ᵽ »
- **THEN** Forum appartient au joueur 2, le joueur 1 a 200 Ᵽ de plus, le joueur 2 200 Ᵽ de moins, et la partie revient en phase avant le lancer

#### Scenario: Contre-proposition refusée

- **WHEN** le joueur 1 refuse la contre-proposition du joueur 2
- **THEN** aucun bien ne change de main et la partie revient à la phase d'avant l'offre de départ

### Requirement: Limite des propositions

Un joueur SHALL pouvoir faire au plus trois propositions par tour de jeu ; une contre-proposition
SHALL NOT compter parmi les propositions de son auteur. Une proposition refusée SHALL NOT pouvoir
être refaite à l'identique dans le même tour, l'ordre des éléments n'entrant pas en compte. Une
offre qui a reçu une contre-proposition SHALL compter comme refusée, que la contre-proposition soit
ensuite acceptée ou refusée. Les compteurs SHALL repartir de zéro au tour suivant et SHALL être
tenus séparément pour chaque auteur.

#### Scenario: Quatrième proposition

- **WHEN** le joueur courant a déjà fait trois propositions dans son tour et en fait une quatrième
- **THEN** elle est rejetée avec le code « limite d'échanges atteinte »

#### Scenario: Proposition refusée répétée

- **WHEN** le joueur 2 a refusé « Forum et Blog contre 400 Ᵽ » et que le joueur courant propose « Blog et Forum contre 400 Ᵽ » dans le même tour
- **THEN** la proposition est rejetée avec le code « échange déjà refusé »

#### Scenario: Nouveau tour

- **WHEN** le tour passe au joueur suivant puis revient au joueur 1
- **THEN** le joueur 1 peut de nouveau faire trois propositions, y compris une proposition refusée au tour précédent

#### Scenario: Contre-proposition non comptée

- **WHEN** le joueur 2 répond par une contre-proposition à une offre du joueur 1
- **THEN** le nombre de propositions restantes du joueur 2 dans ce tour est inchangé

#### Scenario: Offre contre-proposée tenue pour refusée

- **WHEN** le joueur 2 a répondu par une contre-proposition à « Forum contre 150 Ᵽ », et que le joueur 1 propose de nouveau « Forum contre 150 Ᵽ » au joueur 2 dans le même tour
- **THEN** la proposition est rejetée avec le code « échange déjà refusé »

### Requirement: Événements et journal

Une proposition, une contre-proposition, une acceptation et un refus SHALL produire chacun un
événement portant l'offre complète ; ceux d'une contre-proposition et de sa réponse SHALL porter
aussi l'offre de départ. Le journal de partie SHALL afficher chacun en une ligne lisible nommant
l'auteur, le destinataire et le contenu (« Nyx propose à Joueur 1 : Forum contre 150 Ᵽ »,
« Joueur 1 fait une contre-proposition à Nyx : 120 Ᵽ contre Forum »). La réponse à une
contre-proposition SHALL être nommée comme telle (« Nyx accepte la contre-proposition de
Joueur 1 : 120 Ᵽ contre Forum »). Une partie sauvegardée pendant une offre d'échange ou une
contre-proposition SHALL reprendre sur cette même offre.

#### Scenario: Ligne de journal d'un échange accepté

- **WHEN** le joueur 2 accepte l'offre « Forum contre 150 Ᵽ » du joueur 1
- **THEN** le journal contient la ligne de proposition puis la ligne d'acceptation, avec les noms et le contenu

#### Scenario: Lignes de journal d'une contre-proposition

- **WHEN** Nyx propose Forum contre 150 Ᵽ à Joueur 1, que Joueur 1 contre-propose 120 Ᵽ contre Forum et que Nyx accepte
- **THEN** le journal contient la ligne de proposition, puis « Joueur 1 fait une contre-proposition à Nyx : 120 Ᵽ contre Forum », puis « Nyx accepte la contre-proposition de Joueur 1 : 120 Ᵽ contre Forum »

#### Scenario: Reprise sur une offre en attente

- **WHEN** l'application est rechargée pendant qu'une offre attend la réponse d'un humain
- **THEN** la partie reprend sur la fenêtre de réception de cette offre

#### Scenario: Reprise sur une contre-proposition en attente

- **WHEN** l'application est rechargée pendant qu'une contre-proposition attend la réponse d'un humain
- **THEN** la partie reprend sur la fenêtre de réception de cette contre-proposition, avec le rappel de l'offre de départ

#### Scenario: Ancienne sauvegarde

- **WHEN** on charge une sauvegarde au format antérieur aux échanges
- **THEN** la partie reprend avec des compteurs de propositions vides

### Requirement: Contre-proposition

Pendant une offre d'échange qui n'est pas elle-même une contre-proposition, le destinataire SHALL
pouvoir répondre par une contre-proposition adressée à l'auteur de l'offre. La contre-proposition
SHALL suivre les règles de contenu d'une offre valide et SHALL différer de l'offre reçue, l'ordre
des éléments n'entrant pas en compte. La partie SHALL rester en offre d'échange, sur la
contre-proposition : seul l'auteur de l'offre de départ SHALL pouvoir l'accepter ou la refuser, et
une contre-proposition SHALL NOT pouvoir recevoir de contre-proposition. Une contre-proposition
invalide SHALL être rejetée avec un code d'erreur identifiable, sans modifier l'état.

#### Scenario: Contre-proposition du destinataire

- **WHEN** le joueur 1 propose Forum contre 150 Ᵽ au joueur 2, et que le joueur 2 contre-propose 200 Ᵽ contre Forum
- **THEN** la partie reste en offre d'échange, sur l'offre du joueur 2 au joueur 1 « 200 Ᵽ contre Forum », et le joueur qui doit agir est le joueur 1

#### Scenario: Contre-proposition identique

- **WHEN** le joueur 2 répond à « Forum contre 150 Ᵽ » par la contre-proposition « 150 Ᵽ contre Forum »
- **THEN** elle est rejetée avec le code « contre-proposition identique »

#### Scenario: Contre-proposition d'une contre-proposition

- **WHEN** le joueur 1 tente de répondre par une contre-proposition à la contre-proposition du joueur 2
- **THEN** elle est rejetée avec le code « contre-proposition impossible »

#### Scenario: Contre-proposition d'un tiers

- **WHEN** le joueur 3 tente de contre-proposer à une offre adressée au joueur 2
- **THEN** elle est rejetée avec le code « pas votre tour »

#### Scenario: Contre-proposition adressée à un autre joueur

- **WHEN** le joueur 2 adresse au joueur 3 sa contre-proposition à l'offre du joueur 1
- **THEN** elle est rejetée avec le code « échange invalide »

#### Scenario: Contenu invalide

- **WHEN** le joueur 2, qui a 180 Ᵽ, répond à « Forum contre 150 Ᵽ » par la contre-proposition « 200 Ᵽ contre Forum »
- **THEN** elle est rejetée avec le code « fonds insuffisants »

#### Scenario: Hors d'une offre d'échange

- **WHEN** un joueur fait une contre-proposition en phase avant le lancer
- **THEN** elle est rejetée avec le code « mauvaise phase »

#### Scenario: Contre-proposition pendant une dette

- **WHEN** le joueur 2, en règlement de dette, propose Satellite contre 225 Ᵽ au joueur 3, que le joueur 3 contre-propose 180 Ᵽ et que le joueur 2 accepte
- **THEN** Satellite appartient au joueur 3, le joueur 2 a 180 Ᵽ de plus, et la partie revient en règlement de dette avec les mêmes paiements restants
