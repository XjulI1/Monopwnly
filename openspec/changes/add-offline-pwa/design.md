# Design

## Context

Monopwnly est une SPA Vite sans aucune ressource externe à l'exécution : le plateau et les cartes
sont importés à la construction, les libellés des cases sont dessinés sur canvas, les polices sont
celles du système, et la seule donnée persistante est la sauvegarde en `localStorage`
(`game-persistence`). L'IA tourne dans un Web Worker (`add-heuristic-ai`), qui produit un fichier de
script séparé. L'application sera déployée par copie de `dist/` sur un serveur personnel, peut-être
sous un sous-chemin (option `base` de Vite). Motivation : proposal.md ; exigences :
`specs/offline-app/spec.md`.

## Goals / Non-Goals

**Goals :**

- Précache complet de la version de production, Web Worker de l'IA compris, versionné par empreinte
  de contenu, sans liste de fichiers à maintenir à la main.
- Une seule source de vérité pour le manifeste, testée par Vitest.
- La logique « une nouvelle version est prête » isolée de l'API du service worker, pour être testée
  sans navigateur.

**Non-Goals :**

- Pas de cache à l'exécution (`runtimeCaching`) : aucune requête ne sort de l'origine.
- Pas de vérification périodique des mises à jour : le navigateur vérifie le service worker à chaque
  lancement, ce qui suffit pour un déploiement manuel et rare.
- Pas de service worker en développement (`devOptions` désactivé).

## Decisions

### `vite-plugin-pwa` en mode `generateSW`

