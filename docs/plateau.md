# Plateau de Monopwnly

Contenu original du plateau : cases, groupes, prix, loyers et cartes. **Proposition à valider**
avant l'implémentation de `add-rules-engine` (voir la section « Décisions » du `TODO.md`). Le moteur
lit ces données depuis `src/engine/board/` ; ce document en est la référence lisible.

## Thème et vocabulaire

Le joueur est un hacker qui prend le contrôle de systèmes informatiques, des plus vieux aux plus
sensibles, et fait payer ceux qui les traversent.

| Notion du genre | Monopwnly |
|---|---|
| Argent | **PwnCoin**, symbole `Ᵽ` (affiché « 1 500 Ᵽ ») |
| Propriété | **Système** (un système piraté appartient au joueur) |
| Groupe de couleur | **Famille** de systèmes |
| Maison | **Backdoor** (4 au maximum par système) |
| Hôtel | **Rootkit** (remplace 4 backdoors) |
| Gare | **Nœud** réseau |
| Compagnie | **Service** |
| Départ | **Boot** |
| Prison | **Quarantaine** |
| Parc | **DMZ** (case de repos) |
| Allez en prison | **Détecté !** |
| Cartes | **Exploit** et **Patch** |
| Carte de sortie de prison | **Clé de déchiffrement** |
| Hypothèque | **Mise en veille** |

## Valeurs générales

| Valeur | Montant |
|---|---|
| Argent de départ | 1 500 Ᵽ |
| Salaire en passant par Boot | 200 Ᵽ (400 Ᵽ en s'y arrêtant, avec l'option « bonus double ») |
| Sortie de quarantaine | 50 Ᵽ |
| Mise en veille | 50 % du prix du système |
| Réactivation | mise en veille + 10 % |
| Revente d'une backdoor ou d'un rootkit | 50 % de son coût |
| Stock de la banque | 32 backdoors, 12 rootkits |

## Les 40 cases

Les cases sont numérotées de 0 à 39 dans le sens du déplacement ; chaque côté du plateau compte
11 cases, coins compris.

| # | Case | Type | Prix |
|---|---|---|---|
| 0 | Boot | coin, départ | |
| 1 | Minitel | Rétro | 60 |
| 2 | Exploit | carte | |
| 3 | Modem 56k | Rétro | 60 |
| 4 | Nœud VPN | nœud | 200 |
| 5 | Rançongiciel | taxe : 200 Ᵽ | |
| 6 | Ampoule Wi‑Fi | Objets connectés | 100 |
| 7 | Frigo connecté | Objets connectés | 100 |
| 8 | Patch | carte | |
| 9 | Caméra IP | Objets connectés | 120 |
| 10 | Quarantaine | coin (simple visite) | |
| 11 | Imprimante réseau | Bureautique | 140 |
| 12 | Messagerie pro | Bureautique | 140 |
| 13 | Datacenter | service | 150 |
| 14 | Intranet | Bureautique | 160 |
| 15 | Exploit | carte | |
| 16 | Forum | Web | 180 |
| 17 | Blog | Web | 180 |
| 18 | Nœud Tor | nœud | 200 |
| 19 | Boutique en ligne | Web | 200 |
| 20 | DMZ | coin, repos | |
| 21 | Fil d'actualité | Social | 220 |
| 22 | Patch | carte | |
| 23 | Messagerie chiffrée | Social | 220 |
| 24 | Plateforme vidéo | Social | 240 |
| 25 | Nœud Proxy | nœud | 200 |
| 26 | Distributeur de billets | Finance | 260 |
| 27 | Exploit | carte | |
| 28 | Néobanque | Finance | 260 |
| 29 | Bourse en ligne | Finance | 280 |
| 30 | Détecté ! | coin, envoi en quarantaine | |
| 31 | Réseau électrique | Infrastructure | 300 |
| 32 | Satellite | Infrastructure | 300 |
| 33 | Cloud | service | 150 |
| 34 | Câble sous-marin | Infrastructure | 320 |
| 35 | Patch | carte | |
| 36 | Nœud Mesh | nœud | 200 |
| 37 | Mainframe d'État | Cœur | 350 |
| 38 | Amende RGPD | taxe : 100 Ᵽ | |
| 39 | Noyau de l'IA | Cœur | 400 |

