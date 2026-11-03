# Spec Delta

## MODIFIED Requirements

### Requirement: Joueur qui doit agir

Le moteur SHALL exposer une requête indiquant le joueur qui doit agir : le joueur courant en phases
avant le lancer, décision d'achat et après le lancer ; l'enchérisseur attendu pendant une enchère ;
le débiteur pendant un règlement de dette ; le destinataire pendant une offre d'échange ; aucun
joueur quand la partie est finie.

#### Scenario: Enchérisseur attendu

- **WHEN** la partie est en enchère et c'est au joueur 3 de miser alors que c'est le tour du joueur 1
- **THEN** la requête désigne le joueur 3

#### Scenario: Débiteur hors de son tour

- **WHEN** le joueur 1 tire « Serveur de jeu partagé » et que le joueur 2 n'a pas assez d'argent pour lui verser 10 Ᵽ
- **THEN** la requête désigne le joueur 2

#### Scenario: Destinataire d'une offre d'échange

- **WHEN** le joueur 1 propose un échange au joueur 2 pendant son tour
- **THEN** la requête désigne le joueur 2 jusqu'à sa réponse
