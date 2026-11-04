# debt-and-bankruptcy Specification

## Purpose
Faire payer les sommes dues, laisser au débiteur le moyen de réunir l'argent, et gérer la faillite
envers un joueur ou envers la banque jusqu'à la victoire du dernier joueur solvable.

## Requirements

### Requirement: Paiement automatique

Tout paiement (loyer, taxe, carte, amende) SHALL être fait immédiatement si l'argent liquide du
débiteur le couvre. Plusieurs paiements SHALL être faits dans l'ordre, chacun produisant un
événement `paid`.

#### Scenario: Paiement couvert

- **WHEN** un joueur avec 300 Ᵽ doit un loyer de 140 Ᵽ
- **THEN** il a 160 Ᵽ, le propriétaire a reçu 140 Ᵽ et la partie n'est pas en `debt`

### Requirement: Règlement de dette

Si un paiement n'est pas couvert, la partie SHALL passer en `debt` avec le débiteur, les paiements
restants et le point de reprise. Pendant cette phase, le débiteur SHALL pouvoir revendre des
constructions, mettre en veille, payer (`payDebt`) ou déclarer faillite (`declareBankruptcy`), et
rien d'autre. `payDebt` SHALL être refusé avec `DEBT_NOT_COVERED` si l'argent ne couvre pas le
premier paiement restant.

#### Scenario: Dette ouverte

- **WHEN** un joueur avec 100 Ᵽ doit un loyer de 370 Ᵽ
- **THEN** la partie est en `debt` avec un paiement de 370 Ᵽ envers le propriétaire
- **AND** l'argent du joueur n'a pas changé

#### Scenario: Paiement refusé

- **WHEN** le débiteur envoie `payDebt` avec 100 Ᵽ pour une dette de 370 Ᵽ
- **THEN** l'action est rejetée avec le code `DEBT_NOT_COVERED`

#### Scenario: Dette réglée après mise en veille

- **WHEN** le débiteur avec 100 Ᵽ met en veille deux nœuds puis envoie `payDebt` pour 270 Ᵽ
- **THEN** il a 30 Ᵽ, le créancier a reçu 270 Ᵽ et la partie reprend en `postRoll`

#### Scenario: Action interdite pendant la dette

- **WHEN** le débiteur envoie `endTurn` en phase `debt`
- **THEN** l'action est rejetée avec le code `WRONG_PHASE`

### Requirement: Patrimoine mobilisable

Le moteur SHALL exposer une requête donnant le montant qu'un joueur peut réunir : argent liquide,
plus la revente de toutes ses constructions, plus la valeur de veille de ses cases actives.

#### Scenario: Calcul

- **WHEN** un joueur a 50 Ᵽ, Minitel et Modem 56k avec 1 backdoor chacun, et le Nœud VPN actif
- **THEN** son patrimoine mobilisable vaut 50 + 50 + 30 + 30 + 100, soit 260 Ᵽ

### Requirement: Faillite envers un joueur

La faillite envers un joueur SHALL tout transférer au créancier. Quand le débiteur déclare faillite
et que le premier paiement restant est dû à un joueur, ses constructions SHALL être revendues à la banque à moitié prix, puis son argent, toutes ses cases
(en veille ou non, sans intérêts) et ses Clés de déchiffrement SHALL passer au créancier. Les
paiements suivants SHALL être abandonnés. Le joueur SHALL être marqué en faillite.

#### Scenario: Transfert au créancier

- **WHEN** un joueur avec 20 Ᵽ, le Forum avec 1 backdoor, le Nœud Tor en veille et une clé déclare faillite envers B
- **THEN** B reçoit 70 Ᵽ, le Forum sans construction, le Nœud Tor toujours en veille et la clé
- **AND** la banque a récupéré la backdoor et le joueur est en faillite

### Requirement: Faillite envers la banque

Quand le premier paiement restant est dû à la banque, les cases du joueur SHALL redevenir libres et
actives, sans enchère, ses constructions SHALL retourner au stock et ses clés sous leur paquet.

#### Scenario: Retour à la banque

- **WHEN** un joueur possédant le Minitel en veille déclare faillite pour une taxe
- **THEN** le Minitel n'est plus possédé par personne
- **AND** le joueur est en faillite

### Requirement: Suite de la partie après une faillite

Après une faillite, si plusieurs joueurs restent solvables, la partie SHALL passer au joueur suivant
en `preRoll` si le failli était le joueur courant, ou reprendre au point prévu sinon.

#### Scenario: Faillite du joueur courant

- **WHEN** à 3 joueurs le joueur courant fait faillite
- **THEN** c'est au joueur suivant de jouer, en `preRoll`

#### Scenario: Faillite d'un payeur de « Serveur de jeu partagé »

- **WHEN** pendant le tour de A, le joueur B fait faillite en payant 10 Ᵽ à A
- **THEN** la partie reprend en `postRoll` du joueur A

### Requirement: Victoire

Quand il ne reste qu'un joueur non en faillite, il SHALL être déclaré vainqueur aussitôt, quels que
soient les réglages de fin de partie : `winner` est renseigné, `winReason` vaut `lastStanding`, la
partie passe en `gameOver` et un événement de victoire portant ce motif est émis. Les fins par
limite de tours et par objectif de patrimoine sont décrites par `game-end-conditions`.

#### Scenario: Dernier joueur solvable

- **WHEN** à 2 joueurs l'un déclare faillite
- **THEN** l'autre est vainqueur avec le motif `lastStanding` et la partie est en `gameOver`
