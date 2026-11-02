# Design

## Context

L'état du moteur (`add-rules-engine`) est déjà du JSON pur et la session de jeu (`add-game-ui`,
`add-heuristic-ai`) centralise toutes les actions, humaines et IA, dans un unique `dispatch`, avec
une file de présentation qui convertit les événements du moteur en étapes d'animation (dés,
déplacement case par case, paiements). Ce change s'accroche à ces deux points. Motivation :
proposal.md ; exigences : `specs/`.

## Goals / Non-Goals

**Goals :**

- Journal et statistiques calculés par des fonctions pures à partir des événements du moteur et de
  l'état qui suit l'action.
- Un format de sauvegarde versionné, validé à la lecture, et un seul module qui touche au stockage.
- Des fonctions extensibles : `add-trading` et `add-game-options` y ajouteront leurs événements sans
  restructuration.

**Non-Goals :**

- Pas d'IndexedDB : une partie sauvegardée pèse quelques centaines de kilo-octets au plus.
- Pas de migration entre versions de format pour la V1 : une version inconnue est rejetée.

## Decisions

### Arborescence

```
src/game/
  persistence.ts            lecture, validation, écriture, suppression
  history/journal.ts        événements → entrées de journal
  history/statistics.ts     événements + état → relevés et compteurs
  history/format.ts         montants (« 1 500 Ᵽ »), accords, noms de cases
src/ui/
  hud/JournalPanel.vue
  screens/StatisticsTab.vue, LineChart.vue
```

### Numéro de tour

Le moteur porte déjà `turnNumber` (un tour de table complet). Le journal regroupe par **tour de
joueur** : un en-tête « Tour <n> — <joueur> » est créé à chaque début de tour d'un joueur, `n` étant
le `turnNumber` du moteur. Les relevés statistiques sont pris au début de chaque tour de table, ce
qui donne une courbe par tour lisible quel que soit le nombre de joueurs.

### Format de sauvegarde

```ts
type SavedGame = {
  formatVersion: 1
  savedAt: string
  status: 'inProgress' | 'finished'
  creation: GameCreationConfig
  engineState: GameState
  journal: JournalEntry[]
  statistics: GameStatistics
}
```

Clé unique `monopwnly.savedGame`. La lecture valide la structure par des gardes de type écrites à la
main (champs présents, `formatVersion` connue, `engineState` cohérent : `boardId` connu, 2 à 6
joueurs, cases possédées existantes et achetables, phase connue). Toute exception de lecture,
d'analyse ou de validation mène au même chemin « sauvegarde illisible ».

`creation` est conservée pour « Rejouer avec les mêmes paramètres » après une reprise.
`add-trading` et `add-game-options` incrémenteront `formatVersion` s'ils modifient la forme de
l'état.

### Moment de la sauvegarde

La sauvegarde est écrite après chaque action acceptée, à partir de l'état du moteur et non de l'état
affiché : elle reflète la vérité même si l'animation est en cours. Le journal sauvegardé contient
donc aussi les entrées pas encore affichées. À la reprise, aucune animation n'est rejouée et tout le
journal est visible, ce qui est cohérent avec un état affiché directement final.

Une enchère entre IA produit beaucoup d'actions rapprochées : l'écriture reste synchrone, mais les
écritures d'une même rafale d'actions IA sans attente d'animation sont regroupées en une seule à la
fin de la rafale (`queueMicrotask`). Une rafale interrompue par un rechargement perd au plus les
mises de cette enchère, que l'IA rejoue à la reprise de façon déterministe.

### Journal synchronisé avec les animations

`journal.ts` produit les entrées dès que le moteur répond. La session stocke la liste complète et un
index « affiché jusqu'à », avancé par chaque étape de présentation terminée. Le panneau ne montre
que les entrées jusqu'à cet index ; passer l'animation avance l'index au bout.

Regroupements :

- un lancer et le déplacement qui suit forment **une** entrée (« Alice lance 4 et 3 et avance sur
  Forum »), le passage par Boot en étant une sous-ligne ;
- une enchère forme **une** entrée résumant le vainqueur et le prix, dépliable en une ligne par mise
  ou abandon ;
- les paiements multiples d'une même carte (« chaque autre joueur ») forment une entrée dépliable.

### Statistiques

`statistics.ts` est une fonction de réduction `(stats, events, stateAfter) → stats` :

- **relevé** au début de chaque tour de table : argent liquide et patrimoine de chaque joueur non
  failli, calculés par la requête de patrimoine du moteur (`queries.ts`), pour ne pas dupliquer sa
  définition ;
- **compteurs** par joueur : loyers perçus, loyers payés, taxes et amendes payées, salaires de Boot,
  cartes piochées, systèmes achetés et dépensé en achats, enchères remportées, backdoors et rootkits
  construits, passages en quarantaine, doubles, tour de faillite et créancier ;
- **rentabilité par case** : loyers perçus par case achetable, toutes parties prenantes confondues,
  pour classer les systèmes, nœuds et services les plus rentables.

### Graphiques

`LineChart.vue` dessine en SVG une courbe par joueur, avec un `viewBox` fixe et une largeur à 100 %.
Axes, graduations arrondies (multiples de 100, 500 ou 1 000 Ᵽ selon l'échelle) et légende sont
calculés par une fonction pure testée. Un joueur en faillite voit sa courbe s'arrêter au tour de sa
faillite.

## Risks / Trade-offs

- [Sauvegarde corrompue par une modification future du type `GameState`] → incrémenter
  `formatVersion` à chaque changement incompatible ; l'ancienne sauvegarde est rejetée proprement.
- [Journal très long en fin de partie] → le panneau n'affiche que les 200 dernières entrées et
  charge les précédentes en remontant.
- [Deux onglets ouverts écrasent mutuellement la sauvegarde] → cas marginal pour un jeu solo ;
  accepté.
- [Écriture perdue au milieu d'une rafale d'enchères IA] → acceptable : le déterminisme de l'IA
  rejoue la même enchère.
