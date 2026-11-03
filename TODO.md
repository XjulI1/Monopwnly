# TODO

Ce qu'il reste à faire pour livrer la V1. Le détail de chaque étape se trouve dans le `tasks.md` du
change correspondant ; ce fichier ne suit que les grandes étapes et les points transverses.

## Avant de commencer

- [x] Relancer `openspec init --tools claude .` hors sandbox pour installer les skills et commandes
  OpenSpec dans `.claude/` (bloqué lors de la création de la feuille de route).
- [x] Relire les artefacts des 8 changes dans `openspec/changes/`.
- [x] Valider le contenu du plateau : [`docs/plateau.md`](docs/plateau.md) (noms, familles, prix,
  loyers, cartes Exploit et Patch).
- [x] Valider chacune des [décisions de règles](#décisions-de-règles) ci-dessous, ou demander sa
  correction dans la spec concernée.

## Décisions de règles

Choix faits là où le genre laisse de la place à l'interprétation, ou là où une application impose
de trancher, validés le 2 novembre 2026. Les specs indiquées reflètent ces décisions.

### Mise en place (`add-rules-engine`, spec `game-setup`)

- [x] **Premier joueur** tiré au sort par le générateur de la partie, sans lancer de dés.
- [x] **Paquets Exploit et Patch** mélangés à la création ; une carte jouée retourne sous son paquet.
  Une Clé de déchiffrement quitte le paquet tant qu'un joueur la détient.

### Déplacement et quarantaine (`add-rules-engine`, specs `movement` et `quarantine`)

- [x] **Double** : le joueur rejoue ; au troisième double d'affilée il part en quarantaine sans
  jouer ce lancer.
- [x] **Sortie de quarantaine** au début du tour : payer 50 Ᵽ, utiliser une Clé de déchiffrement,
  ou tenter un double. Un double libère et fait avancer du total, sans rejouer. Après trois échecs,
  le joueur paie 50 Ᵽ et avance du total du troisième lancer.
- [x] **Loyers perçus en quarantaine** par défaut (l'option inverse vient avec `add-game-options`).

### Achat et enchères (`add-rules-engine`, spec `property-acquisition`)

- [x] **Enchères activées par défaut**, désactivables à la création. Le joueur qui a refusé
  l'achat y participe aussi.
- [x] **Déroulé de l'enchère** : tour de table à partir du joueur qui a refusé, mise minimale de
  10 Ᵽ puis toute mise strictement supérieure ; un joueur qui passe est sorti de l'enchère. Elle se
  termine quand un seul enchérisseur reste. Personne ne peut miser plus que son argent liquide. Si
  tout le monde passe, la case reste à la banque.

### Constructions et mise en veille (`add-rules-engine`, spec `development`)

- [x] **Construction uniforme** par défaut : l'écart de backdoors entre deux systèmes d'une même
  famille ne dépasse jamais 1, à la construction comme à la revente (l'option « construction
  libre » vient avec `add-game-options`).
- [x] **Constructions possibles pendant son tour seulement** (avant ou après le lancer), et
  pendant le règlement d'une dette pour la revente et la mise en veille.
- [x] **Pénurie** : 32 backdoors et 12 rootkits ; sans stock, impossible de construire.
- [x] **Pas de mise en veille d'un système construit** ni d'un système d'une famille construite.

### Dettes et faillite (`add-rules-engine`, spec `debt-and-bankruptcy`)

- [x] **Paiement automatique** quand l'argent suffit ; sinon la partie passe en règlement de dette :
  le joueur revend, met en veille (et échange, après `add-trading`), puis paie ou déclare faillite.
- [x] **Faillite envers un joueur** : ses constructions sont revendues à la banque, puis son argent,
  ses systèmes (mis en veille ou non) et ses Clés passent au créancier, sans les 10 % d'intérêts.
- [x] **Faillite envers la banque** : ses systèmes redeviennent libres et actifs, sans enchère, et
  ses Clés retournent sous leur paquet.
- [x] **Paiements multiples** (« payez à chaque autre joueur ») réglés un créancier après l'autre ;
  une faillite au milieu profite au créancier en cours.

### Échanges (`add-trading`, spec `trading`)

- [x] **Seul le joueur dont c'est le tour propose** un échange, avant ou après son lancer ou
  pendant le règlement d'une dette. Le destinataire accepte ou refuse, sans contre-proposition en
  V1.
- [x] **Contenu d'un échange** : systèmes sans construction dans leur famille, PwnCoins, Clés de
  déchiffrement. Un système en veille reste en veille chez le nouveau propriétaire, sans intérêts.
- [x] **Limite anti-harcèlement** : trois propositions au plus par tour et par joueur, et une même
  proposition refusée ne peut pas être refaite dans le même tour.

### Fins de partie (`add-game-options`, spec `game-end-conditions`)

- [x] **Patrimoine** = argent liquide + prix des systèmes actifs + valeur de veille des systèmes en
  veille + coût des constructions.
- [x] **Limite de tours** : un tour de table complet compte pour un tour ; à la fin du dernier, le
  plus gros patrimoine gagne, égalité départagée par l'argent liquide puis par l'ordre de jeu.
- [x] **Objectif de patrimoine** vérifié à la fin du tour de chaque joueur.

## Changes de la V1

À appliquer et archiver dans cet ordre (`/opsx:apply` puis `/opsx:archive`) : chaque change suppose
les précédents implémentés.

- [x] `add-rules-engine` : socle du projet et moteur de règles
- [x] `add-3d-board` : plateau 3D TresJS
- [x] `add-game-ui` : écrans, HUD du tour, dés animés, achats, enchères, constructions
- [x] `add-heuristic-ai` : IA heuristique en trois niveaux
- [x] `add-save-and-journal` : sauvegarde automatique, journal, statistiques de fin
- [ ] `add-trading` : échanges entre joueurs, IA qui négocie
- [ ] `add-game-options` : règles optionnelles et fins de partie alternatives
- [ ] `add-offline-pwa` : application installable et jouable hors ligne

## Après la V1

- [ ] IA experte par simulation (sur le modèle de Risky).
- [ ] Contre-propositions dans les échanges.
- [ ] Rééquilibrage des loyers d'après les statistiques des parties simulées.
