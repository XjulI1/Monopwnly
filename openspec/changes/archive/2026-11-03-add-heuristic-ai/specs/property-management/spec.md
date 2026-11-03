# Spec Delta

## MODIFIED Requirements

### Requirement: Fiche d'une case

Toucher une case achetable sur le plateau ou dans le panneau des joueurs SHALL ouvrir sa fiche : nom,
famille et sa couleur, prix, table des loyers (base, famille complète, 1 à 4 backdoors, rootkit)
avec le niveau actuel mis en évidence, coût d'une backdoor, valeur de mise en veille et coût de
réactivation, propriétaire et état de veille. Pour un nœud, la fiche SHALL donner les loyers selon le
nombre de nœuds possédés ; pour un service, les multiplicateurs des dés. La fiche d'une case non
achetable SHALL donner son nom et son effet.

#### Scenario: Fiche d'un système construit

- **WHEN** le joueur touche l'Intranet qui porte 2 backdoors
- **THEN** la fiche affiche la table des loyers de l'Intranet avec la ligne « 2 backdoors : 155 Ᵽ » mise en évidence

#### Scenario: Fiche d'un nœud

- **WHEN** le joueur touche le Nœud Tor
- **THEN** la fiche affiche les loyers 25, 50, 100 et 200 Ᵽ selon le nombre de nœuds possédés

#### Scenario: Fermeture

- **WHEN** la fiche est ouverte et que le joueur touche hors de la fiche
- **THEN** la fiche se ferme
