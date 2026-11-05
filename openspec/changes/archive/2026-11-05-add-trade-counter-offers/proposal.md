## Why

Aujourd'hui, le destinataire d'un échange ne peut qu'accepter ou refuser. Face à une offre presque
acceptable, il refuse, et l'auteur doit deviner à l'aveugle ce qui manquait. Un humain qui
marchande avec une IA tâtonne pendant plusieurs tours, sans jamais connaître son prix. Une
contre-proposition unique permet de répondre « oui, mais à ce prix-là », sans ouvrir une
négociation sans fin.

## What Changes

- **Moteur** : nouvelle action `counterTrade`. Le destinataire d'une offre peut, au lieu
  d'accepter ou de refuser, répondre par une contre-proposition adressée à l'auteur, au contenu
  libre (cases, PwnCoins, Clés des deux côtés), mais différente de l'offre reçue. L'auteur l'accepte
  ou la refuse, sans pouvoir contre-proposer à son tour : une négociation compte au plus deux offres.
- **Limites** : une contre-proposition ne compte pas dans les trois propositions par tour de son
  auteur. L'offre à laquelle elle répond compte comme refusée : elle ne peut pas être refaite à
  l'identique dans le même tour, et l'IA qui l'avait faite monte son prix au tour suivant comme
  après un refus.
- **Interface** : la fenêtre de réception d'une offre gagne un bouton « Contre-proposer », qui ouvre
  le panneau de composition prérempli avec l'offre reçue et le partenaire imposé. Une
  contre-proposition reçue s'ouvre dans la même fenêtre, avec le rappel de l'offre de départ et les
  seuls boutons « Accepter » et « Refuser ».
- **IA** : au lieu de refuser une offre, une IA normale ou difficile demande le complément de
  PwnCoins qui la lui ferait accepter, quand l'auteur peut le payer. L'IA facile ne contre-propose
  jamais. Une IA qui reçoit une contre-proposition l'évalue comme toute offre, sans jamais entamer sa
  réserve.
- **Journal** : chaque contre-proposition, puis son acceptation ou son refus, apparaît dans le
  journal. Une partie sauvegardée pendant une contre-proposition reprend sur elle.
- **Tournois** : le rapport compte aussi les contre-propositions, et les critères de force et
  d'équilibre restent tenus.

## Capabilities

### New Capabilities

Aucune.

### Modified Capabilities

- `trading` : nouvelle exigence de contre-proposition. La réponse à une offre, les limites des
  propositions et les événements du journal tiennent compte des contre-propositions.
- `trade-interface` : bouton « Contre-proposer » à la réception, panneau de composition en mode
  contre-proposition, fenêtre de réception d'une contre-proposition, réponse d'une IA à une
  contre-proposition humaine.
- `trade-ai` : contre-proposition des IA normale et difficile, réponse d'une IA à une
  contre-proposition, déterminisme étendu à la contre-proposition, tournois qui comptent les
  contre-propositions.
- `ai-balance-tournament` : le rapport compte les contre-propositions faites et acceptées.
- `options-ai` : en fin de partie limitée ou face à un adversaire proche de l'objectif, l'IA ne
  refuse plus d'emblée un échange qu'elle n'accepte pas tel quel : elle peut contre-proposer un
  prix qui respecte la règle de l'option.
- `game-persistence` : migration des sauvegardes au format précédant les contre-propositions.

## Hors périmètre

- Négociation en plusieurs allers-retours (contre-proposition d'une contre-proposition) : non
  retenu, une négociation compte au plus deux offres.
- Contre-propositions de l'IA qui changent les cases ou les Clés de l'offre : l'IA n'ajuste que les
  PwnCoins. Elle pourra composer des contre-offres plus riches avec l'IA experte par simulation.
- Échange de constructions et promesses futures (« loyer gratuit pendant 3 tours ») : toujours
  exclus.
- Affichage détaillé des différences entre l'offre et la contre-proposition (éléments ajoutés ou
  retirés surlignés) : seul un rappel de l'offre de départ est affiché.

## Impact

- Moteur (`src/engine/trading.ts`, `types.ts`) : action `counterTrade`, champ `original` dans la
  phase `tradeOffer`, événement `tradeCountered`, nouveaux codes d'erreur, requête de validation
  d'une contre-proposition.
- IA (`src/ai/trade/`, `src/ai/levels/`) : génération d'une contre-proposition et réponse à une
  contre-proposition, branchées sur les niveaux normal et difficile.
- Interface (`src/game/interaction.ts`, `TradeComposer.vue`, `TradeOfferDialog.vue`,
  `AiThinking.vue`, `useGameSession.ts`) : mode contre-proposition du panneau, fenêtre de réception,
  messages de l'IA.
- Journal (`src/game/history/journal.ts`) : lignes de contre-proposition, d'acceptation et de
  refus.
- Sauvegarde (`src/game/savedGame.ts`) : format 4, migration du format 3.
- Tournois (`src/ai/tournament/`) : comptage des contre-propositions, relance des tournois de force
  et d'équilibrage.
- Aucune nouvelle dépendance.
