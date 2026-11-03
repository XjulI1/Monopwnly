## Why

Dans ce genre de jeu, les familles complètes se forment rarement par les seuls achats : les échanges
sont le moteur de la partie. Sans eux, les parties s'enlisent et l'adversaire IA reste un simple
acheteur. Il faut des échanges entre tous les joueurs, IA comprises, avec une IA capable d'évaluer
une offre, de flairer le piège d'une famille offerte à un adversaire, et de proposer elle-même des
échanges.

## What Changes

- **Moteur** : nouvelle phase `tradeOffer` et actions `proposeTrade`, `acceptTrade`, `rejectTrade`.
  Le joueur dont c'est le tour propose un échange à un autre joueur, avant ou après son lancer, ou
  pendant le règlement d'une dette (le débiteur propose alors). Le destinataire accepte ou refuse,
  sans contre-proposition.
- **Contenu d'un échange** : cases (systèmes sans construction dans leur famille, nœuds, services),
  PwnCoins et Clés de déchiffrement, dans les deux sens. Une case en veille reste en veille chez son
  nouveau propriétaire, sans intérêts.
- **Limite anti-harcèlement** : trois propositions au plus par tour et par joueur, et une proposition
  refusée ne peut pas être refaite à l'identique dans le même tour.
- **Interface** : un panneau pour composer une offre (partenaire, cases, PwnCoins, Clés de chaque
  côté) et une fenêtre pour recevoir une offre, d'un humain sur le même écran ou d'une IA, avec un
  résumé clair de ce que chacun donne et reçoit.
- **IA** : elle évalue les offres reçues et les accepte ou les refuse selon son niveau, en pesant la
  valeur stratégique des familles complètes et le danger d'en offrir une à un adversaire ; les
  niveaux normal et difficile proposent eux-mêmes des échanges, aux humains comme aux autres IA.
- **Journal** : chaque proposition, acceptation et refus apparaît dans le journal de partie et
  l'échange accepté est rejoué fidèlement à la reprise d'une sauvegarde.

## Capabilities

### New Capabilities

- `trading` : règles des échanges dans le moteur (phase, actions, contenu valide, transfert, limites, journal).
- `trade-interface` : composer, envoyer, recevoir, accepter ou refuser une offre à l'écran.
- `trade-ai` : évaluation des offres par l'IA, acceptation ou refus, propositions de l'IA selon son niveau.

### Modified Capabilities

- `turn-flow` : la phase `tradeOffer` s'intercale depuis `preRoll`, `postRoll` ou `debt`.
- `ai-players` : le destinataire d'une offre est le joueur qui doit agir.
- `ai-strategy` : une IA normale ou difficile en dette propose une vente avant de mettre en veille ;
  le tournoi de force passe à 180 parties.
- `ai-balance-tournament` : le rapport compte les échanges proposés et acceptés.
- `turn-controls` : bouton « Échanger » et phase « Offre d'échange » dans le bandeau.
- `debt-interface` : une faillite sans issue est annoncée « sans échange » quand un échange reste
  possible.

## Hors périmètre

- Contre-propositions : après la V1.
- Échanges proposés par un joueur hors de son tour (sauf débiteur) : non retenu, voir `TODO.md`.
- Transfert de systèmes construits : interdit, il faut d'abord revendre les constructions de la
  famille.
- Prise en compte des options de `add-game-options` dans l'évaluation des échanges par l'IA :
  ajoutée par ce change ultérieur.

## Impact

- Moteur : `Phase` gagne `tradeOffer` ; `GameState` gagne un compteur de propositions du tour ;
  `actingPlayerId` désigne le destinataire pendant une offre ; nouveaux événements et codes d'erreur.
- IA : `src/ai/trade/` (évaluation et génération d'offres), branché dans les trois niveaux.
- Interface : bouton « Échanger » dans le HUD, panneau de composition, fenêtre de réception, mise en
  avant des cases concernées sur le plateau.
- Sauvegarde et journal : nouvelles entrées de journal ; version du format de sauvegarde incrémentée.
- Tournois d'IA relancés avec les échanges.
- Aucune nouvelle dépendance.
- Dépend de `add-rules-engine`, `add-3d-board`, `add-game-ui`, `add-heuristic-ai` et
  `add-save-and-journal`.
