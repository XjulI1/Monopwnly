## Why

Monopwnly se joue seul contre l'IA et ne dépend d'aucun serveur une fois chargé : tout le code, le
plateau et la sauvegarde sont dans le navigateur. Pourtant, sans connexion, l'application ne se lance
pas, et sur tablette elle reste un onglet de navigateur avec sa barre d'adresse. La rendre
installable et jouable hors ligne permet de lancer une partie n'importe où (train, avion) comme une
application.

## What Changes

- **Fonctionnement hors ligne** : un service worker met en cache, à la première visite, tous les
  fichiers de l'application ; les visites suivantes se lancent et se jouent sans réseau, sauvegarde
  et reprise comprises.
- **Application installable** : manifeste web (nom « Monopwnly », couleurs du thème sombre néon,
  fenêtre autonome sans barre d'adresse, orientation paysage) et icônes, pour l'installer sur l'écran
  d'accueil d'une tablette ou comme application de bureau.
- **Icône de l'application** : une icône SVG originale aux couleurs du thème (un pion stylisé ou un
  symbole Ᵽ sur fond sombre, liseré néon), déclinée en PNG pour toutes les plateformes, dont l'icône
  Apple et une variante « maskable ».
- **Mise à jour maîtrisée** : une nouvelle version déployée est téléchargée en arrière-plan ; un
  bandeau « Nouvelle version disponible » proposant de recharger s'affiche sur l'écran d'accueil
  seulement, jamais pendant une partie. Sans action de l'utilisateur, la nouvelle version s'applique
  au lancement suivant.
- Le mode développement (`pnpm dev`) reste sans service worker.

## Capabilities

### New Capabilities

- `offline-app` : mise en cache de l'application, lancement et jeu hors ligne, installabilité
  (manifeste, icônes) et mise à jour vers une nouvelle version.

### Modified Capabilities

Aucune : le bandeau de mise à jour est une exigence propre à `offline-app`, l'écran d'accueil garde
son comportement.

## Hors périmètre

- Notifications push, synchronisation en arrière-plan : sans objet pour un jeu solo sans serveur.
- Bouton « Installer l'application » dans l'interface : l'installation passe par le navigateur
  (menu ou icône de la barre d'adresse, « Sur l'écran d'accueil » sur iPad).
- Écran de démarrage (« splash screen ») personnalisé par appareil iOS.
- Migration d'une sauvegarde d'un ancien format après une mise à jour : la gestion des versions de
  sauvegarde reste celle de `game-persistence` (une sauvegarde d'une autre version est rejetée).
- Configuration HTTPS et en-têtes de cache du serveur personnel : à régler au déploiement.

## Impact

- Nouvelles dépendances de développement : `vite-plugin-pwa` (Workbox), `workbox-window` et
  `@vite-pwa/assets-generator` ; `pnpm add -D` à lancer par l'utilisateur.
- `vite.config.ts` : plugin PWA (manifeste, précache, stratégie de mise à jour).
- `public/` : icône SVG source et icônes PNG générées, versionnées dans le dépôt.
- `index.html` : couleur du thème, icônes, métadonnées Apple.
- Nouveau module `src/pwa/` (manifeste, état de mise à jour) et bandeau de mise à jour sur l'écran
  d'accueil.
- Le service worker exige HTTPS (ou `localhost`) : le serveur personnel doit servir l'application en
  HTTPS et ne pas mettre en cache longue durée `index.html` ni `sw.js`.
- Dernier change de la V1 ; il ne dépend fonctionnellement que de `add-game-ui` (écran d'accueil) et
  de `add-save-and-journal` (reprise hors ligne).
