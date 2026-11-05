# Design

## Context

Les échanges (`add-trading`) passent par la phase `{ kind: 'tradeOffer'; offer; resume }`, où
`expectedActor` désigne `offer.to`, et par les actions `proposeTrade`, `acceptTrade` et
`rejectTrade` de `src/engine/trading.ts`. `rememberRefusal` tient à jour `tradeLimits.thisTurn`
(offres refusées du tour) et `tradeLimits.refusedAsks` (refus par case demandée, qui font monter le
prix des offres d'achat de l'IA normale). Côté IA, `answerOffer` (`src/ai/levels/strategy.ts`)
accepte ou refuse selon `evaluateOffer` et `optionsRefuseOffer`, et `cheapestAccepted`
(`src/ai/trade/proposeOffers.ts`) cherche déjà par dichotomie le plus petit montant qui fait accepter
une offre. Côté interface, `TradeComposer.vue` compose une offre à partir d'un `TradeDraft`
(`src/game/interaction.ts`) et `TradeOfferDialog.vue` affiche l'offre en attente. La sauvegarde est
au format 3, avec une chaîne de migrations dans `src/game/savedGame.ts`. Motivation :
`proposal.md` ; exigences : `specs/`.

## Goals / Non-Goals

**Goals :**

- Réutiliser la phase, la fenêtre de réception et le panneau de composition existants plutôt que
  d'introduire un second circuit pour les contre-propositions.
- Une contre-proposition de l'IA qui ne dépend que de sa vue et reste rapide (budget de 20 ms par
  décision du test de robustesse).
- Des sauvegardes au format 3 qui restent reprenables, même arrêtées sur une offre en attente.

**Non-Goals :**

- Les offres que l'IA propose elle-même ne changent pas. Elle n'anticipe pas qu'on puisse lui
  répondre par une contre-proposition.
- Pas de délai de réponse ni d'expiration d'une offre.

## Decisions

### Phase et action

La phase `tradeOffer` gagne un champ :

```ts
{ kind: 'tradeOffer'; offer: TradeOffer; resume: TradeResume; original: TradeOffer | null }
```

`original` vaut `null` pour une offre de départ. Pour une contre-proposition, il contient l'offre à
laquelle elle répond. `offer` est toujours l'offre en attente : `expectedActor` (`offer.to`), la
mise en avant des cases et l'acceptation fonctionnent sans changement pour une contre-proposition.

Nouvelle action `{ type: 'counterTrade'; playerId; offer }`, autorisée en `tradeOffer` au seul
destinataire, grâce au contrôle générique de `applyAction` sur `expectedActor`.

- *Alternative écartée : une phase `tradeCounter` distincte.* Elle aurait dupliqué
  `expectedActor`, le choix du panneau, l'aiguillage de l'IA et la sauvegarde, pour les mêmes deux
  réponses possibles.
- *Alternative écartée : un booléen `countered`.* La fenêtre (rappel « Votre offre : … ») et le
  journal ont besoin de l'offre de départ elle-même.
- *Alternative écartée : réutiliser `proposeTrade` en phase `tradeOffer`.* Il porte la limite de
  trois propositions et le contrôle de phase d'une offre de départ ; une action distincte garde
  chaque règle simple, ainsi que l'aiguillage du journal et de l'IA.

### Validation

Une requête exportée `counterProblem(state, counter)` sert au moteur comme au panneau de
composition. Elle contrôle, dans cet ordre :

1. phase `tradeOffer`, sinon `WRONG_PHASE` ;
2. `original === null`, sinon `COUNTER_NOT_ALLOWED` (« contre-proposition impossible ») ;
3. `counter.from` est le destinataire de l'offre et `counter.to` son auteur, sinon
   `INVALID_TRADE` ;
4. contenu différent de l'offre reçue, sinon `COUNTER_UNCHANGED`, avec le message « Modifiez l'offre
   pour faire une contre-proposition », repris tel quel par le panneau. La comparaison se fait par
   `tradeKey` entre la contre-proposition et l'offre reçue inversée
   (`{ from: to, to: from, give: receive, receive: give }`), donc sans tenir compte de l'ordre des
   éléments ;
5. `offerProblem` pour le contenu (propriété, constructions, fonds, Clés).

La limite de trois propositions n'est pas contrôlée : une contre-proposition n'est pas comptée.

