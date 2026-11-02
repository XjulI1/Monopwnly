# Spec Delta

## Purpose

Proposer quatre règles optionnelles, désactivées par défaut et cumulables, qui modifient le moteur
sans changer une partie jouée sans option.

## ADDED Requirements

### Requirement: Réglages des règles optionnelles

La création d'une partie SHALL accepter les réglages booléens `dmzJackpot` (cagnotte de la DMZ),
`doubleBootBonus` (bonus double sur Boot), `freeBuilding` (construction libre) et
`noRentInQuarantine` (pas de loyer en quarantaine), tous à `false` par défaut et cumulables. Une
partie créée sans ces réglages SHALL se dérouler exactement comme avant ce change pour une même
graine et les mêmes actions.

#### Scenario: Valeurs par défaut

- **WHEN** une partie est créée sans préciser ces réglages
- **THEN** les quatre réglages valent `false` et la cagnotte vaut 0

#### Scenario: Non-régression

- **WHEN** une partie sans option est jouée avec une graine et une suite d'actions fixées
- **THEN** elle produit la même suite d'événements et le même état final qu'avant ce change

#### Scenario: Options cumulées

- **WHEN** une partie est créée avec les quatre options actives
- **THEN** la création réussit et les quatre réglages valent `true`

### Requirement: Cagnotte de la DMZ

Les paiements suivants SHALL alimenter la cagnotte au lieu de la banque avec `dmzJackpot` : les
taxes (Rançongiciel, Amende RGPD) et les paiements à la banque imposés par les cartes (Phishing
raté, Facture du fournisseur cloud, Assurance cyber, Licence expirée, Formation obligatoire, Mise à
jour forcée, Audit de sécurité).
Le joueur qui s'arrête sur la DMZ SHALL recevoir toute la cagnotte, qui revient à 0. Les autres
paiements à la banque (achats, enchères, constructions, réactivations, amende de quarantaine) et les
faillites envers la banque SHALL NOT alimenter la cagnotte. Sans l'option, la cagnotte reste à 0.

#### Scenario: Taxe vers la cagnotte

- **WHEN** l'option est active, la cagnotte vaut 0 et Alice s'arrête sur Rançongiciel
- **THEN** Alice paie 200 Ᵽ et la cagnotte vaut 200 Ᵽ

#### Scenario: Carte vers la cagnotte

- **WHEN** l'option est active, la cagnotte vaut 200 Ᵽ et Bob pioche « Facture du fournisseur cloud »
- **THEN** Bob paie 100 Ᵽ et la cagnotte vaut 300 Ᵽ

#### Scenario: Cagnotte remportée

- **WHEN** l'option est active, la cagnotte vaut 300 Ᵽ et Carol s'arrête sur la DMZ
- **THEN** Carol reçoit 300 Ᵽ, la cagnotte vaut 0 et un événement de cagnotte remportée est émis

#### Scenario: Achat hors cagnotte

- **WHEN** l'option est active et Alice achète le Blog pour 180 Ᵽ
- **THEN** la cagnotte ne change pas

#### Scenario: Sans l'option

- **WHEN** l'option est inactive et Alice s'arrête sur Rançongiciel puis Bob sur la DMZ
- **THEN** les 200 Ᵽ vont à la banque et Bob ne reçoit rien

### Requirement: Bonus double sur Boot

Avec `doubleBootBonus`, un joueur dont le déplacement s'arrête sur Boot SHALL recevoir 400 Ᵽ au
total au lieu de 200 Ᵽ, y compris quand il y arrive par une carte. Le salaire de 200 Ᵽ en passant
par Boot sans s'y arrêter SHALL rester inchangé.

#### Scenario: Arrêt sur Boot

- **WHEN** l'option est active et Alice, sur la case 35, lance 2 et 3
- **THEN** Alice s'arrête sur Boot et reçoit 400 Ᵽ

#### Scenario: Passage sur Boot

- **WHEN** l'option est active et Alice, sur la case 35, lance 5 et 3
- **THEN** Alice passe par Boot, reçoit 200 Ᵽ et s'arrête sur Modem 56k

#### Scenario: Arrivée par une carte

- **WHEN** l'option est active et Bob pioche « Redémarrage à chaud »
- **THEN** Bob avance jusqu'à Boot et reçoit 400 Ᵽ

#### Scenario: Sans l'option

- **WHEN** l'option est inactive et Alice s'arrête sur Boot
- **THEN** Alice reçoit 200 Ᵽ

### Requirement: Construction libre

Avec `freeBuilding`, l'obligation de construire et de revendre uniformément dans une famille SHALL
être levée. Les autres conditions SHALL rester exigées : famille complète, aucun système de la
famille en veille, stock de la banque, argent suffisant, et 4 backdoors sur le système pour y
installer un rootkit.

#### Scenario: Construction déséquilibrée

- **WHEN** l'option est active, Alice possède toute la famille Rétro, le Minitel a 2 backdoors et le Modem 56k aucune
- **THEN** Alice peut installer une troisième backdoor sur le Minitel

#### Scenario: Rootkit sans uniformité

- **WHEN** l'option est active, le Minitel a 4 backdoors et le Modem 56k aucune
- **THEN** Alice peut installer un rootkit sur le Minitel

#### Scenario: Famille toujours exigée

- **WHEN** l'option est active et Alice ne possède que le Minitel
- **THEN** la construction est rejetée avec le code `GROUP_INCOMPLETE`

#### Scenario: Uniformité par défaut

- **WHEN** l'option est inactive, le Minitel a 1 backdoor et le Modem 56k aucune
- **THEN** une deuxième backdoor sur le Minitel est rejetée avec le code `UNEVEN_BUILDING`

### Requirement: Pas de loyer en quarantaine

Avec `noRentInQuarantine`, un joueur en quarantaine SHALL NOT percevoir de loyer : le joueur qui
s'arrête sur l'un de ses systèmes, nœuds ou services ne paie rien et un événement de loyer non perçu
est émis. Les taxes et les effets des cartes ne sont pas concernés.

#### Scenario: Loyer non perçu

- **WHEN** l'option est active, Alice est en quarantaine et Bob s'arrête sur le Forum d'Alice
- **THEN** Bob ne paie rien et un événement de loyer non perçu est émis

#### Scenario: Loyer perçu par défaut

- **WHEN** l'option est inactive, Alice est en quarantaine et Bob s'arrête sur le Forum d'Alice sans construction
- **THEN** Bob paie 14 Ᵽ à Alice

#### Scenario: Paiement de carte maintenu

- **WHEN** l'option est active, Alice est en quarantaine et Bob pioche « Conférence de sécurité »
- **THEN** Bob paie 50 Ᵽ à Alice comme aux autres joueurs
