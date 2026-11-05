## ADDED Requirements

### Requirement: Abandon

Pendant son propre tour, en phase `preRoll` (quarantaine comprise) ou `postRoll` (même s'il doit
relancer après un double), le joueur courant SHALL pouvoir se déclarer en faillite
(`declareBankruptcy`) pour abandonner la partie. Cet abandon SHALL être traité comme une faillite
envers la banque : ses constructions SHALL être revendues à la banque à moitié prix et retourner au
stock, son argent SHALL revenir à la banque, ses cases SHALL redevenir libres et actives, sans
enchère, et ses Clés de déchiffrement SHALL retourner sous leur paquet. Le joueur SHALL être marqué
en faillite, puis la partie SHALL se poursuivre comme après la faillite du joueur courant (voir
« Suite de la partie après une faillite », « Victoire » et `game-end-conditions`).

L'événement de faillite SHALL indiquer si elle est volontaire : c'est le cas d'un abandon, et
SHALL NOT être le cas d'une faillite déclarée pendant un règlement de dette, même quand le débiteur
aurait pu payer. `declareBankruptcy` SHALL rester refusé avec `WRONG_PHASE` pendant une décision
d'achat, une enchère ou une offre d'échange, et avec `NOT_YOUR_TURN` quand il vient d'un autre
joueur que celui qui doit agir.

#### Scenario: Abandon avant le lancer

- **WHEN** à 3 joueurs Alice, en `preRoll` avec 300 Ᵽ, Minitel et Modem 56k avec 2 backdoors chacun et une Clé de déchiffrement, se déclare en faillite
- **THEN** Minitel et Modem 56k n'appartiennent plus à personne, sont actifs et sans construction, et le stock de la banque a récupéré les 4 backdoors
- **AND** la Clé est sous son paquet, la banque a reçu les 400 Ᵽ d'Alice, Alice est en faillite et c'est au tour de Bob, en `preRoll`

#### Scenario: Abandon après un double

- **WHEN** à 3 joueurs Alice, en `postRoll` après un double qu'elle doit rejouer, se déclare en faillite
- **THEN** Alice est en faillite et c'est au tour du joueur suivant, en `preRoll`

#### Scenario: Abandon en quarantaine

- **WHEN** à 3 joueurs Alice commence son tour en quarantaine et se déclare en faillite
- **THEN** Alice est en faillite, n'est plus en quarantaine, et c'est au tour du joueur suivant

#### Scenario: Abandon en duel

- **WHEN** à 2 joueurs Bob se déclare en faillite pendant son tour
- **THEN** Alice est vainqueur avec le motif `lastStanding` et la partie est en `gameOver`

#### Scenario: Abandon au dernier tour de la limite

- **WHEN** la limite est de 20 tours, que trois joueurs sont en jeu et que le dernier joueur du tour de table 20 abandonne pendant son tour
- **THEN** la partie se termine avec le motif `turnLimit`, sans tour de table 21, et le plus gros patrimoine des deux joueurs restants gagne

#### Scenario: Faillite volontaire signalée

- **WHEN** Alice abandonne pendant son tour
- **THEN** l'événement de faillite désigne la banque comme créancier et indique une faillite volontaire

#### Scenario: Faillite en règlement de dette

- **WHEN** Bob se déclare en faillite pendant le règlement d'une dette envers Alice
- **THEN** l'événement de faillite désigne Alice comme créancier et n'indique pas une faillite volontaire

#### Scenario: Pas d'abandon pendant une enchère

- **WHEN** pendant une enchère le joueur qui doit miser envoie `declareBankruptcy`
- **THEN** l'action est rejetée avec le code `WRONG_PHASE`

#### Scenario: Pas d'abandon hors de son tour

- **WHEN** pendant le tour d'Alice en `preRoll`, Bob envoie `declareBankruptcy`
- **THEN** l'action est rejetée avec le code `NOT_YOUR_TURN`
