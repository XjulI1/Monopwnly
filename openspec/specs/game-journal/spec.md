# game-journal Specification

## Purpose
Garder une trace lisible de tout ce qui se passe dans la partie, pour suivre les tours des IA, savoir
qui a payé quoi à qui et comprendre l'évolution de la partie.

## Requirements

### Requirement: Entrées du journal

Chaque événement du moteur SHALL produire une entrée en français dans le journal, rattachée au
joueur qui en est l'auteur et au numéro de tour. Les montants SHALL être écrits avec une espace
insécable comme séparateur de milliers et le symbole Ᵽ (« 1 500 Ᵽ »). Les formulations SHALL être
les suivantes :

| Événement | Entrée |
|---|---|
| Début de tour | « Tour <n> — <joueur> » (en-tête de groupe) |
| Lancer et déplacement | « <joueur> lance <d1> et <d2> et avance sur <case> » |
| Double | « … (double) » ajouté à l'entrée du lancer |
| Passage par Boot | « <joueur> passe par Boot et reçoit <montant> » |
| Achat | « <joueur> achète <case> pour <montant> » |
| Refus d'achat | « <joueur> n'achète pas <case> » |
| Enchère remportée | « <joueur> remporte <case> aux enchères pour <montant> » |
| Enchère sans preneur | « Personne ne prend <case> aux enchères » |
| Loyer | « <joueur> paie <montant> de loyer à <joueur> pour <case> » |
| Taxe | « <joueur> paie <montant> : <case> » |
| Carte | « <joueur> pioche <Exploit ou Patch> : <titre> — <effet> » |
| Clé de déchiffrement conservée | « <joueur> garde une Clé de déchiffrement » |
| Entrée en quarantaine | « <joueur> est placé en quarantaine » |
| Tentative de sortie ratée | « <joueur> lance <d1> et <d2> sans faire de double (tentative <n> sur 3) » |
| Sortie de quarantaine | « <joueur> sort de quarantaine (<amende, amende après trois échecs, clé ou double>) » |
| Déplacement sans lancer | « <joueur> avance sur <case> » / « … recule sur <case> » (après l'amende forcée, par exemple) |
| Construction | « <joueur> installe une backdoor sur <case> » / « … un rootkit sur <case> » |
| Revente | « <joueur> revend une backdoor de <case> » / « … le rootkit de <case> » |
| Mise en veille | « <joueur> met <case> en veille et reçoit <montant> » |
| Réactivation | « <joueur> réactive <case> pour <montant> » |
| Dette | « <joueur> doit réunir <montant> » (total des paiements restants) |
| Paiement après une dette | « <joueur> paie <montant> à <joueur ou la banque> » |
| Faillite | « <joueur> fait faillite au profit de <joueur ou la banque> » |
| Victoire | « <joueur> remporte la partie » |

#### Scenario: Lancer et déplacement

- **WHEN** Alice lance 4 et 3 depuis Boot
- **THEN** le journal contient « Alice lance 4 et 3 et avance sur Frigo connecté »

#### Scenario: Loyer avec séparateur de milliers

- **WHEN** Bob paie 1 365 Ᵽ de loyer à Alice pour la Néobanque
- **THEN** l'entrée est « Bob paie 1 365 Ᵽ de loyer à Alice pour Néobanque »

#### Scenario: Carte piochée

- **WHEN** Carol pioche la carte Patch « Victoire au CTF »
- **THEN** le journal contient « Carol pioche Patch : Victoire au CTF — reçoit 25 Ᵽ »

#### Scenario: Élision devant une voyelle

- **WHEN** Bob fait faillite au profit d'Alice
- **THEN** l'entrée est « Bob fait faillite au profit d'Alice »

### Requirement: Entrées condensées

Les lancers suivis du passage par Boot SHALL former une seule entrée avec une sous-ligne pour le
salaire. Les mises d'une même enchère SHALL être regroupées en une seule entrée résumant le résultat,
dépliable en une ligne par mise ou abandon ; tant que l'enchère dure, l'entrée s'intitule « Enchère
sur <case> ». Les paiements d'une même carte à plusieurs joueurs SHALL former une seule entrée
dépliable. Les conséquences directes d'une carte (déplacement, salaire de Boot, entrée en
quarantaine, Clé de déchiffrement conservée, montant calculé selon les constructions) SHALL être
décrites dans l'effet de l'entrée de la carte plutôt que dans des entrées séparées. Une faillite
SHALL se déplier en une ligne pour les constructions revendues, l'argent cédé, les systèmes et les
Clés transmis.

#### Scenario: Enchère condensée

- **WHEN** Alice refuse le Nœud Proxy, puis mise 10 Ᵽ, Bob 50 Ᵽ, Alice 120 Ᵽ et Bob passe
- **THEN** le journal contient « Alice n'achète pas Nœud Proxy », puis une entrée « Alice remporte Nœud Proxy aux enchères pour 120 Ᵽ » dépliable en 4 lignes

#### Scenario: Carte qui déplace

- **WHEN** Alice pioche la carte Exploit « Rollback » sur la case Exploit qui suit l'Intranet
- **THEN** le journal contient « Alice pioche Exploit : Rollback — recule sur Messagerie pro »

#### Scenario: Carte qui envoie en quarantaine

- **WHEN** Alice pioche la carte Patch « Alerte du SOC »
- **THEN** le journal contient « Alice pioche Patch : Alerte du SOC — est placé en quarantaine » et aucune autre entrée de quarantaine

#### Scenario: Conférence de sécurité

- **WHEN** Alice pioche « Conférence de sécurité » dans une partie à 4 joueurs
- **THEN** le journal contient une seule entrée pour la carte, dépliable en 3 paiements de 50 Ᵽ

### Requirement: Synchronisation avec les animations

Une entrée SHALL n'apparaître qu'une fois l'animation correspondante jouée : un lancer n'est pas
annoncé avant la fin de l'animation des dés et du pion. Passer l'animation SHALL afficher aussitôt
toutes les entrées en attente.

#### Scenario: Pas de spoiler des dés

- **WHEN** un lancer est en cours d'animation
- **THEN** son entrée n'est pas encore visible dans le journal

#### Scenario: Animation passée

- **WHEN** l'utilisateur passe l'animation d'un tour d'IA
- **THEN** toutes les entrées de ce tour apparaissent aussitôt

### Requirement: Panneau du journal

Le HUD SHALL offrir un panneau de journal repliable, regroupé par tour, où chaque entrée porte la
couleur de son auteur. Le panneau SHALL défiler automatiquement vers la dernière entrée, sauf si
l'utilisateur a fait défiler vers le haut. Le journal SHALL être conservé dans la sauvegarde.

#### Scenario: Défilement automatique

- **WHEN** une nouvelle entrée arrive alors que le panneau affiche la fin du journal
- **THEN** le panneau défile pour montrer la nouvelle entrée

#### Scenario: Lecture de l'historique

- **WHEN** l'utilisateur a remonté le journal et qu'une nouvelle entrée arrive
- **THEN** la position de lecture ne bouge pas et un indicateur « Nouvelles actions » apparaît
