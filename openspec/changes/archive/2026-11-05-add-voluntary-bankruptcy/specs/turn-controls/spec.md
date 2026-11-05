## ADDED Requirements

### Requirement: Abandon

Pendant son tour, avant ou après le lancer, le HUD SHALL proposer à un joueur humain un bouton
« Abandonner », présenté à l'écart des actions du tour, dans un style qui signale une action
destructrice, et masqué en mode gestion. Le bouton SHALL ouvrir une confirmation rappelant que le
joueur se déclare en faillite, quitte la partie et que ses systèmes retournent à la banque. Confirmer
SHALL transmettre `declareBankruptcy` ; annuler SHALL laisser le tour inchangé. Quand un joueur
abandonne, humain ou IA, le plateau SHALL annoncer « <nom> abandonne », au lieu de « <nom> fait
faillite » réservé à une faillite subie.

#### Scenario: Bouton avant le lancer

- **WHEN** c'est à Alice, humaine, de jouer avant le lancer
- **THEN** le HUD propose « Abandonner » en plus de « Lancer les dés », « Gérer mes systèmes » et « Échanger »

#### Scenario: Bouton après le lancer

- **WHEN** Alice, humaine, a lancé les dés et peut terminer son tour
- **THEN** le HUD propose « Abandonner » en plus de « Fin du tour », « Gérer mes systèmes » et « Échanger »

#### Scenario: Pas de bouton en mode gestion

- **WHEN** Alice a ouvert le mode gestion
- **THEN** « Abandonner » n'est pas proposé

#### Scenario: Confirmation de l'abandon

- **WHEN** Alice touche « Abandonner » puis confirme
- **THEN** l'action `declareBankruptcy` est transmise, Alice apparaît barrée et ses systèmes redeviennent libres sur le plateau

#### Scenario: Annulation de l'abandon

- **WHEN** Alice touche « Abandonner » puis annule
- **THEN** le tour continue sans changement et aucune action n'est transmise

#### Scenario: Annonce de l'abandon d'une IA

- **WHEN** l'IA Ada abandonne
- **THEN** le plateau annonce « Ada abandonne »

#### Scenario: Annonce d'une faillite subie

- **WHEN** Bob fait faillite pendant le règlement d'une dette
- **THEN** le plateau annonce « Bob fait faillite »
