# property-management Specification

## Purpose
Permettre de consulter n'importe quelle case et de gérer ses systèmes : construire et revendre des
backdoors et des rootkits, mettre en veille et réactiver, aux moments où le moteur l'autorise.

## Requirements

### Requirement: Fiche d'une case

Toucher une case achetable sur le plateau ou dans le panneau des joueurs SHALL ouvrir sa fiche : nom,
famille et sa couleur, prix, table des loyers (base, famille complète, 1 à 4 backdoors, rootkit)
avec le niveau actuel mis en évidence, coût d'une backdoor, valeur de mise en veille et coût de
réactivation, propriétaire et état de veille. Pour un nœud, la fiche SHALL donner les loyers selon le
nombre de nœuds possédés ; pour un service, les multiplicateurs des dés. La fiche d'une case non
achetable SHALL donner son nom et son effet.

#### Scenario: Fiche d'un système construit

- **WHEN** le joueur touche l'Intranet qui porte 2 backdoors
- **THEN** la fiche affiche la table des loyers de l'Intranet avec la ligne « 2 backdoors : 170 Ᵽ » mise en évidence

#### Scenario: Fiche d'un nœud

- **WHEN** le joueur touche le Nœud Tor
- **THEN** la fiche affiche les loyers 25, 50, 100 et 200 Ᵽ selon le nombre de nœuds possédés

#### Scenario: Fermeture

- **WHEN** la fiche est ouverte et que le joueur touche hors de la fiche
- **THEN** la fiche se ferme

### Requirement: Mode gestion

Le bouton « Gérer mes systèmes » SHALL mettre en avant sur le plateau, quand le joueur courant peut
gérer ses systèmes (avant le lancer, après le lancer, ou pendant le règlement de sa dette), ses
cases sur lesquelles au moins une action de gestion est légale. Toucher une de ces cases SHALL
ouvrir sa fiche avec les boutons de gestion. Un bouton « Terminer » SHALL quitter le mode gestion.

#### Scenario: Cases gérables

- **WHEN** le joueur possède toute la famille Rétro et le Blog, et touche « Gérer mes systèmes »
- **THEN** le Minitel, le Modem 56k et le Blog sont mis en avant et les autres cases sont atténuées

#### Scenario: Fiche d'un autre joueur

- **WHEN** en mode gestion le joueur touche un système d'un autre joueur
- **THEN** la fiche s'ouvre sans bouton de gestion

### Requirement: Construire et revendre

La fiche d'un système du joueur en mode gestion SHALL proposer « Construire » (`buildBackdoor`) avec
le coût, qui pose une backdoor ou le rootkit après 4 backdoors, et « Revendre » (`sellBackdoor`) avec
le montant récupéré. Un bouton dont l'action est illégale SHALL être désactivé avec la raison donnée
par le moteur (famille incomplète, construction non uniforme, stock épuisé, argent insuffisant,
système en veille).

#### Scenario: Construire une backdoor

- **WHEN** le joueur possède toute la famille Rétro, a assez d'argent et touche « Construire » sur la fiche du Minitel
- **THEN** l'action `buildBackdoor` est transmise, une backdoor apparaît sur le Minitel et 50 Ᵽ sont débités

#### Scenario: Construction non uniforme

- **WHEN** le Minitel porte une backdoor et le Modem 56k aucune
- **THEN** le bouton « Construire » de la fiche du Minitel est désactivé avec la raison de l'uniformité

#### Scenario: Passage au rootkit

- **WHEN** le système porte 4 backdoors et que la construction est légale
- **THEN** le bouton affiche « Installer un rootkit »

### Requirement: Mettre en veille et réactiver

La fiche d'un système du joueur en mode gestion SHALL proposer « Mettre en veille » (`mortgage`) avec
le montant reçu, ou « Réactiver » (`unmortgage`) avec le coût de réactivation, selon son état. Un
bouton dont l'action est illégale SHALL être désactivé avec la raison donnée par le moteur.

#### Scenario: Mise en veille

- **WHEN** le joueur touche « Mettre en veille » sur la fiche du Blog sans construction dans la famille Web
- **THEN** l'action `mortgage` est transmise, 90 Ᵽ sont crédités et le Blog est affiché atténué

#### Scenario: Système construit

- **WHEN** un système de la famille porte une backdoor
- **THEN** le bouton « Mettre en veille » est désactivé avec la raison donnée par le moteur

#### Scenario: Réactivation

- **WHEN** le joueur touche « Réactiver » sur la fiche du Blog en veille avec assez d'argent
- **THEN** l'action `unmortgage` est transmise et le Blog redevient actif