Le plugin génère le service worker Workbox, la liste de précache avec les empreintes des fichiers
produits par Vite (dont le script du Web Worker de l'IA), le manifeste, et fournit le module virtuel
`virtual:pwa-register` qui expose l'événement « nouvelle version prête ». La version 2 accepte
Vite 8.

Alternative écartée : un service worker écrit à la main, qui obligerait à lister les fichiers hachés,
versionner le cache, nettoyer les anciens caches et gérer l'attente de la nouvelle version : c'est
exactement ce que fait Workbox, en plus fragile.

### Mise à jour en mode `prompt`

`registerType: 'prompt'` : le nouveau service worker s'installe en arrière-plan puis attend, sans
`skipWaiting` ni `clientsClaim`, si bien que la version en cours n'est jamais remplacée sous les
pieds du joueur. Le rappel `onNeedRefresh` passe l'état « mise à jour prête » à vrai ;
« Recharger » appelle `updateSW(true)`, qui active le service worker en attente puis recharge la
page. Sans action, le navigateur active la nouvelle version quand plus aucune fenêtre n'utilise
l'ancienne, c'est-à-dire au lancement suivant.

Alternative écartée : `autoUpdate`, qui recharge la page dès que la nouvelle version est prête et
ramènerait le joueur à l'accueil en pleine partie, voire en pleine enchère.

### Module `src/pwa/`

```
src/pwa/
  manifest.ts         options du manifeste (importées par vite.config.ts)
  updateState.ts      état « mise à jour prête » et action « appliquer »
```

`updateState.ts` exporte une fonction qui reçoit la fonction d'enregistrement en paramètre
(`registerSW` du module virtuel en production, un double en test) et renvoie un `ref` booléen
`updateReady` et une fonction `applyUpdate()`. `main.ts` ne l'appelle qu'en production
(`import.meta.env.PROD`) et seulement si `'serviceWorker' in navigator` ; ailleurs, `updateReady`
reste faux. Une erreur d'enregistrement (`onRegisterError`) est ignorée : l'application fonctionne
alors comme avant. Le type du module virtuel vient de `vite-plugin-pwa/client`, ajouté aux `types`
de `tsconfig.json`.

Le moteur et l'IA ne sont pas concernés : rien de ce module n'y est importé.

### Bandeau sur l'accueil

`App.vue` détient l'état de mise à jour et le passe à `HomeScreen` par une prop `updateReady` ; le
bandeau fait partie de `HomeScreen` et émet `reload`. Comme `HomeScreen` n'est monté que sur l'écran
d'accueil, le bandeau ne peut pas apparaître ailleurs, et un état devenu vrai pendant une partie
s'affiche naturellement au retour à l'accueil. Le bandeau n'est pas refermable : il disparaît avec
le rechargement ou au lancement suivant.

Alternative écartée : un bandeau global dans `App.vue` filtré sur l'écran courant, qui dupliquerait
la logique d'écran.

### Manifeste

Défini dans `src/pwa/manifest.ts` et passé au plugin : `name` et `short_name` « Monopwnly »,
`description` en français, `lang: 'fr'`, `id`, `start_url` et `scope` à `'./'` (relatifs, pour le
sous-chemin), `display: 'standalone'`, `orientation: 'landscape'`, `background_color` et
`theme_color` repris des variables CSS du thème sombre néon de `add-game-ui` : fond de `body`
(`--color-void`) et fond des panneaux du HUD (`--color-panel`). La couleur d'encre, d'abord
envisagée pour `theme_color`, est écartée : elle donnerait une barre de titre claire au-dessus d'une
interface sombre. Les deux valeurs viennent de `src/theme.ts` ; un test vérifie qu'elles restent
égales aux variables de `style.css` et à la balise `theme-color` d'`index.html`, pour qu'un
changement de palette ne crée pas d'écart.

`standalone` plutôt que `fullscreen` : iPadOS ne connaît que `standalone`, et sur ordinateur
`fullscreen` empêche de redimensionner la fenêtre.

### Icônes

Une icône source `public/icon.svg` dessinée à la main, originale (aucun élément repris d'un jeu
existant), aux couleurs du thème, avec une marge de sécurité pour la variante « maskable ». Les PNG
sont produits par `@vite-pwa/assets-generator` (préréglage `minimal2023Preset` : 64, 192, 512,
maskable 512, Apple 180, `favicon.ico`) via un script `pnpm generate-pwa-assets`, puis
**versionnés** dans `public/`. L'icône source étant déjà pleine page, avec son motif dans la zone de
sécurité, les variantes « maskable » et Apple sont produites sans la marge ni le fond blanc du
préréglage, sur le fond du thème.

Alternative écartée : l'option `pwaAssets` du plugin, qui génère les icônes à chaque construction et
rendrait `sharp` (binaire natif) indispensable au build ; l'icône change rarement.

### Précache

`globPatterns: ['**/*.{js,css,html,svg,png,ico}']` (le plugin ajoute lui-même le manifeste) et
`maximumFileSizeToCacheInBytes` porté à 4 Mo : le script principal, Three.js compris, est proche de
la limite par défaut de Workbox (2 Mo). `navigateFallback` sur `index.html` et nettoyage des anciens
caches (valeurs par défaut du plugin).

## Risks / Trade-offs

- [Le script principal dépasse un jour la limite de précache et serait silencieusement exclu] →
  limite relevée à 4 Mo ; la vérification de la liste de précache fait partie des tâches.
- [Le script du Web Worker de l'IA absent du précache : la partie se lance hors ligne mais l'IA ne
  joue pas] → vérification explicite de sa présence dans la liste de précache et partie contre l'IA
  hors ligne dans la vérification de bout en bout.
- [Sur iPad, une application installée est rarement fermée complètement, la mise à jour « au
  lancement suivant » peut tarder] → le bandeau sur l'accueil permet de l'appliquer à la main.
- [Une nouvelle version change le format de sauvegarde : la partie en cours devient illisible] →
  comportement inchangé de `game-persistence` (sauvegarde rejetée et signalée) ; une migration est
  hors périmètre.
- [Le serveur met en cache `sw.js` ou `index.html` longtemps et les mises à jour ne sont jamais
  vues] → consigne de déploiement : `Cache-Control: no-cache` sur `sw.js`, `index.html` et
  `manifest.webmanifest`, HTTPS obligatoire.
- [`sharp`, dépendance de `@vite-pwa/assets-generator`, déclare un script d'installation que pnpm
  bloque par défaut] → ses binaires précompilés suffisent ; le déclarer dans `allowBuilds` si pnpm
  le demande, sans l'autoriser.

## Migration Plan

Premier déploiement : `pnpm build`, copie de `dist/` sur un serveur HTTPS avec les en-têtes de cache
ci-dessus. Retour arrière : déployer une version construite avec `selfDestroying: true` dans les
options du plugin, qui désinscrit le service worker et vide ses caches chez les clients.
