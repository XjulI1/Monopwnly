# Monopwnly

Jeu de plateau original d'achat de systèmes et de loyers, au thème cyber, en application web avec
un plateau en 3D vu du haut, jouable seul contre l'ordinateur sur ordinateur ou tablette en mode
paysage (1024 px de large minimum).

> Projet en cours de conception : la feuille de route est décrite dans `openspec/changes/` et
> l'avancement dans [`TODO.md`](TODO.md).

## Le jeu

Chaque joueur est un hacker qui parcourt un réseau de 40 cases, prend le contrôle des systèmes sur
lesquels il s'arrête (du Minitel au Noyau de l'IA), y installe des **backdoors** puis des
**rootkits**, et fait payer un loyer en **PwnCoins** (Ᵽ) à ceux qui les traversent. Le dernier
joueur solvable l'emporte.

- **Plateau original** : 22 systèmes en 8 familles, 4 nœuds réseau, 2 services, des cartes
  **Exploit** et **Patch**, une **quarantaine** et une **DMZ**. Le détail est dans
  [`docs/plateau.md`](docs/plateau.md).
- **Règles du genre** : achat ou enchère, loyers, familles complètes, constructions uniformes,
  mise en veille (hypothèque), dettes et faillite.
- **2 à 6 joueurs**, humains sur le même appareil ou IA.
- **Adversaires IA** en trois niveaux : facile, normal et difficile. Ils achètent, enchérissent,
  construisent et négocient des échanges.
- **Échanges** de systèmes, de PwnCoins et de Clés de déchiffrement entre joueurs, IA comprises.
- **Options** : enchères désactivables, cagnotte de la DMZ, bonus double sur Boot, construction
  libre, pas de loyer en quarantaine, partie limitée en tours ou objectif de patrimoine.
- **Plateau 3D** façon jeu de société : cases en relief, pions qui avancent case par case, dés
  animés, vitesse d'animation réglable.
- **Sauvegarde automatique** dans le navigateur, journal de partie et statistiques de fin.
- **Jouable hors ligne et installable** sur l'écran d'accueil d'une tablette ou comme application
  de bureau.

### Sauvegarde, journal et statistiques

- **Sauvegarde automatique** : la partie est enregistrée dans le navigateur après chaque action,
  humaine ou IA. Après un rechargement, l'accueil propose « Reprendre la partie » avec les joueurs,
  le tour et la date de la sauvegarde, et la partie repart exactement où elle s'était arrêtée,
  décision d'achat, enchère ou règlement de dette compris.
- **Quitter la partie** ramène à l'accueil sans rien perdre. Lancer une nouvelle partie alors
  qu'une autre est en cours demande confirmation avant de la remplacer.
- Une partie terminée reste disponible (« Voir la dernière partie ») tant que l'on n'a pas quitté
  l'écran de fin.
- Une sauvegarde illisible ou d'une ancienne version est écartée avec un message. Si le navigateur
  bloque le stockage (navigation privée stricte, données de site bloquées), on joue normalement et
  un avertissement indique que la partie ne pourra pas être sauvegardée.
- **Journal** : chaque action est décrite en français dans un panneau repliable, regroupée par tour
  et aux couleurs des joueurs. Les enchères et les cartes qui touchent plusieurs joueurs se
  déplient ligne par ligne. Une action n'apparaît qu'une fois son animation jouée, pour ne pas
  dévoiler le résultat des dés.
- **Statistiques de fin** : courbes du patrimoine et de l'argent liquide de chaque joueur au fil
  des tours, tableau récapitulatif (loyers perçus et payés, taxes, achats, enchères,
  constructions, quarantaines, doubles, faillites) et classement des cinq cases les plus
  rentables.

### Échanges

- Le bouton **« Échanger »** ouvre un panneau où l'on choisit son partenaire, puis ce que l'on donne
  et ce que l'on demande : systèmes sans construction dans leur famille, nœuds, services,
  PwnCoins par pas de 10 Ᵽ et Clés de déchiffrement. Les cases choisies s'allument sur le plateau.
- On peut proposer avant ou après son lancer, et pendant un règlement de dette, même hors de son
  tour, pour éviter la faillite. Trois propositions au plus par tour, et une offre refusée ne peut
  pas être refaite à l'identique dans le même tour.
- Le destinataire accepte ou refuse, sans contre-proposition. Une case en veille le reste chez son
  nouveau propriétaire.
- Les IA évaluent chaque offre selon leur niveau : l'IA facile ne regarde que les prix, les IA
  normale et difficile se méfient d'une offre qui compléterait une famille adverse. Elles proposent
  aussi des échanges, aux humains comme entre elles. Le détail est dans [`docs/ia.md`](docs/ia.md).

### Hors ligne et installation

- Après une première visite en ligne, l'application se lance et se joue **sans réseau** : partie
  contre l'IA, sauvegarde et reprise comprises.
- Elle s'**installe** depuis le navigateur (icône d'installation de la barre d'adresse sur
  ordinateur, « Sur l'écran d'accueil » sur iPad) et s'ouvre alors dans sa propre fenêtre, en
  paysage, sans barre d'adresse.
- Une **nouvelle version** déployée se télécharge en arrière-plan. Un bandeau « Nouvelle version
  disponible » propose de recharger, sur l'écran d'accueil seulement, jamais en pleine partie. Sans
  action, la nouvelle version s'applique au lancement suivant.
- En développement (`pnpm dev`), aucun service worker n'est enregistré : le mode hors ligne se
  teste avec `pnpm build` puis `pnpm preview`.

## Stack technique

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup lang="ts">`) et [Vite](https://vite.dev/)
- TypeScript strict
- [TresJS](https://tresjs.org/) (Three.js pour Vue) pour le rendu WebGL
- [Tailwind CSS](https://tailwindcss.com/) pour l'interface
- [Vitest](https://vitest.dev/) pour les tests
- [pnpm](https://pnpm.io/) comme gestionnaire de paquets

Le moteur de règles est écrit en TypeScript pur, sans dépendance à Vue ni à Three.js. Il est
déterministe (même graine et mêmes actions donnent la même partie) et son état se sérialise
directement en JSON. L'interface, le plateau 3D et l'IA s'appuient tous sur ce moteur.

## Méthode

Le projet suit [OpenSpec](https://github.com/Fission-AI/OpenSpec) : chaque étape est un *change*
avec sa proposition, ses specs, son design et ses tâches, implémenté en TDD avec `/opsx:apply`
puis archivé avec `/opsx:archive`.

## Démarrage

```bash
pnpm install       # installer les dépendances
pnpm dev           # lancer l'application en développement
pnpm test          # lancer les tests
pnpm lint          # analyser le code
pnpm type-check    # vérifier les types
pnpm build         # construire la version de production
pnpm preview       # servir la version construite (service worker et mode hors ligne actifs)
pnpm generate-pwa-assets  # régénérer les icônes PNG de public/ depuis public/icon.svg
```

## Licence

[MIT](LICENSE.md).
