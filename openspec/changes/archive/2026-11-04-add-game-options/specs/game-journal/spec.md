# Spec Delta

## MODIFIED Requirements

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
| Bonus double de Boot | « <joueur> reçoit le bonus double de Boot » |
| Achat | « <joueur> achète <case> pour <montant> » |
| Refus d'achat | « <joueur> n'achète pas <case> » |
| Enchère remportée | « <joueur> remporte <case> aux enchères pour <montant> » |
| Enchère sans preneur | « Personne ne prend <case> aux enchères » |
| Loyer | « <joueur> paie <montant> de loyer à <joueur> pour <case> » |
| Loyer non perçu | « <joueur> ne perçoit pas de loyer (en quarantaine) » (le joueur est le propriétaire) |
| Taxe | « <joueur> paie <montant> : <case> » |
| Cagnotte alimentée | « <joueur> alimente la cagnotte de <montant> » |
| Cagnotte remportée | « <joueur> remporte la cagnotte de la DMZ : <montant> » |
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
| Victoire | « <joueur> remporte la partie : <motif> », le motif étant « dernier hacker solvable », « limite de <n> tours atteinte » ou « objectif de <montant> atteint » |

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

#### Scenario: Loyer non perçu au journal

- **WHEN** Bob s'arrête sur le Forum d'Alice alors qu'Alice est en quarantaine et que l'option « pas de loyer en quarantaine » est active
- **THEN** le journal contient « Alice ne perçoit pas de loyer (en quarantaine) »

#### Scenario: Victoire par la limite de tours

- **WHEN** Carol gagne à la limite de 30 tours
- **THEN** le journal contient « Carol remporte la partie : limite de 30 tours atteinte »