### Effets et événements

- `counterTrade` appelle `rememberRefusal(state, original)`, comme un refus. L'offre de départ ne
  peut donc plus être refaite dans le tour, et chaque case qu'elle demandait compte un refus dans
  `refusedAsks`, ce qui fait monter le prix de l'IA normale au tour suivant sans code
  supplémentaire. Le moteur passe ensuite en `{ kind: 'tradeOffer', offer: counter, resume, original }`
  et émet `tradeCountered { offer, original }`.
- `acceptTrade` et `rejectTrade` restent inchangés pour le transfert, le retour à `resume` et la
  mémorisation du refus de l'offre en attente. Leurs événements portent désormais
  `original: TradeOffer | null`.
- *Alternative écartée : déduire « c'était une contre-proposition » de l'état d'avant l'action.* Le
  message de l'IA (`useGameSession`) et le comptage du tournoi ne voient que les événements.

### Sauvegarde

Le format passe à 4. La migration du format 3 ajoute `original: null` à une phase `tradeOffer` en
cours, et ne touche à rien d'autre. Le validateur de phase exige `original`, nul ou offre valide.
Le journal sauvegardé est déjà du texte mis en forme : il ne change pas.

### IA : contre-proposition

Nouveau module `src/ai/trade/counterOffer.ts`, avec `counterOffer(ctx): TradeOffer | null` :

- L'offre reçue est ajustée d'un complément `δ` en faveur de l'IA, par pas de `TRADE_CASH_STEP`.
  Le flux net d'argent de l'auteur vers l'IA vaut `give.cash − receive.cash + δ`. S'il est positif,
  il est porté par `give.cash` ; sinon `receive.cash` porte son opposé. Ainsi, l'IA paie moins
  avant que l'auteur ne paie plus.
- `accepts(δ)` combine `evaluateOffer(view, ajustée, level).accept` et
  `!optionsRefuseOffer(ctx, ajustée)`. Les deux sont monotones en `δ` : le gain croît de `δ`, le
  seuil d'au plus `0,2 × δ`, et les refus liés aux options dépendent du patrimoine de l'auteur après
  l'échange, qui décroît avec `δ`. La recherche du plus petit `δ` se fait donc par dichotomie. Elle
  est extraite de `cheapestAccepted` en une fonction partagée (`smallestAcceptedStep`).
- Borne : `δ ≤ COUNTER_MAX_SHARE × exchanged`, avec `COUNTER_MAX_SHARE = 0,5` dans `constants.ts`
  et `exchanged` la valeur totale échangée de l'offre de départ, calculée par `evaluateOffer`. Il
  faut aussi que le flux net reste au plus égal à l'argent de l'auteur. La valeur totale échangée
  sert de référence, et non ce que l'IA reçoit : avec ce que l'IA reçoit, une offre de 50 Ᵽ pour
  Minitel aurait été refusée d'emblée, faute d'une marge suffisante, et une offre en cases seules
  serait bornée à zéro.
- La contre-proposition est l'offre ajustée inversée (`from` : l'IA, `to` : l'auteur).

`answerOffer` devient :

- offre de départ : accepter si l'IA accepte, sinon contre-proposer si le niveau n'est pas facile
  et que `counterOffer` trouve une offre, sinon refuser ;
- contre-proposition (`original !== null`) : `answerCounter`.

### IA : réponse à une contre-proposition

`answerCounter(ctx)` accepte :

- en règlement de dette de l'IA (`resume.kind === 'debt'` et `resume.debtor === me`), quand l'argent
  net reçu atteint la somme des valeurs de veille des cases cédées. L'IA ne cède pas une case pour
  moins que ce que la mise en veille lui rapporterait ;
- sinon, quand `evaluateOffer` accepte, que `optionsRefuseOffer` ne refuse pas, et que
  `me.cash − argent donné ≥ ctx.reserve`, plus, au niveau difficile, le coût d'une backdoor sur
  chaque système des familles que l'échange lui complète (`buildCost`, déjà utilisé par
  `crossOffer`). Ce sont les mêmes bornes que pour ses propres offres.

Dans tous les autres cas, elle refuse.

### Interface

- **Ouverture** : nouveau bouton `counterTrade` (« Contre-proposer ») dans les boutons de la phase
  `tradeOffer`, quand `original === null`. Il remplit `interaction.trade` avec
  `{ partner: offer.from, give: offer.receive, receive: offer.give, counter: true }`. `TradeDraft`
  gagne `counter: boolean`.
