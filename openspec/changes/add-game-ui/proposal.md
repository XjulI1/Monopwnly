## Why

Avec le moteur (`add-rules-engine`) et le plateau 3D (`add-3d-board`), il manque ce qui fait un
jeu : créer une partie, comprendre à qui c'est le tour et ce qu'on peut faire, lancer les dés et voir
son pion avancer, acheter, enchérir, construire, régler ses dettes. Ce change rend le jeu jouable de
bout en bout, d'abord entre humains sur le même écran, ce qui permet de valider règles et ergonomie
avant d'ajouter l'IA.

## What Changes

- **Écrans** : accueil, création de partie, partie en cours, fin de partie.
- **Création de partie** : 2 à 6 joueurs humains (nom, couleur), réglage des enchères, graine
  aléatoire.
- **HUD du tour** : joueur courant, phase en français, dernier lancer ; panneau des joueurs avec
  l'argent de chacun au format `1 500 Ᵽ`, ses systèmes groupés par famille, ses Clés de
  déchiffrement, la quarantaine et la faillite.
- **Contrôles du tour** : lancer, sortie de quarantaine (payer, utiliser une Clé, tenter un double),
  relance après un double, fin du tour ; seules les actions légales sont proposées et les erreurs
  du moteur sont affichées.
- **Dés et présentation** : deux dés animés, double signalé, pion qui avance case par case,
  passage par Boot, paiements visibles sur l'argent des joueurs, carte Exploit ou Patch affichée
  avant son effet ; vitesse d'animation réglable (lente, normale, rapide, instantanée).
- **Gestion des systèmes** : fiche d'un système (loyers, coûts, propriétaire), construction et
  revente de backdoors et de rootkits, mise en veille et réactivation, depuis le plateau.
- **Décision d'achat et enchère** : panneau d'achat ou de refus, puis enchère en tour de table avec
  mise rapide et passe.
- **Règlement de dette** : montant dû et créancier, revente et mise en veille guidées, paiement ou
  faillite confirmée.
- Pas d'écran de passage de main : aucune information n'est secrète dans ce jeu.
- Remplacement de l'écran de démonstration du plateau.

## Capabilities

### New Capabilities

- `game-screens` : navigation entre accueil, création, partie et fin de partie.
- `game-creation` : formulaire de création d'une partie et validation de la configuration.
- `turn-controls` : HUD, panneau des joueurs, actions du tour, quarantaine, erreurs du moteur.
- `dice-display` : dés animés, déplacement du pion, cartes affichées, paiements, vitesse d'animation.
- `property-management` : fiche d'un système, constructions, revente, mise en veille et réactivation.
- `auction-interface` : décision d'achat et enchère en tour de table.
- `debt-interface` : règlement d'une dette et déclaration de faillite.

### Modified Capabilities

(aucune)

## Hors périmètre

- Joueurs IA : `add-heuristic-ai` (la création ne propose ici que des humains).
- Sauvegarde, reprise, journal et statistiques : `add-save-and-journal`.
- Échanges entre joueurs : `add-trading`.
- Règles optionnelles et fins de partie alternatives : `add-game-options`.
- Sons et musique : non retenus pour la V1.

## Impact

- Nouvelles dépendances à installer par l'utilisateur (`pnpm add`) : `tailwindcss`,
  `@tailwindcss/vite` ; en dev, `@vue/test-utils` et `happy-dom` pour les tests de composants.
- Nouveaux dossiers `src/game/` (session de jeu, contrôleur d'interaction, présentation) et `src/ui/`
  (écrans et composants du HUD).
- `src/App.vue` devient le routeur d'écrans ; l'écran de démonstration du plateau disparaît.
- Dépend de `add-rules-engine` et `add-3d-board`. Ni le moteur ni le plateau ne changent de
  comportement.