Décompte : 22 systèmes en 8 familles, 4 nœuds, 2 services, 6 cases carte, 2 taxes, 4 coins.

## Systèmes et loyers

Le loyer de base croît avec la famille : de 4 % du prix pour les Objets connectés à 17 % pour le
Noyau de l'IA. Les loyers avec constructions en sont des multiples fixes (×5, ×14, ×38, ×50, ×62),
arrondis à 5 Ᵽ. Une famille complète sans construction double le loyer de base. Ces valeurs ont
été réajustées d'après le tournoi d'équilibrage entre IA (voir [Équilibrage](#équilibrage)).

| Système | Prix | Base | Famille | 1 BD | 2 BD | 3 BD | 4 BD | Rootkit | Coût BD | Veille |
|---|---|---|---|---|---|---|---|---|---|---|
| **Rétro** | | | | | | | | | | |
| Minitel | 60 | 4 | 8 | 20 | 55 | 150 | 200 | 250 | 50 | 30 |
| Modem 56k | 60 | 4 | 8 | 20 | 55 | 150 | 200 | 250 | 50 | 30 |
| **Objets connectés** | | | | | | | | | | |
| Ampoule Wi‑Fi | 100 | 4 | 8 | 20 | 55 | 150 | 200 | 250 | 50 | 50 |
| Frigo connecté | 100 | 4 | 8 | 20 | 55 | 150 | 200 | 250 | 50 | 50 |
| Caméra IP | 120 | 5 | 10 | 25 | 70 | 190 | 250 | 310 | 50 | 60 |
| **Bureautique** | | | | | | | | | | |
| Imprimante réseau | 140 | 9 | 18 | 45 | 125 | 340 | 450 | 560 | 100 | 70 |
| Messagerie pro | 140 | 9 | 18 | 45 | 125 | 340 | 450 | 560 | 100 | 70 |
| Intranet | 160 | 11 | 22 | 55 | 155 | 420 | 550 | 680 | 100 | 80 |
| **Web** | | | | | | | | | | |
| Forum | 180 | 14 | 28 | 70 | 195 | 530 | 700 | 870 | 100 | 90 |
| Blog | 180 | 14 | 28 | 70 | 195 | 530 | 700 | 870 | 100 | 90 |
| Boutique en ligne | 200 | 16 | 32 | 80 | 225 | 610 | 800 | 990 | 100 | 100 |
| **Social** | | | | | | | | | | |
| Fil d'actualité | 220 | 21 | 42 | 105 | 295 | 800 | 1050 | 1300 | 150 | 110 |
| Messagerie chiffrée | 220 | 21 | 42 | 105 | 295 | 800 | 1050 | 1300 | 150 | 110 |
| Plateforme vidéo | 240 | 23 | 46 | 115 | 320 | 875 | 1150 | 1425 | 150 | 120 |
| **Finance** | | | | | | | | | | |
| Distributeur de billets | 260 | 25 | 50 | 125 | 350 | 950 | 1250 | 1550 | 150 | 130 |
| Néobanque | 260 | 25 | 50 | 125 | 350 | 950 | 1250 | 1550 | 150 | 130 |
| Bourse en ligne | 280 | 28 | 56 | 140 | 390 | 1065 | 1400 | 1735 | 150 | 140 |
| **Infrastructure** | | | | | | | | | | |
| Réseau électrique | 300 | 40 | 80 | 200 | 560 | 1520 | 2000 | 2480 | 200 | 150 |
| Satellite | 300 | 40 | 80 | 200 | 560 | 1520 | 2000 | 2480 | 200 | 150 |
| Câble sous-marin | 320 | 44 | 88 | 220 | 615 | 1670 | 2200 | 2730 | 200 | 160 |
| **Cœur** | | | | | | | | | | |
| Mainframe d'État | 350 | 48 | 96 | 240 | 670 | 1825 | 2400 | 2975 | 200 | 175 |
| Noyau de l'IA | 400 | 68 | 136 | 340 | 950 | 2585 | 3400 | 4215 | 200 | 200 |

BD = backdoor. Le coût d'un rootkit est celui d'une backdoor supplémentaire, les 4 backdoors
retournant à la banque.

### Équilibrage

Le tournoi d'équilibrage (`pnpm test:balance`) joue 400 parties entre 4 IA de niveau normal,
enchères et échanges activés. Il échoue si l'un de ces critères n'est pas tenu : au moins un
échange accepté ; au plus 5 % de parties
interrompues à la limite de sécurité de 300 tours de table ; une durée médiane entre 25 et
80 tours ; un taux de victoire de chaque place dans l'ordre de jeu entre 18 % et 32 % ; aucune
famille dont le rendement (loyers encaissés rapportés au prix et aux constructions investis)
dépasse 3 fois celui de la famille la moins rentable.

Avec les loyers d'origine, les familles bon marché rapportaient trop par rapport aux familles
chères (écart de 4,6). Les loyers de base ont été changés ainsi, les autres niveaux suivant les
multiples ci-dessus : Objets connectés 6, 6, 8 → 4, 4, 5 ; Bureautique 10, 10, 12 → 9, 9, 11 ;
Social 18, 18, 20 → 21, 21, 23 ; Finance 22, 22, 24 → 25, 25, 28 ; Infrastructure 26, 26, 28 →
40, 40, 44 ; Cœur 35, 50 → 48, 68. Rétro et Web n'ont pas changé.

Mesures du 3 novembre 2026 (les deux premières colonnes avant les échanges), du 4 novembre 2026
pour l'avant-dernière colonne et du 5 novembre 2026 pour la dernière :

| Mesure | Loyers d'origine | Loyers réajustés | Avec les échanges | Avec les contre-propositions | Avec l'abandon |
|---|---|---|---|---|---|
| Parties interrompues | 0,5 % | 0,5 % | 0 % | 0,5 % | 0,3 % |
| Durée médiane (90e centile) | 41 tours (73) | 41 tours (69) | 41 tours (66) | 41 tours (66) | 39 tours (69) |
| Victoires de la 1re, 2e, 3e et 4e place | 30,9 / 24,4 / 23,6 / 21,1 % | 27,9 / 24,1 / 23,6 / 24,4 % | 26,5 / 25,0 / 25,0 / 23,5 % | 26,6 / 24,9 / 25,9 / 22,6 % | 26,1 / 26,1 / 24,6 / 23,3 % |
| Rendement Rétro | 0,87 | 0,95 | 0,84 | 0,89 | 0,88 |
| Rendement Objets connectés | 1,30 | 0,96 | 0,85 | 0,88 | 0,87 |
| Rendement Bureautique | 0,84 | 0,85 | 0,78 | 0,81 | 0,83 |
| Rendement Web | 0,76 | 0,82 | 0,78 | 0,84 | 0,85 |
| Rendement Social | 0,46 | 0,52 | 0,51 | 0,50 | 0,52 |
| Rendement Finance | 0,44 | 0,45 | 0,43 | 0,40 | 0,46 |
| Rendement Infrastructure | 0,28 | 0,37 | 0,34 | 0,34 | 0,33 |
| Rendement Cœur | 0,32 | 0,36 | 0,34 | 0,30 | 0,30 |
| Rendement Nœuds | 0,81 | 0,85 | 0,84 | 0,90 | 0,79 |
| Rendement Services | 0,68 | 0,65 | 0,68 | 0,72 | 0,66 |
| Écart entre la famille la plus et la moins rentable | 4,6 (critère non tenu) | 2,7 | 2,5 | 2,96 | 2,93 |
| Échanges acceptés par partie | — | — | 2,0 | 4,7 | 4,4 |
| Contre-propositions faites (acceptées) | — | — | — | 1 961 (1 026) | 1 862 (981) |
| Abandons | — | — | — | — | 389 |

Les échanges n'ont pas demandé de nouveau réajustement des loyers. Les contre-propositions non plus,
mais elles rapprochent l'écart de rendement de sa limite de 3 : avec plus d'échanges conclus, les
familles bon marché se complètent plus souvent et rapportent davantage, tandis que Cœur et Finance
reculent. C'est le premier point à reprendre lors du prochain rééquilibrage des loyers.

L'abandon des IA ne demande pas non plus de réajustement : on compte environ un abandon par partie,
et la durée médiane baisse de deux tours de table. L'écart de rendement reste juste sous sa limite
(2,93).

## Nœuds et services

| Nœuds possédés | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Loyer | 25 | 50 | 100 | 200 |

Prix : 200 Ᵽ chacun, mise en veille 100 Ᵽ.

| Services possédés | 1 | 2 |
|---|---|---|
| Loyer | 4 × total des dés | 10 × total des dés |

Prix : 150 Ᵽ chacun, mise en veille 75 Ᵽ.

## Cartes Exploit (16)

Surtout des déplacements.

| # | Titre | Effet |
|---|---|---|
| 1 | Redémarrage à chaud | Avancez jusqu'à Boot et encaissez le salaire. |
| 2 | Escalade de privilèges | Avancez jusqu'au Noyau de l'IA. |
| 3 | Pivot latéral | Avancez jusqu'à la Boutique en ligne ; salaire si vous passez par Boot. |
| 4 | Ingénierie sociale | Avancez jusqu'au Fil d'actualité ; salaire si vous passez par Boot. |
| 5 | Routage onion | Avancez jusqu'au Nœud Tor ; salaire si vous passez par Boot. |
| 6 | Tunnel chiffré | Avancez jusqu'au nœud suivant. Libre : vous pouvez l'acheter. Possédé par un autre joueur : payez le double du loyer. |
| 7 | Tunnel chiffré | Identique à la carte 6. |
| 8 | Ping | Avancez jusqu'au service suivant. Libre : vous pouvez l'acheter. Possédé par un autre joueur : lancez les dés et payez 10 × le total. |
| 9 | Rollback | Reculez de 3 cases. |
| 10 | Bug bounty | Recevez 150 Ᵽ. |
| 11 | Minage chanceux | Recevez 50 Ᵽ. |
| 12 | Mise à jour forcée | Payez 25 Ᵽ par backdoor et 100 Ᵽ par rootkit. |
| 13 | Phishing raté | Payez 15 Ᵽ. |
| 14 | Repéré par l'antivirus | Allez en quarantaine, sans passer par Boot. |
| 15 | Clé de déchiffrement | Conservez cette carte pour sortir de quarantaine, ou échangez-la. |
| 16 | Conférence de sécurité | Payez 50 Ᵽ à chaque autre joueur. |

## Cartes Patch (16)

Surtout de l'argent.

| # | Titre | Effet |
|---|---|---|
| 1 | Réinitialisation d'usine | Avancez jusqu'à Boot et encaissez le salaire. |
| 2 | Divulgation responsable | Recevez 200 Ᵽ. |
| 3 | Abonnement oublié remboursé | Recevez 100 Ᵽ. |
| 4 | Levée de fonds | Recevez 100 Ᵽ. |
| 5 | Revente de vieux matériel | Recevez 50 Ᵽ. |
| 6 | Victoire au CTF | Recevez 25 Ᵽ. |
| 7 | Dons open source | Recevez 10 Ᵽ. |
| 8 | Serveur de jeu partagé | Chaque autre joueur vous verse 10 Ᵽ. |
| 9 | Facture du fournisseur cloud | Payez 100 Ᵽ. |
| 10 | Assurance cyber | Payez 50 Ᵽ. |
| 11 | Licence expirée | Payez 50 Ᵽ. |
| 12 | Formation obligatoire | Payez 20 Ᵽ. |
| 13 | Audit de sécurité | Payez 40 Ᵽ par backdoor et 115 Ᵽ par rootkit. |
| 14 | Alerte du SOC | Allez en quarantaine, sans passer par Boot. |
| 15 | Clé de déchiffrement | Conservez cette carte pour sortir de quarantaine, ou échangez-la. |
| 16 | Cache vidé | Reculez jusqu'au Minitel (sans passer par Boot). |

Avec l'option « cagnotte de la DMZ », les taxes et les paiements à la banque des cartes (Phishing
raté, Facture, Assurance, Licence, Formation, Mise à jour forcée, Audit) alimentent la cagnotte.