- **Panneau** : `composerView` accepte la phase `tradeOffer` pour un brouillon de
  contre-proposition dont l'acteur est le destinataire, et le valide par `counterProblem` au lieu de
  `validateTrade`. `TradeComposer.vue` affiche alors « Contre-proposition à <nom> », le partenaire
  sans sélecteur, aucun compteur de propositions restantes, et le bouton « Envoyer la
  contre-proposition ». Le bouton d'envoi garde l'identifiant `proposeTrade` ; `pressButton` émet
  `counterTrade` quand `draft.counter` est vrai. `closeTrade` vide `interaction.trade`, ce qui
  réaffiche la fenêtre de réception. Pendant la composition, le panneau a la priorité sur la
  fenêtre, et la mise en avant des cases suit le brouillon plutôt que l'offre en attente.
- **Fenêtre** : `TradeOfferDialog.vue` choisit son titre selon `original` et affiche le rappel
  « Votre offre : … ». Le texte d'une offre (« Forum contre 150 Ᵽ ») est extrait de `journal.ts`
  vers `src/game/history/format.ts`, partagé par le journal et la fenêtre. La mention « en veille »
  reste propre au journal, qui la passe en paramètre.
- **IA** : `AiThinking.vue` affiche « étudie votre contre-proposition… » quand l'offre en attente
  vient d'un humain et que `original` n'est pas nul. `announceAnswer` choisit « votre offre » ou
  « votre contre-proposition » selon `event.original`, et n'affiche rien pour `tradeCountered` :
  la fenêtre de réception suffit.

### Journal

- `tradeCountered` → « Joueur 1 fait une contre-proposition à Nyx : 120 Ᵽ contre Forum ».
- `tradeAccepted` et `tradeRejected` avec `original` non nul → « Nyx accepte (refuse) la
  contre-proposition de Joueur 1 : … ». Sans `original`, les lignes restent celles d'aujourd'hui.

### Tournois et partie de référence

- `runTournament` compte les événements `tradeCountered` (`countered`) et les `tradeAccepted` dont
  `original` n'est pas nul (`counterAccepted`) dans `report.trades`. Le tournoi d'équilibrage les
  imprime.
- Le test `noOptionRegression` rejoue une partie de référence entre IA. Les contre-propositions
  changent volontairement son déroulement. `comparableEvent` retire `original` quand il est nul,
  comme il le fait déjà pour les champs ajoutés par `add-game-options`. Ainsi, la première
  différence de l'instantané régénéré doit être un `tradeCountered`, ce qui se vérifie avant
  d'accepter le nouvel instantané. L'intitulé du test cesse de citer « before the game options ».

## Risks / Trade-offs

- [Les contre-propositions entre IA font sortir les tournois de leurs critères : écart normal /
  difficile, durée des parties] → relancer les deux tournois. Ajuster d'abord `COUNTER_MAX_SHARE`,
  puis `TRADE_ACCEPT_THRESHOLD`, jamais les loyers dans ce change.
- [Un humain sonde le prix de l'IA par des offres basses] → c'est le but recherché : l'IA annonce
  son prix. La limite de trois propositions par tour et l'interdiction de répéter une offre
  refusée bornent ce sondage.
- [Le scénario « Famille offerte à un adversaire » conduit désormais l'IA normale à
  contre-proposer] → le scénario exige seulement qu'elle n'accepte pas l'offre telle quelle. La
  borne de `COUNTER_MAX_SHARE` limite le prix qu'elle demande.
- [La recherche du complément ralentit les décisions de l'IA] → environ log₂(nombre de pas)
  évaluations, chacune avec une copie d'état ; le test de robustesse vérifie le budget de 20 ms.
- [Régénérer l'instantané de la partie de référence masque une régression] → vérifier que la
  première différence est une contre-proposition avant de l'accepter.

## Migration Plan

- Sauvegardes au format 3 : migrées vers le format 4 au chargement (`original: null` sur une offre
  en attente).
- Retour arrière : une version antérieure de l'application traite une sauvegarde au format 4 comme
  illisible et la supprime. C'est acceptable pour un projet personnel, à condition de ne revenir en
  arrière qu'en dehors d'une partie en cours.
