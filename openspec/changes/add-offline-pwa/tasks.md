# Tasks

## 1. Dépendances

- [ ] 1.1 **À lancer par l'utilisateur** : `pnpm add -D vite-plugin-pwa @vite-pwa/assets-generator workbox-window` (`workbox-window` est la dépendance « peer » de `vite-plugin-pwa` requise par le module d'enregistrement). Si pnpm signale le script d'installation de `sharp` comme bloqué, le déclarer dans `allowBuilds` sans l'autoriser. Vérifier que les trois paquets figurent dans les `devDependencies` et que `pnpm type-check` passe toujours.

## 2. Icônes

- [ ] 2.1 Dessiner `public/icon.svg`, originale et aux couleurs du thème sombre néon (symbole Ᵽ ou pion stylisé, liseré néon), avec le motif dans la zone de sécurité centrale de 80 % pour la variante « maskable » ; vérifier son rendu dans un navigateur.
- [ ] 2.2 Ajouter `pwa-assets.config.ts` (préréglage `minimal2023Preset`, source `public/icon.svg`), l'inclure dans `tsconfig.json` et ajouter le script `generate-pwa-assets` au `package.json` ; vérifier que `pnpm generate-pwa-assets` produit dans `public/` les PNG 64, 192, 512, maskable 512, Apple 180 et `favicon.ico`, puis les versionner.

## 3. Manifeste et service worker

- [ ] 3.1 Écrire les tests de `src/pwa/manifest.ts` : nom et nom court « Monopwnly », langue `fr`, `start_url`, `scope` et `id` relatifs, affichage `standalone`, orientation `landscape`, couleurs de fond et de thème égales aux constantes du thème, icônes 192 et 512 dont une `maskable` dont chaque fichier existe dans `public/`.
- [ ] 3.2 Implémenter `src/pwa/manifest.ts` en important les couleurs depuis les constantes du thème ; vérifier que les tests 3.1 passent.
- [ ] 3.3 Configurer `VitePWA` dans `vite.config.ts` : `registerType: 'prompt'`, `injectRegister: false`, manifeste de `src/pwa/manifest.ts`, `includeManifestIcons: false`, `workbox.globPatterns` sans le manifeste, `maximumFileSizeToCacheInBytes` à 4 Mo, `devOptions` désactivé ; ajouter `vite-plugin-pwa/client` aux `types` de `tsconfig.json`. Vérifier avec `pnpm build` que `dist/` contient `sw.js` et `manifest.webmanifest`, et que la liste de précache de `sw.js` contient `index.html`, le script et la feuille de style hachés, le script du Web Worker de l'IA, le manifeste et chaque icône.
- [ ] 3.4 Compléter `index.html` : `theme-color`, `favicon.ico`, icône SVG, `apple-touch-icon` et `apple-mobile-web-app-title` ; vérifier avec `pnpm build` que les liens de `dist/index.html` pointent vers des fichiers présents dans `dist/`.

## 4. Mise à jour

- [ ] 4.1 Écrire les tests de `src/pwa/updateState.ts` avec une fonction d'enregistrement factice : `updateReady` faux au départ, vrai après `onNeedRefresh`, inchangé après `onOfflineReady` ou `onRegisterError`, `applyUpdate()` appelle la fonction de mise à jour avec rechargement, et un état qui reste faux sans enregistrement (développement ou navigateur sans service worker).
- [ ] 4.2 Implémenter `src/pwa/updateState.ts` et le brancher dans `main.ts` / `App.vue`, seulement en production et si `'serviceWorker' in navigator` ; vérifier que les tests 4.1 passent et que `pnpm dev` n'enregistre aucun service worker (onglet Application des DevTools).
- [ ] 4.3 Ajouter à `HomeScreen.test.ts` : bandeau « Nouvelle version disponible » avec bouton « Recharger » affiché quand `updateReady` est vrai, absent sinon, clic qui émet `reload`.
- [ ] 4.4 Ajouter la prop `updateReady` et l'événement `reload` à `HomeScreen`, relier `reload` à `applyUpdate()` dans `App.vue` ; vérifier que les tests 4.3 passent.

## 5. Vérification de bout en bout

- [ ] 5.1 Avec `pnpm build` puis `pnpm preview` : première visite en ligne, puis DevTools hors ligne et rechargement ; vérifier que l'accueil s'affiche, qu'une partie contre deux IA se joue sur plusieurs tours (achats, enchères, constructions des IA), et qu'après fermeture et réouverture hors ligne « Reprendre la partie » fonctionne.
- [ ] 5.2 Mise à jour : modifier un texte, reconstruire et relancer `pnpm preview` pendant qu'une partie est ouverte ; vérifier qu'aucun bandeau n'apparaît pendant la partie, que le bandeau apparaît au retour à l'accueil, que « Recharger » affiche la nouvelle version avec la partie toujours reprenable, puis, dans un second essai, que sans clic la nouvelle version se lance après fermeture de tous les onglets.
- [ ] 5.3 Installabilité : vérifier dans l'onglet Application des DevTools que le manifeste ne signale aucune erreur, installer l'application depuis Chrome sur ordinateur et vérifier qu'elle s'ouvre dans sa propre fenêtre sans barre d'adresse.
- [ ] 5.4 Lancer `pnpm lint`, `pnpm type-check`, `pnpm test` et `pnpm build` ; vérifier qu'ils passent sans erreur.

## 6. Documentation du projet

- [ ] 6.1 Mettre à jour le README (ligne du change, commande `pnpm generate-pwa-assets`, commande `pnpm preview`) et le `TODO.md` (étape de déploiement : HTTPS, `Cache-Control: no-cache` sur `sw.js`, `index.html` et `manifest.webmanifest`, test d'installation sur iPad en paysage) ; vérifier que les commandes citées existent dans `package.json`.
