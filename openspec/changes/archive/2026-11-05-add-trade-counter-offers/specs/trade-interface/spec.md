## ADDED Requirements

### Requirement: Composition d'une contre-proposition

Le bouton « Contre-proposer » SHALL ouvrir le panneau de composition prérempli avec l'offre reçue,
vue du destinataire : « Vous donnez » contient ce que l'auteur demandait, « Vous demandez » ce qu'il
offrait. Le partenaire SHALL être l'auteur de l'offre, sans possibilité d'en changer, et le panneau
SHALL NOT afficher de propositions restantes. Le bouton d'envoi SHALL s'intituler « Envoyer la
contre-proposition » et SHALL n'être actif que si le moteur juge la contre-proposition valide ; tant
qu'elle est identique à l'offre reçue, il SHALL être inactif avec la raison « Modifiez l'offre pour
faire une contre-proposition ». Fermer le panneau sans envoyer SHALL ramener à la fenêtre de
réception, l'offre toujours en attente.

#### Scenario: Panneau prérempli

- **WHEN** le joueur 2 humain reçoit l'offre « Forum contre 150 Ᵽ » du joueur 1 et appuie sur « Contre-proposer »
- **THEN** le panneau s'ouvre avec le joueur 1 comme partenaire, sans choix d'un autre joueur, 150 Ᵽ dans « Vous donnez » et Forum dans « Vous demandez »

#### Scenario: Offre inchangée

- **WHEN** le joueur 2 ouvre le panneau de contre-proposition sans rien modifier
- **THEN** le bouton « Envoyer la contre-proposition » est inactif avec la raison « Modifiez l'offre pour faire une contre-proposition »

#### Scenario: Envoi de la contre-proposition

- **WHEN** le joueur 2 porte le montant à 200 Ᵽ et envoie la contre-proposition
- **THEN** le panneau se ferme et la partie passe sur la contre-proposition « 200 Ᵽ contre Forum » adressée au joueur 1

#### Scenario: Fermeture sans envoi

- **WHEN** le joueur 2 ferme le panneau de contre-proposition sans l'envoyer
- **THEN** la fenêtre de réception de l'offre du joueur 1 s'affiche de nouveau

## MODIFIED Requirements

### Requirement: Réception d'une offre

Quand le destinataire d'une offre est humain, une fenêtre SHALL s'ouvrir avec le titre « <auteur>
vous propose un échange », le nom du destinataire, un résumé en deux colonnes « Vous recevez » et
« Vous donnez » (cases avec leur famille et leur état de veille, PwnCoins, Clés), la mise en avant
des cases sur le plateau, et les boutons « Accepter », « Contre-proposer » et « Refuser ». Pour une
contre-proposition, le titre SHALL être « <auteur> vous fait une contre-proposition », la fenêtre
SHALL rappeler l'offre de départ (« Votre offre : Forum contre 150 Ᵽ ») et SHALL NOT proposer
« Contre-proposer ». Aucune autre commande de jeu ne SHALL être proposée tant que l'offre n'est pas
tranchée. La fenêtre SHALL être la même que l'offre vienne d'un humain ou d'une IA.

#### Scenario: Offre d'une IA

- **WHEN** une IA propose Satellite contre 400 Ᵽ à l'humain
- **THEN** la fenêtre affiche « <nom de l'IA> vous propose un échange », Satellite dans « Vous donnez » et 400 Ᵽ dans « Vous recevez »

#### Scenario: Offre entre deux humains

- **WHEN** le joueur 1 humain propose un échange au joueur 2 humain
- **THEN** la fenêtre s'adresse au joueur 2 par son nom, sans écran de passage de main

#### Scenario: Case en veille signalée

- **WHEN** l'offre contient une case en veille
- **THEN** la case porte la mention « en veille » dans le résumé

#### Scenario: Boutons d'une offre de départ

- **WHEN** un humain reçoit une offre de départ
- **THEN** la fenêtre propose « Accepter », « Contre-proposer » et « Refuser »

#### Scenario: Contre-proposition reçue

- **WHEN** Nyx répond à l'offre « Forum contre 150 Ᵽ » du joueur 1 humain par la contre-proposition « 200 Ᵽ contre Forum »
- **THEN** la fenêtre affiche « Nyx vous fait une contre-proposition », le rappel « Votre offre : Forum contre 150 Ᵽ », 200 Ᵽ dans « Vous recevez », Forum dans « Vous donnez », et seulement les boutons « Accepter » et « Refuser »

### Requirement: Réponse d'une IA à une offre humaine

Quand un humain propose un échange à une IA, le HUD SHALL afficher « <nom> étudie votre offre… »
pendant la réflexion. Si l'IA accepte ou refuse, un message SHALL l'indiquer ; si elle répond par
une contre-proposition, la fenêtre de réception SHALL s'ouvrir sur celle-ci, sans message. Quand un
humain répond à une IA par une contre-proposition, le HUD SHALL afficher « <nom> étudie votre
contre-proposition… », puis « <nom> accepte votre contre-proposition » ou « <nom> refuse votre
contre-proposition ». Après une acceptation, le plateau SHALL animer le changement de propriétaire
des cases transférées.

#### Scenario: Offre refusée par une IA

- **WHEN** l'IA refuse l'offre de l'humain
- **THEN** le message « <nom> refuse votre offre » s'affiche et l'humain retrouve ses commandes dans la phase d'origine

#### Scenario: Contre-proposition d'une IA

- **WHEN** l'IA répond à l'offre de l'humain par une contre-proposition
- **THEN** aucun message d'acceptation ou de refus ne s'affiche et la fenêtre « <nom> vous fait une contre-proposition » s'ouvre

#### Scenario: Contre-proposition humaine étudiée

- **WHEN** l'humain envoie une contre-proposition à une IA et qu'elle réfléchit
- **THEN** le HUD affiche « <nom> étudie votre contre-proposition… »

#### Scenario: Contre-proposition humaine acceptée

- **WHEN** l'IA accepte la contre-proposition de l'humain
- **THEN** le message « <nom> accepte votre contre-proposition » s'affiche et les cases changent de propriétaire sur le plateau
