## MODIFIED Requirements

### Requirement: Fin de partie proche

Avec une limite de tours, pendant les 3 derniers tours de table (les tours 28, 29 et 30 pour une
limite de 30), les IA normale et difficile SHALL évaluer leurs décisions par leur patrimoine
immédiat : elles SHALL NOT réactiver de système, SHALL NOT revendre de construction sauf pour régler
une dette, SHALL enchérir jusqu'au prix de la case quand elles en ont les moyens, et SHALL accepter un
échange seulement s'il augmente strictement leur patrimoine. Une contre-proposition qu'elles font
pendant ces tours SHALL augmenter strictement leur patrimoine.

#### Scenario: Pas de réactivation en fin de partie

- **WHEN** la limite est de 30 tours, que le tour de table 28 est en cours et qu'une IA normale a assez d'argent pour réactiver un système
- **THEN** elle ne le réactive pas

#### Scenario: Enchère jusqu'au prix

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours, qu'une IA difficile a 1 000 Ᵽ et qu'une enchère sur le Blog atteint 150 Ᵽ
- **THEN** elle surenchérit, sans dépasser 180 Ᵽ

#### Scenario: Échange qui fait perdre du patrimoine

- **WHEN** la limite est de 30 tours, que le tour de table 28 est en cours et qu'on propose à une IA normale de lui vendre Minitel, au prix de 60 Ᵽ, contre 80 Ᵽ
- **THEN** elle ne l'accepte pas telle quelle et contre-propose 50 Ᵽ contre Minitel

#### Scenario: Échange neutre

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours et qu'on propose à une IA difficile de lui vendre Minitel contre 60 Ᵽ, son prix
- **THEN** elle ne l'accepte pas telle quelle et contre-propose 50 Ᵽ contre Minitel

#### Scenario: Comportement habituel plus tôt

- **WHEN** la limite est de 30 tours et que le tour de table 27 est en cours
- **THEN** les IA normale et difficile prennent les mêmes décisions que sans limite de tours

### Requirement: Adversaire proche de l'objectif

Avec un objectif de patrimoine, quand un adversaire atteint 80 % de l'objectif, l'IA difficile SHALL
NOT accepter d'échange qui augmente le patrimoine de cet adversaire, et sa contre-proposition
éventuelle SHALL NOT l'augmenter ; elle SHALL surenchérir pour l'empêcher de compléter une famille
aux enchères. L'IA normale SHALL refuser les échanges qui complètent une famille de cet adversaire,
sans contre-proposition. La surenchère de blocage SHALL primer sur le plafond de la fin de partie
proche et SHALL NOT faire descendre l'IA sous sa réserve d'argent.

#### Scenario: Échange refusé au meneur

- **WHEN** l'objectif est de 6 000 Ᵽ, que Bob a un patrimoine de 5 100 Ᵽ et propose à une IA difficile de lui vendre la Boutique en ligne, au prix de 200 Ᵽ, contre 220 Ᵽ, échange qui lui est favorable à elle mais augmente aussi le patrimoine de Bob
- **THEN** l'IA difficile ne l'accepte pas telle quelle et contre-propose 200 Ᵽ contre la Boutique en ligne, qui laisse inchangé le patrimoine de Bob

#### Scenario: Famille bloquée aux enchères

- **WHEN** l'objectif est de 6 000 Ᵽ, que Bob a 5 100 Ᵽ de patrimoine, possède le Forum et le Blog, et qu'une enchère porte sur la Boutique en ligne
- **THEN** l'IA difficile surenchérit sur Bob, au-delà du prix de la case si besoin, tant qu'elle reste au-dessus de sa réserve d'argent

#### Scenario: Blocage en fin de partie proche

- **WHEN** la limite est de 30 tours, que le tour de table 29 est en cours, que l'objectif est de 6 000 Ᵽ, que Bob a 5 100 Ᵽ de patrimoine, possède le Forum et le Blog, et qu'une enchère sur la Boutique en ligne atteint 200 Ᵽ
- **THEN** l'IA difficile surenchérit au-delà de 200 Ᵽ tant qu'elle reste au-dessus de sa réserve d'argent

#### Scenario: IA normale

- **WHEN** l'objectif est de 6 000 Ᵽ, que Bob a 5 100 Ᵽ de patrimoine et propose à une IA normale un échange qui lui compléterait la famille Web
- **THEN** l'IA normale refuse, sans contre-proposition
