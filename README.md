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
- **Jouable hors ligne et installable.**

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

Les commandes arriveront avec le premier change (`add-rules-engine`) :

```bash
pnpm install       # installer les dépendances
pnpm dev           # lancer l'application en développement
pnpm test          # lancer les tests
pnpm lint          # analyser le code
pnpm type-check    # vérifier les types
pnpm build         # construire la version de production
```

## Licence

[MIT](LICENSE.md).
