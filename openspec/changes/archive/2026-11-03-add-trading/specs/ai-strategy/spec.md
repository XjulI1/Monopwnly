# Spec Delta

## MODIFIED Requirements

### Requirement: Règlement des dettes

En règlement de dette, une IA SHALL payer dès que le premier paiement restant est couvert. Sinon,
elle SHALL lever des fonds dans cet ordre : revente des backdoors, puis, aux niveaux normal et
difficile, proposition de vente d'une case hors famille complète (voir `trade-ai`), puis mise en
veille des cases hors famille complète, puis mise en veille des familles complètes sans
construction. Les niveaux normal
et difficile SHALL, dans chaque étape, sacrifier d'abord ce qui rapporte le moins de loyer espéré ;
le niveau facile SHALL suivre l'ordre du plateau. Une IA SHALL déclarer faillite seulement quand son
patrimoine disponible ne couvre pas le premier paiement restant.

#### Scenario: Mise en veille plutôt que faillite

- **WHEN** une IA doit 250 Ᵽ, a 100 Ᵽ en poche et possède Forum et Nœud Tor sans famille complète
- **THEN** elle met en veille au moins une de ces cases puis paie, sans déclarer faillite

#### Scenario: Ordre de sacrifice

- **WHEN** une IA difficile doit lever 25 Ᵽ et possède Minitel et Satellite, hors famille complète
- **THEN** elle met en veille la case au plus faible loyer espéré et conserve l'autre active

#### Scenario: Faillite inévitable

- **WHEN** une IA doit 2 000 Ᵽ et que son patrimoine disponible est de 800 Ᵽ
- **THEN** elle déclare faillite

### Requirement: Écart de force entre niveaux

Les niveaux SHALL se distinguer en force : dans un tournoi à trois joueurs facile, normal et difficile, joué sur des graines fixées avec chaque
ordre de jeu à parts égales, le nombre de victoires SHALL être strictement croissant du facile au
difficile, et le niveau difficile SHALL gagner au moins 45 % des parties terminées.

#### Scenario: Tournoi de force

- **WHEN** on joue 180 parties facile / normal / difficile, échanges compris, avec les six ordres de jeu à parts égales
- **THEN** les victoires sont strictement croissantes par niveau et le difficile en remporte au moins 45 % des parties terminées
