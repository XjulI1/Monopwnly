# Spec Delta

## Purpose

Permettre de lancer et de jouer à Monopwnly sans connexion réseau, de l'installer comme une
application sur tablette ou ordinateur, et de passer à une nouvelle version sans jamais interrompre
une partie.

## ADDED Requirements

### Requirement: Mise en cache de l'application

Dans la version de production, l'application SHALL enregistrer un service worker qui met en cache,
dès la première visite, tous les fichiers nécessaires à son fonctionnement : page, scripts (dont
celui du Web Worker de l'IA), styles, icônes et manifeste. Aucun fichier nécessaire au jeu SHALL NOT
être chargé depuis un autre domaine.

#### Scenario: Première visite

- **WHEN** l'utilisateur ouvre l'application pour la première fois avec une connexion
- **THEN** une fois la page chargée, tous les fichiers de la version de production sont en cache

#### Scenario: Liste du cache

- **WHEN** la version de production est construite
- **THEN** la liste des fichiers mis en cache contient la page d'accueil, chaque script et feuille de style générés, le script du Web Worker de l'IA, le manifeste et chaque icône

### Requirement: Jeu hors ligne

Une fois les fichiers en cache, l'application SHALL se lancer et rester entièrement jouable sans
connexion : création de partie, partie contre l'IA, sauvegarde automatique, reprise et écran de fin.

#### Scenario: Lancement sans réseau

- **WHEN** l'utilisateur ouvre l'application hors ligne après une première visite
- **THEN** l'écran d'accueil s'affiche normalement

#### Scenario: Partie hors ligne

- **WHEN** l'utilisateur crée une partie contre deux IA hors ligne et joue plusieurs tours
- **THEN** les IA achètent, enchérissent et construisent normalement et la sauvegarde est mise à jour après chaque action

#### Scenario: Reprise hors ligne

- **WHEN** l'utilisateur ferme l'application en pleine partie puis la rouvre hors ligne
- **THEN** l'accueil propose « Reprendre la partie » et la reprise fonctionne

### Requirement: Application installable

L'application SHALL fournir un manifeste web qui la rend installable sur tablette et sur
ordinateur : nom « Monopwnly », affichage autonome sans barre d'adresse, orientation paysage,
couleurs de fond et de thème reprenant celles de l'interface, et icônes de 192 et 512 pixels dont une
variante « maskable ». La page SHALL déclarer une icône pour l'écran d'accueil d'iPadOS. Le
manifeste SHALL utiliser des adresses relatives, pour que l'application s'installe aussi quand elle
est servie sous un sous-chemin.

#### Scenario: Contenu du manifeste

- **WHEN** la version de production est construite
- **THEN** le manifeste déclare le nom « Monopwnly », l'affichage autonome, l'orientation paysage, une adresse de démarrage relative et des icônes de 192 et 512 pixels dont une « maskable »

#### Scenario: Lancement depuis l'écran d'accueil

- **WHEN** l'utilisateur lance l'application installée sur une tablette
- **THEN** elle s'ouvre en plein écran, sans barre d'adresse, sur l'écran d'accueil du jeu

### Requirement: Mise à jour vers une nouvelle version

Quand une nouvelle version est déployée, l'application SHALL la télécharger en arrière-plan sans
modifier la version en cours d'utilisation. Une fois la nouvelle version prête, un bandeau
« Nouvelle version disponible » avec un bouton « Recharger » SHALL s'afficher sur l'écran d'accueil.
Le bandeau SHALL NOT s'afficher sur les écrans de création, de partie ou de fin de partie ; si la
nouvelle version devient prête pendant une partie, le bandeau SHALL apparaître au retour à
l'accueil. « Recharger » SHALL activer la nouvelle version et recharger la page. Si l'utilisateur
n'agit pas, la nouvelle version SHALL s'appliquer au lancement suivant de l'application.

#### Scenario: Nouvelle version prête sur l'accueil

- **WHEN** une nouvelle version devient prête alors que l'écran d'accueil est affiché
- **THEN** le bandeau « Nouvelle version disponible » s'affiche avec le bouton « Recharger »

#### Scenario: Nouvelle version prête pendant une partie

- **WHEN** une nouvelle version devient prête pendant une enchère
- **THEN** aucun bandeau ne s'affiche pendant la partie, et le bandeau s'affiche dès que l'utilisateur revient à l'accueil

#### Scenario: Recharger

- **WHEN** l'utilisateur clique sur « Recharger »
- **THEN** la nouvelle version est activée et la page se recharge sur l'écran d'accueil, la partie sauvegardée restant reprenable

#### Scenario: Pas d'action de l'utilisateur

- **WHEN** l'utilisateur ignore le bandeau, ferme l'application puis la rouvre
- **THEN** c'est la nouvelle version qui se lance

### Requirement: Absence de service worker

En mode développement, l'application SHALL NOT enregistrer de service worker. Si le navigateur ne
prend pas en charge les service workers ou si leur enregistrement échoue, l'application SHALL
fonctionner normalement en ligne, sans message d'erreur.

#### Scenario: Mode développement

- **WHEN** l'application est lancée avec `pnpm dev`
- **THEN** aucun service worker n'est enregistré

#### Scenario: Navigateur sans service worker

- **WHEN** l'application s'ouvre dans un navigateur qui ne prend pas en charge les service workers
- **THEN** l'écran d'accueil s'affiche normalement et aucun bandeau de mise à jour ne s'affiche
