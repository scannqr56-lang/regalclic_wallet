# Plan de simplification UX — RegalClic Wallet

> **Objectif** : transformer l’expérience actuelle en un parcours guidé, progressif et rassurant pour des restaurateurs peu techniques.  
> **Public** : restaurateurs / commerces locaux, peu à l’aise avec l’IA, le marketing et les outils complexes.  
> **Statut** : document d’analyse et de cadrage — **aucune implémentation** dans ce fichier.  
> **Dernière analyse** : juin 2026 — codebase `regalclic_wallet`.

---

## 1. Audit de l’expérience actuelle

### 1.1 Pages principales existantes

| Zone | Route | Page | Rôle actuel |
|------|-------|------|-------------|
| **Auth** | `/auth` | `AuthPage` | Connexion / inscription restaurateur |
| **Accueil** | `/dashboard` | `DashboardHomePage` | Vue d’ensemble + raccourcis |
| **Commerce** | `/dashboard/business` | `BusinessSettingsPage` | Nom, logo, couleurs, adresse, carte Wallet preview |
| **Programme** | `/dashboard/program` | `ProgramSettingsPage` | Type points/tampons, seuil, récompense |
| **Offres promo** | `/dashboard/offers` | `OffersPage` | CRUD campagnes Wallet, activation, notifications test |
| **Assistant IA** | `/dashboard/ai-assistant` | `AiAssistantHomePage` | Hub génération + checklist IA |
| | `/dashboard/ai-assistant/upload` | `AiAssistantUploadPage` | Upload menu PDF/photo |
| | `/dashboard/ai-assistant/menu/:id` | `AiAssistantMenuPage` | Extraction + édition menu |
| | `/dashboard/ai-assistant/profile` | `AiAssistantProfilePage` | Questionnaire 8 questions (profil IA) |
| | `/dashboard/ai-assistant/suggestions` | `AiAssistantSuggestionsPage` | Hub validation (offres, récompenses, notifs, calendrier) |
| | `/dashboard/ai-assistant/rewards` | `AiAssistantRewardsPage` | Génération récompenses seule |
| | `/dashboard/ai-assistant/offers` | `AiAssistantOffersPage` | Génération offres seule |
| | `/dashboard/ai-assistant/notifications` | `AiAssistantNotificationsPage` | Génération notifications seule |
| | `/dashboard/ai-assistant/calendar` | `AiAssistantCalendarPage` | Calendrier marketing 30 j |
| | `/dashboard/ai-assistant/history` | `AiAssistantHistoryPage` | Historique des générations |
| **QR** | `/dashboard/qr` | `QrPage` | QR inscription clients |
| **Scanner** | `/dashboard/scan` | `ScanPage` | Créditer points/tampons en caisse |
| **Clients** | `/dashboard/customers` | `CustomersPage` | Liste clients |
| | `/dashboard/customers/:id` | `CustomerDetailPage` | Fiche client |
| **Admin** | `/admin/merchants` | `AdminMerchantsPage` | Gestion commerces (interne) |
| **Public** | `/join/:slug` | `JoinPage` | Inscription client Wallet |

**Total restaurateur** : ~18 écrans dashboard + 9 écrans assistant IA = **27 points d’entrée** potentiels.

---

### 1.2 Actions disponibles par page

#### Accueil (`DashboardHomePage`)

| Action | Type |
|--------|------|
| Voir stats (clients, points/tampons, récompenses en attente) | Lecture |
| Bandeau « Premier client » → QR + Scanner | Navigation |
| 5 cartes raccourcis : Commerce, Programme, QR, Scanner, Clients | Navigation |

**Absent** : lien vers l’assistant, checklist globale, « prochaine étape ».

---

#### Commerce (`BusinessSettingsPage`)

| Action | Type |
|--------|------|
| Modifier nom, slug, adresse, téléphone, réseaux | Formulaire |
| Upload logo + image hero Wallet | Upload |
| Couleurs carte, message promo, CGU | Formulaire |
| Aperçu carte Wallet en direct | Preview |
| Enregistrer | Primaire |

**Volume** : formulaire long (~15 champs), sans progression.

---

#### Programme (`ProgramSettingsPage`)

| Action | Type |
|--------|------|
| Choisir Points / Tampons | Sélection |
| Seuil, libellé récompense, description | Formulaire |
| Enregistrer | Primaire |
| Préremplissage depuis suggestion IA (query params) | Automatique |

**Problème** : jargon technique (« seuil récompense », « points par euro ») sans aide contextuelle.

---

#### Offres promo (`OffersPage`)

| Action | Type |
|--------|------|
| Nouvelle offre / Modifier / Supprimer | CRUD |
| Créer brouillon, Activer, Terminer | Cycle de vie |
| Notifier tous / Tester sur 1 carte (UUID) | Avancé |
| Filtres statut, badge origine IA | Meta |
| Lien retour validation IA | Navigation |

**Volume** : page la plus dense — formulaire campagne + liste + actions multiples par ligne + zone test technique (UUID membership).

---

#### Assistant IA — Hub (`AiAssistantHomePage`)

| Action | Type |
|--------|------|
| Nav secondaire : Hub, Menu, Profil, Validation, Historique | Navigation |
| Générer mon plan fidélité (1 clic) | Primaire |
| Checklist « Parcours MVP » (5 étapes cliquables) | Guidage partiel |
| 5 boutons « Générations ciblées » (récompenses, offres, notifs, calendrier, historique) | Secondaire |
| Bandeau quota Pro IA / essai | Info technique |
| Résumé activité IA | Info |
| Insights clients V2 preview | Avancé |
| Feuille de route V2/V3 | **Dev / produit** |

**Problème majeur** : trop d’informations sur une seule page ; le restaurateur ne sait pas si le bouton principal est « Menu » ou « Générer ».

---

#### Menu upload / extraction

| Page | Actions principales |
|------|-------------------|
| `AiAssistantUploadPage` | Upload, liste menus, lien Profil, quota upload |
| `AiAssistantMenuPage` | Extraire IA, saisie manuelle, éditeur produits, Enregistrer, lien Profil |

**Problème** : après extraction, **pas de CTA clair** « Continuer → générer mes idées ». L’utilisateur croit que l’assistant s’arrête au menu.

---

#### Profil IA (`AiAssistantProfilePage`)

| Action | Type |
|--------|------|
| 8 questions (chips, selects, textarea) | Formulaire long |
| 5 liens navigation : Validation, Récompenses, Offres, Notifications, Calendrier | **Bruit** |
| Enregistrer | Primaire |

---

#### Validation (`AiAssistantSuggestionsPage`)

| Action | Type |
|--------|------|
| 3 groupes de filtres (type, statut, risque marge) + tri | Complexité |
| Par suggestion : Utiliser, Modifier, Ignorer, Copier | 4 actions |
| Par entrée calendrier : Utiliser, Ignorer | 2 actions |
| Modale édition avant application | Intermédiaire |

**Problème** : mélange offres + récompenses + notifications + calendrier sur une page ; vocabulaire « hub », « risque marge », « segmentation ».

---

#### Pages génération ciblée (récompenses, offres, notifications, calendrier)

Chaque page répète :
- 5–6 boutons de navigation croisée (Menu, Profil, Validation, Offres, Notifs, Calendrier)
- Bouton « Générer »
- Liste suggestions avec actions partielles (accepter/ignorer sur rewards ; redirection hub sur autres)

**Redondance** : 4 pages quasi identiques en structure.

---

#### QR, Scanner, Clients

| Page | Actions | Complexité |
|------|---------|------------|
| QR | Copier lien, télécharger PNG, ouvrir lien | Simple |
| Scanner | Scanner QR client, créditer | Moyenne |
| Clients | Recherche, liste, fiche détail | Simple |

Ces pages sont relativement claires mais **accessibles trop tôt** dans la nav globale.

---

### 1.3 Boutons inutiles, redondants ou mal placés

| Élément | Problème | Recommandation |
|---------|----------|----------------|
| Nav globale 8 items dès J1 | Surcharge cognitive | Mode débutant : 4–5 items max |
| « Assistant IA » séparé du reste | Silo ; l’utilisateur ne fait pas le lien menu → offres → programme | Fusionner en parcours unique « Mon assistant » |
| Nav IA (Hub/Menu/Profil/Validation/Historique) | 5 onglets + nav globale = double navigation | Une seule barre de progression verticale |
| 5 boutons en bas du profil IA | Distraction avant enregistrement | Supprimer ; une seule « Étape suivante » |
| 6 boutons sur pages rewards/offers/notifications/calendar | Copiés-collés partout | Supprimer ; progression guidée |
| « Générations ciblées » (5 boutons) | Réservé power users / consomme quota | Masquer en mode débutant ; garder « Tout générer » |
| `AiRoadmapPanel` (V2/V3) | Inutile pour restaurateur | Supprimer de l’UI restaurateur |
| `AiCustomerInsightsPanel` (segmentation) | Trop tôt, trop technique | Afficher après 10+ clients |
| Filtres marge / statut / type sur validation | 10+ boutons filtres | Remplacer par onglets simples : Offres / Récompenses / Messages |
| « Copier » suggestion | Action power user | Masquer dans menu « ⋯ » |
| « Historique » IA | Utile mais pas prioritaire | Paramètres / Avancé |
| 5 cartes raccourcis sur dashboard | Répète la sidebar | Remplacer par checklist + 1 CTA |
| Test notification avec UUID sur OffersPage | Incompréhensible pour non-tech | Masquer derrière « Mode avancé » |
| Boutons Accepter/Ignorer sur RewardsPage vs Utiliser sur Validation | Incohérent | Unifier sur « Choisir cette idée » |

---

### 1.4 Redirections incohérentes

| Situation | Comportement actuel | Problème |
|-----------|---------------------|----------|
| Menu extrait | Reste sur page menu ou upload | Pas de suite logique |
| Génération plan complet | → `/ai-assistant/suggestions` | OK mais utilisateur ne savait pas que ça existait |
| Appliquer récompense IA | → toast + lien programme | OK après fix seuil |
| Appliquer offre IA | → brouillon OffersPage | OK mais lien « Retour validation » peu visible |
| Profil IA enregistré | Aucune redirection | Utilisateur perdu |
| Rewards générées | Toast « validez dans le hub » | Terme « hub » opaque |
| Dashboard sans commerce | → Business | OK |
| Dashboard sans lien IA | — | Utilisateur ne découvre pas l’assistant |
| Checklist IA étape « Programme » | → `/dashboard/program` | Hors silo IA ; casse le fil |
| Ordre checklist IA | Menu → Profil → **Programme** → Générer | **Inverse** du parcours souhaité (offres avant programme configuré) |

---

### 1.5 Informations trop complexes ou trop visibles trop tôt

| Information | Où | Pourquoi c’est trop tôt |
|-------------|-----|------------------------|
| Quota Pro IA / essai / plan | Hub, upload, chaque page génération | Effraie avant la valeur |
| Risque marge (high/medium/low) | Cartes suggestions | Concept marketing |
| Segmentation clients (fidèles, inactifs) | Hub IA | Nécessite des clients |
| Feuille de route V2/V3 | Hub IA | Interne produit |
| Stats points distribués | Dashboard J1 | Zéro client = zéro intérêt |
| Calendrier 30 jours | Généré dès le plan complet | Overwhelming avant 1ère offre |
| 8 questions profil IA | Avant toute valeur perçue | Friction ; à fusionner avec « parlez-nous de votre resto » |
| Champs slug, wallet_label_color | Business settings | Technique |
| notify_on_activate, UUID test | OffersPage | Technique |

---

### 1.6 Points de confusion pour un restaurateur non technique

1. **« Assistant IA » vs « Programme » vs « Offres promo »** — trois endroits pour trois choses liées, sans fil conducteur.
2. **Le menu semble être la fin** — l’extraction est visible ; les offres/récompenses sont cachées derrière Hub → Générer → Validation.
3. **« Hub », « Validation », « batch », « quota »** — vocabulaire outil, pas métier.
4. **Trop de boutons égaux** — aucune hiérarchie visuelle claire (primaire vs secondaire).
5. **Programme requis avant génération** — logique technique (prompt IA) mais absurde côté restaurateur (« je ne sais pas encore quoi proposer »).
6. **Double configuration** — Commerce (`/business`) + Profil IA (`/profile`) : doublon partiel (type commerce, objectifs).
7. **Pas de notion « publié / pas publié »** — le restaurateur ne sait pas si son programme est actif côté clients.
8. **Offres vs Notifications** — différence Wallet peu expliquée.

---

## 2. Nouvelle logique UX recommandée

### 2.1 Principes directeurs

| Principe | Application |
|----------|-------------|
| **Une chose à la fois** | Une page = une intention ; un bouton primaire |
| **Progression verrouillée** | Les étapes futures sont visibles mais grisées avec explication |
| **Vocabulaire métier** | « Idées d’offres », pas « génération batch » |
| **L’IA en arrière-plan** | Présentée comme « suggestions automatiques » |
| **Validation explicite** | « Vous choisissez, rien n’est envoyé sans vous » |
| **Dashboard = GPS** | Toujours répondre : « Qu’est-ce que je fais maintenant ? » |
| **Mode avancé opt-in** | Calendrier, filtres marge, test UUID, générations séparées |

### 2.2 Structure mentale pour le restaurateur

```
Mon restaurant → Mon menu → Mes idées → Je choisis → Je publie → Mes clients
```

Pas :

```
Dashboard + Assistant IA + Programme + Offres + 9 sous-pages IA
```

### 2.3 Règles d’affichage conditionnel

| État | Afficher | Masquer |
|------|----------|---------|
| Commerce incomplet | Setup commerce | Tout le reste |
| Pas de menu | Upload menu | Génération, offres IA |
| Menu OK, pas d’idées | « Obtenir des idées » | Calendrier, insights, historique |
| Idées générées, rien choisi | Validation simplifiée | Nouvelle génération |
| Offre choisie, pas de programme | Config programme prérempli | QR, stats avancées |
| Programme OK, 0 client | QR + affiche | Stats détaillées, segmentation |
| 10+ clients | Stats simples + 1 reco | Feuille de route V2 |

### 2.4 Fusion des doublons

| Actuel | Futur |
|--------|-------|
| `BusinessSettingsPage` + `AiAssistantProfilePage` | **Mon restaurant** (infos + 3 questions simples pour les idées) |
| 4 pages génération IA | **Une** page « Mes idées » avec onglets après génération |
| `DashboardHomePage` cartes + sidebar | Dashboard checklist + 1 CTA |
| Nav IA + nav globale | **Une** navigation adaptative |

---

## 3. Nouveau parcours utilisateur recommandé

### Vue d’ensemble

```
Étape 0 → Commerce créé
Étape 1 → Restaurant configuré
Étape 2 → Menu ajouté
Étape 3 → Menu validé
Étape 4 → Idées générées (offres + récompenses + messages)
Étape 5 → Offres choisies
Étape 6 → Récompense choisie
Étape 7 → Programme configuré
Étape 8 → Programme publié (QR actif)
Étape 9 → Premiers clients
Étape 10 → Statistiques & recommandations
```

---

### Étape 0 — Créer son compte

| | |
|---|---|
| **Objectif** | Se connecter |
| **Afficher** | Formulaire auth simple |
| **Bouton principal** | « Me connecter » |
| **Masquer** | Tout le dashboard |
| **Page** | `AuthPage` |
| **Suite** | Redirection dashboard |

---

### Étape 1 — Configurer son restaurant

| | |
|---|---|
| **Objectif** | Nom, logo, adresse — le minimum pour être présentable |
| **Afficher** | Nom, logo, adresse, téléphone ; aperçu carte simplifié |
| **Bouton principal** | « Enregistrer et continuer » |
| **Masquer** | Slug manuel, couleurs avancées, CGU longues, Instagram |
| **Page** | `BusinessSettingsPage` (version allégée) |
| **Condition suivante** | `business.name` + `business.slug` valides |

---

### Étape 2 — Ajouter son menu

| | |
|---|---|
| **Objectif** | Importer carte PDF ou photo |
| **Afficher** | Zone upload, 1 phrase d’explication (« Pour vous proposer des offres adaptées à votre carte ») |
| **Bouton principal** | « Ajouter mon menu » |
| **Masquer** | Quota, historique, génération, profil IA complet |
| **Page** | `AiAssistantUploadPage` renommée **Mon menu** |
| **Condition suivante** | Fichier uploadé |

---

### Étape 3 — Valider son menu

| | |
|---|---|
| **Objectif** | Vérifier que les plats/prix sont corrects |
| **Afficher** | Liste produits éditables, compteur « X produits détectés » |
| **Bouton principal** | « Mon menu est bon → Obtenir des idées » |
| **Masquer** | Liens vers offres, calendrier, profil |
| **Page** | `AiAssistantMenuPage` |
| **Condition suivante** | `menu.status === 'extracted'` + sauvegarde |

**Questions courtes intégrées** (remplace 8 questions profil IA) :
- Type de cuisine / commerce
- Objectif principal (remplir midi, fidéliser, pousser desserts…)
- Niveau de générosité souhaité

→ 3 questions max, même écran ou slide suivant.

---

### Étape 4 — Obtenir des idées (IA invisible)

| | |
|---|---|
| **Objectif** | Recevoir des propositions d’offres, récompenses et messages |
| **Afficher** | Écran de chargement rassurant (« Nous préparons des idées pour votre carte… 2 min ») |
| **Bouton principal** | « Obtenir mes idées » (remplace « Générer mon plan fidélité ») |
| **Masquer** | Quota détaillé, calendrier 30j en première vue, insights |
| **Page** | Nouveau `GuidedIdeasPage` ou hub simplifié |
| **Condition suivante** | Batch `full_plan` complété |

**Changement technique** : ne plus exiger programme fidélité **avant** génération (créer programme minimal par défaut ou retirer prérequis côté EF).

---

### Étape 5 — Choisir ses offres

| | |
|---|---|
| **Objectif** | Sélectionner 1 à 3 offres promo à lancer |
| **Afficher** | Cartes simples : titre, message client, « Recommandé pour vous » |
| **Bouton principal** | « Activer cette offre » (par carte) |
| **Masquer** | Filtres marge, copier, calendrier, onglets techniques |
| **Page** | `GuidedValidationPage` onglet **Offres** |
| **Condition suivante** | ≥ 1 suggestion `offer` status `applied` ou brouillon campagne créé |

---

### Étape 6 — Choisir sa récompense

| | |
|---|---|
| **Objectif** | Définir ce que le client gagne (ex. dessert offert à 200 points) |
| **Afficher** | 3–5 cartes récompenses ; seuil mis en avant |
| **Bouton principal** | « Utiliser cette récompense » |
| **Masquer** | Suggestions seuil séparées (fusionner avec récompense) |
| **Page** | Même page, onglet **Récompense** |
| **Condition suivante** | ≥ 1 `reward` appliquée au programme |

---

### Étape 7 — Configurer le programme fidélité

| | |
|---|---|
| **Objectif** | Valider points/tampons et seuil (prérempli par l’IA) |
| **Afficher** | Formulaire court prérempli ; explication « 1 € dépensé = 1 point » |
| **Bouton principal** | « Enregistrer mon programme » |
| **Masquer** | Choix technique avancé |
| **Page** | `ProgramSettingsPage` guidée |
| **Condition suivante** | `loyalty_program` sauvegardé avec seuil cohérent |

---

### Étape 8 — Publier (QR actif)

| | |
|---|---|
| **Objectif** | Permettre aux clients de s’inscrire |
| **Afficher** | QR grand format, phrase « Affichez ce QR en caisse » |
| **Bouton principal** | « Télécharger mon QR » |
| **Masquer** | Scanner (secondaire), stats |
| **Page** | `QrPage` intégrée au parcours |
| **Condition suivante** | Restaurateur a vu/téléchargé QR (flag optionnel) |

---

### Étape 9 — Premiers clients

| | |
|---|---|
| **Objectif** | Scanner la première carte, voir que ça marche |
| **Afficher** | « Vous avez X clients » + lien scanner |
| **Bouton principal** | « Scanner un client » |
| **Page** | Dashboard ou `ScanPage` |
| **Condition suivante** | `customers_count >= 1` |

---

### Étape 10 — Statistiques & recommandations

| | |
|---|---|
| **Objectif** | Suivre l’activité, recevoir 1 conseil simple |
| **Afficher** | 3 chiffres max + 1 carte « Idée de la semaine » |
| **Bouton principal** | « Voir mes clients » ou « Nouvelle idée d’offre » |
| **Masquer** | Segmentation, calendrier 30j, roadmap V2 |
| **Page** | `DashboardHomePage` mode mature |

---

## 4. Nouvelle architecture des pages

### 4.1 Architecture cible (complète)

| Section | Route proposée | Rôle |
|---------|----------------|------|
| Accueil guidé | `/dashboard` | Checklist + prochaine action |
| Mon restaurant | `/dashboard/restaurant` | Infos commerce + questions courtes |
| Mon menu | `/dashboard/menu` | Upload + extraction |
| Mes idées | `/dashboard/ideas` | Génération + validation (offres, récompenses, messages) |
| Mes offres | `/dashboard/offers` | Offres actives et brouillons |
| Mon programme | `/dashboard/program` | Fidélité points/tampons |
| Mes clients | `/dashboard/customers` | Liste + fiches |
| QR & scanner | `/dashboard/qr` | Inscription + caisse (onglets) |
| Paramètres | `/dashboard/settings` | Avancé : couleurs, calendrier, historique idées |

### 4.2 Mode débutant (nav visible J1–J30)

```
Accueil · Mon menu · Mes idées · Mon programme · QR
```

Masqué au début : Clients (jusqu’à 1er client), Offres séparées (fusionné dans idées), Paramètres.

### 4.3 Mode avancé (après onboarding complet ou toggle)

```
Accueil · Offres · Programme · Clients · QR · Paramètres
```

Réintègre : calendrier marketing, générations séparées, filtres marge, test notification, insights segmentation.

### 4.4 Mapping routes actuelles → futures

| Actuel | Futur |
|--------|-------|
| `/dashboard/business` | `/dashboard/restaurant` |
| `/dashboard/ai-assistant/upload` | `/dashboard/menu` |
| `/dashboard/ai-assistant/menu/:id` | `/dashboard/menu/:id` |
| `/dashboard/ai-assistant` + `/suggestions` + 4 pages génération | `/dashboard/ideas` |
| `/dashboard/ai-assistant/profile` | Fusionné dans `/dashboard/restaurant` (section « Pour vos idées ») |
| `/dashboard/program` | `/dashboard/program` |
| `/dashboard/offers` | `/dashboard/offers` (mode avancé) |
| `/dashboard/ai-assistant/history` | `/dashboard/settings#ideas-history` |
| `/dashboard/ai-assistant/calendar` | `/dashboard/settings#calendar` |

---

## 5. Refonte du dashboard

### 5.1 Structure proposée (wireframe textuel)

```
┌─────────────────────────────────────────────────────────┐
│  Bonjour, [Nom du restaurant]                           │
│  Voici où vous en êtes avec votre fidélité.             │
├─────────────────────────────────────────────────────────┤
│  PROCHAINE ACTION (encart principal, 1 seul bouton)    │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Étape 2/6 — Ajoutez votre menu                   │  │
│  │  Pour vous proposer des offres adaptées à votre    │  │
│  │  carte, importez un PDF ou une photo.              │  │
│  │  [ Ajouter mon menu ]                              │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  VOTRE PROGRESSION (checklist verticale, 6 items max) │
│  ✓ Restaurant configuré                               │
│  ○ Menu ajouté                                        │
│  ○ Idées reçues                                       │
│  ○ Offre activée                                      │
│  ○ Programme configuré                                │
│  ○ QR affiché en boutique                             │
├─────────────────────────────────────────────────────────┤
│  ÉTAT DU PROGRAMME          │  EN BREF (si données)   │
│  ○ Pas encore actif         │  (masqué si 0 client)   │
│  ou ● Actif — Points        │  12 clients · 3 récomp. │
├─────────────────────────────────────────────────────────┤
│  IDÉE DE LA SEMAINE (si ≥ menu + idées)               │
│  « Proposez -10% sur les desserts le mardi »          │
│  [ Voir l’offre ]                                       │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Ce qu’on retire du dashboard actuel

- Grille 5 cartes raccourcis (doublon sidebar)
- Stats détaillées si 0 client
- Absence de lien vers le parcours menu/idées

### 5.3 Composants à créer

| Composant | Rôle |
|-----------|------|
| `OnboardingChecklist` | Liste étapes avec états locked/done/current |
| `NextActionCard` | 1 CTA dynamique selon statut |
| `ProgramStatusBadge` | Actif / En préparation |
| `SimpleStatsRow` | 2–3 métriques max |
| `WeeklyIdeaCard` | 1 suggestion IA mise en avant |

---

## 6. Gestion de l’IA dans l’interface

### 6.1 Renommage recommandé

| Terme actuel | Terme restaurateur |
|--------------|-------------------|
| Assistant IA | **Suggestions pour votre carte** |
| Assistant IA Fidélité | **Aide pour vos offres et récompenses** |
| Générer mon plan fidélité | **Obtenir des idées** |
| Génération en 1 clic | **Tout préparer pour moi** |
| Hub | *(supprimer le mot)* |
| Validation | **Choisir mes idées** |
| Suggestions | **Idées** |
| batch / lot | *(ne pas afficher)* |
| Quota / Pro IA | **Utilisations restantes ce mois-ci** |
| Profil commerce (IA) | **Parlez-nous de votre restaurant** |
| Risque marge | **Impact sur vos coûts** (tooltips) |
| Segmentation / insights | **Vos clients réguliers** (mode avancé) |
| Calendrier marketing 30j | **Planning du mois** (mode avancé) |

### 6.2 Messages rassurants à afficher systématiquement

- « Rien n’est envoyé à vos clients sans votre validation. »
- « Vous pouvez modifier chaque idée avant de l’activer. »
- « Ces propositions sont basées sur votre carte — adaptez-les à vos marges. »

### 6.3 Ce qu’on ne montre jamais au restaurateur

- Nom des modèles OpenAI
- `prompt_version`, `batch_id`
- Feuille de route V2/V3
- Référence fichiers `docs/`
- UUID membership (sauf mode avancé support)

---

## 7. Simplification des boutons et actions

### 7.1 Matrice décisionnelle

| Bouton / action actuel | Garder ? | Action |
|------------------------|----------|--------|
| Ajouter mon menu / Upload | ✅ | Renommer, mettre en primaire étape 2 |
| Extraire avec l’IA | ✅ | Secondaire ; auto-lancer si possible |
| Enregistrer le menu | ✅ | Fusionner avec « Continuer » |
| Générer mon plan fidélité | ✅ | Renommer « Obtenir mes idées » |
| Générations ciblées (×4) | ⚠️ | Masquer mode débutant |
| Historique IA | ⚠️ | Paramètres |
| Utiliser (suggestion) | ✅ | Renommer « Choisir cette idée » |
| Modifier | ✅ | Garder |
| Ignorer | ✅ | Renommer « Pas pour moi » |
| Copier | ❌ | Menu ⋯ avancé |
| Filtres type/statut/marge | ⚠️ | Remplacer par 3 onglets |
| Nouvelle offre (manuel) | ✅ | Secondaire après onboarding |
| Tester notification (UUID) | ⚠️ | Mode avancé |
| Notifier tous | ✅ | Garder avec confirmation claire |
| 5 liens bas de page profil | ❌ | Supprimer |
| 6 liens pages rewards/offers | ❌ | Supprimer |
| Voir le programme (après apply) | ✅ | Garder |
| Déconnexion | ✅ | Garder header |

### 7.2 Règle : 1 action principale par page

| Page | Action principale unique |
|------|--------------------------|
| Dashboard | « [Action de l’étape en cours] » |
| Restaurant | « Enregistrer et continuer » |
| Menu upload | « Ajouter mon menu » |
| Menu édition | « Mon menu est bon → Continuer » |
| Idées (avant génération) | « Obtenir mes idées » |
| Idées (après génération) | « Choisir cette offre » (contextuel) |
| Programme | « Enregistrer mon programme » |
| QR | « Télécharger mon QR » |
| Offres (liste) | « Créer une offre » (mode avancé) |

---

## 8. Nouvelle logique de progression

### 8.1 Statuts proposés

Stockage recommandé : colonne JSON `businesses.onboarding_state` ou table `business_onboarding_progress`.

| Clé | Signification | Détection |
|-----|---------------|-----------|
| `restaurant_info_completed` | Nom + slug + logo ou adresse | `businesses` champs requis |
| `menu_added` | Fichier uploadé | `ai_menu_uploads` count ≥ 1 |
| `menu_validated` | Menu extrait et sauvegardé | status `extracted` |
| `restaurant_preferences_completed` | 3 questions courtes OK | profil IA ou champs fusionnés |
| `ideas_generated` | Au moins 1 batch complété | `ai_suggestion_batches` |
| `offers_selected` | ≥ 1 offre appliquée ou brouillon | `ai_suggestions` offer `applied` ou `wallet_campaigns` |
| `reward_selected` | ≥ 1 récompense appliquée | `ai_suggestions` reward `applied` |
| `loyalty_program_configured` | Programme avec seuil + label | `loyalty_programs` |
| `program_published` | QR consulté ou flag manuel | événement ou `onboarding_state` |
| `first_customer_added` | 1 client inscrit | `customer_memberships` |
| `first_scan_done` | 1 transaction | `loyalty_transactions` |
| `onboarding_completed` | Toutes étapes core | calcul dérivé |

### 8.2 Utilisation dans l’UI

```javascript
// Pseudo-logique
function getNextStep(state) {
  if (!state.restaurant_info_completed) return 'restaurant';
  if (!state.menu_validated) return 'menu';
  if (!state.ideas_generated) return 'ideas-generate';
  if (!state.offers_selected) return 'ideas-offers';
  if (!state.reward_selected) return 'ideas-rewards';
  if (!state.loyalty_program_configured) return 'program';
  if (!state.program_published) return 'qr';
  return 'dashboard-mature';
}
```

### 8.3 Déverrouillage navigation

| Étape atteinte | Déverrouille |
|----------------|--------------|
| `restaurant_info_completed` | Mon menu |
| `menu_validated` | Obtenir des idées |
| `ideas_generated` | Choisir mes idées |
| `offers_selected` + `reward_selected` | Mon programme |
| `loyalty_program_configured` | QR, Scanner |
| `first_customer_added` | Clients, stats |

---

## 9. Plan technique de mise en place

> Sans coder ici — ordre d’exécution recommandé.

### 9.1 Nouveaux fichiers / modules

| Fichier | Rôle |
|---------|------|
| `src/lib/onboarding-progress.js` | Calcul statuts, `getNextStep()` |
| `src/hooks/useOnboardingProgress.js` | Hook React Query |
| `src/components/onboarding/OnboardingChecklist.jsx` | Checklist dashboard |
| `src/components/onboarding/NextActionCard.jsx` | CTA dynamique |
| `src/components/onboarding/GuidedLayout.jsx` | Layout sans nav complète |
| `src/pages/dashboard/GuidedIdeasPage.jsx` | Fusion hub + validation simplifiée |
| `src/pages/dashboard/RestaurantPage.jsx` | Business + préférences courtes |

### 9.2 Fichiers à modifier

| Fichier | Modification |
|---------|--------------|
| `DashboardLayout.jsx` | Nav adaptative débutant/avancé |
| `DashboardHomePage.jsx` | Refonte complète |
| `App.jsx` | Nouvelles routes, redirects legacy |
| `AiAssistantHomePage.jsx` | Simplifier ou rediriger vers `/ideas` |
| `AiAssistantUploadPage.jsx` | CTA post-upload |
| `AiAssistantMenuPage.jsx` | CTA « Continuer » |
| `AiAssistantSuggestionsPage.jsx` | Onglets simplifiés, moins de filtres |
| `AiAssistantProfilePage.jsx` | Fusion partielle ou suppression |
| `ProgramSettingsPage.jsx` | Mode guidé, textes simples |
| `OffersPage.jsx` | Masquer zone test UUID |
| `ai-onboarding.js` | Étendre en `onboarding-progress.js` global |

### 9.3 Composants à supprimer ou masquer (UI restaurateur)

| Composant | Action |
|-----------|--------|
| `AiRoadmapPanel` | Retirer |
| `AiAssistantNav` (5 onglets) | Remplacer par progression dans layout |
| Nav croisée sur rewards/offers/notifications pages | Supprimer |
| `AiCustomerInsightsPanel` | Conditionnel (10+ clients) |
| Liens multiples bas de `AiAssistantProfilePage` | Supprimer |

### 9.4 Routes à simplifier

**Redirects legacy** (éviter liens cassés) :

```
/dashboard/ai-assistant → /dashboard/ideas
/dashboard/ai-assistant/upload → /dashboard/menu
/dashboard/ai-assistant/suggestions → /dashboard/ideas?tab=choose
```

### 9.5 Modifications base de données (optionnelles)

| Option | Détail |
|--------|--------|
| **Léger** | Pas de migration ; calcul statuts depuis tables existantes |
| **Robuste** | `businesses.onboarding_state jsonb default '{}'` |
| **Backend** | Retirer prérequis `loyalty_program` avant génération IA (EF `loadGenerationContext`) |

### 9.6 Tests après chaque lot

- Parcours neuf restaurateur bout en bout (Playwright ou manuel `V1_TEST_PLAN`)
- Vérifier 1 seul bouton primaire par écran (audit visuel)
- Redirections legacy `/ai-assistant/*`
- Non-régression Wallet (activation offre, sync carte)

---

## 10. Plan de refonte en plusieurs phases

### Phase 1 — Audit et nettoyage rapide (1–2 jours) ✅ *juin 2026*

**Objectif** : réduire le bruit sans changer l’architecture.

| Tâches | Fichiers | Statut |
|--------|----------|--------|
| Retirer `AiRoadmapPanel` du hub | `AiAssistantHomePage.jsx` | ✅ |
| Retirer liens croisés (5 boutons) profil + pages génération | `AiAssistantProfilePage.jsx`, `AiAssistant*Page.jsx` | ✅ |
| Ajouter CTA « Continuer » après menu extrait | `AiAssistantMenuPage.jsx` | ✅ |
| Lien dashboard → assistant / menu | `DashboardHomePage.jsx` | ✅ |
| Renommer libellés les plus techniques (hub, validation) | Plusieurs | ✅ |
| Masquer insights clients si 0 client | `AiCustomerInsightsPanel.jsx` | ✅ |
| Générations ciblées repliées (options avancées) | `AiAssistantHomePage.jsx` | ✅ |

**Risques** : faible — changements UI textuels.  
**Validation** : restaurateur test trouve le chemin menu → générer en < 3 clics depuis dashboard.

---

### Phase 2 — Checklist guidée dashboard (3–5 jours) ✅ *juin 2026*

**Objectif** : le restaurateur sait toujours quoi faire ensuite.

| Tâches | Fichiers | Statut |
|--------|----------|--------|
| Créer `onboarding-progress.js` + hook | `src/lib/`, `src/hooks/useOnboardingProgress.js` | ✅ |
| Créer `OnboardingChecklist` + `NextActionCard` | `src/components/onboarding/` | ✅ |
| Refondre `DashboardHomePage` | dashboard | ✅ |
| Remplacer grille 5 cartes par checklist | dashboard | ✅ |
| `ProgramStatusCard` + `SimpleStatsRow` | `src/components/onboarding/` | ✅ |

**Risques** : calcul statuts incorrect → mauvaise « prochaine étape ».  
**Validation** : 6 étapes visibles ; clic mène à la bonne page ; une seule mise en avant primaire.

---

### Phase 3 — Parcours menu → idées → choix (5–8 jours)

**Objectif** : enchaînement logique sans silo IA.

| Tâches | Fichiers |
|--------|----------|
| Fusionner hub + validation en `/dashboard/ideas` | nouvelle page, `App.jsx` | ✅ |
| Onglets : Offres / Récompenses / Messages | `GuidedIdeasPage` | ✅ |
| Retirer prérequis programme avant génération (EF) | `ai-generate-suggestions-core.ts` | ✅ |
| Redirects routes legacy | `App.jsx` | ✅ |
| Post-génération : ouvrir onglet Offres automatiquement | `GuidedIdeasPage` | ✅ |

**Risques** : régression quotas, génération sans programme.  
**Validation** : menu → idées → choix offre sans visiter `/program` avant.

---

### Phase 4 — Simplification IA et textes (3–4 jours)

**Objectif** : vocabulaire rassurant, IA invisible.

| Tâches | Fichiers |
|--------|----------|
| Appliquer table renommage §6 | Tous composants IA | ✅ |
| Messages rassurants (bandeau fixe) | `GuidedLayout` | ✅ |
| Masquer quota sauf si bloqué | `AiQuotaBanner.jsx` | ✅ |
| Fusionner profil IA en 3 questions dans restaurant | `RestaurantPage` | ✅ |
| Calendrier 30j → mode avancé uniquement | `GuidedIdeasPage`, settings | ✅ |

**Risques** : textes trop longs sur mobile.  
**Validation** : test utilisateur — « Est-ce que c’est l’ordinateur qui décide ? » → réponse claire non.

---

### Phase 5 — Finalisation UX et tests restaurateur (3–5 jours)

**Objectif** : validation terrain.

| Tâches | Fichiers |
|--------|----------|
| Nav débutant vs avancé | `DashboardLayout.jsx` | ✅ |
| OffersPage mode simple | `OffersPage.jsx` | ✅ |
| Tests E2E parcours guidé | `docs/V1_TEST_PLAN.md` | ✅ |
| Test 2–3 vrais restaurateurs | `docs/UX_RESTAURATEUR_FEEDBACK.md` | ✅ |
| Métriques : temps 1ère offre activée | Analytics (futur) | ⏳ |

**Risques** : mode avancé introuvable pour utilisateurs expérimentés.  
**Validation** : critères §12 tous verts.

---

## 11. Textes UX recommandés

### Dashboard

| Élément | Texte |
|---------|-------|
| Titre (début) | « Bienvenue, [Prénom] » |
| Sous-titre | « Mettez en place votre fidélité en quelques étapes simples. » |
| Checklist titre | « Votre progression » |
| Prochaine action (menu) | « Ajoutez votre carte pour recevoir des idées d’offres adaptées à vos plats. » |
| Bouton | « Ajouter mon menu » |

### Menu absent

> « Nous avons besoin de votre carte (PDF ou photo) pour vous proposer des offres cohérentes avec ce que vous servez déjà. »

### Génération idées

> « Nous préparons des idées d’offres, de récompenses et de messages pour vos clients. Cela prend environ 2 minutes. Rien ne sera publié sans votre accord. »

**Bouton** : « Obtenir mes idées »

### Aucune offre choisie

> « Voici des idées basées sur votre carte. Choisissez celles que vous souhaitez proposer à vos clients. »

### Récompense non configurée

> « Définissez ce que vos clients gagnent une fois assez de points — par exemple un dessert ou un café offert. »

### Programme pas encore actif

> « Votre programme n’est pas encore visible par vos clients. Affichez le QR en boutique pour qu’ils puissent s’inscrire. »

### Succès offre activée

> « Votre offre est active sur les cartes Wallet de vos clients. »

### Succès récompense appliquée

> « Votre récompense a été ajoutée au programme. Vérifiez le seuil de points avant de continuer. »

### Erreur génération

> « Nous n’avons pas pu préparer les idées pour le moment. Réessayez dans quelques instants ou contactez le support RegalClic. »

### Quota atteint

> « Vous avez utilisé toutes vos idées automatiques ce mois-ci. Vous pouvez toujours créer vos offres manuellement, ou nous contacter pour plus d’idées. »

### Ton général

- Phrases courtes (max 2 lignes par bloc)
- Tutoiement ou vouvoiement : **vouvoiement** (« vos clients », « votre carte »)
- Éviter : IA, algorithmes, modèles, hub, batch, quota, segmentation

---

## 12. Critères de réussite

### Compréhension immédiate

- [ ] Un restaurateur identifie la prochaine action en **< 10 secondes** sur le dashboard
- [ ] Aucune page ne présente **plus d’1 bouton primaire** visible sans scroll

### Parcours logique

- [ ] Le menu est ajouté **avant** toute génération d’offres
- [ ] Le restaurateur voit des idées d’offres **sans** avoir configuré manuellement le programme avant
- [ ] Offre choisie → récompense choisie → programme → QR (ordre respecté ou expliqué)

### Simplicité

- [ ] Mode débutant : **≤ 5 items** dans la navigation
- [ ] Fonctions avancées (calendrier, test UUID, générations séparées) **masquées** par défaut
- [ ] Aucun terme « hub », « batch », « prompt » dans l’UI restaurateur

### Cohérence

- [ ] Toutes les redirections post-action mènent à l’**étape suivante** du parcours
- [ ] Appliquer une récompense met à jour **libellé + seuil** (non-régression bug seuil)

### Autonomie

- [ ] Un restaurateur peut publier son programme (QR + offre + récompense) **sans aide technique**
- [ ] Test utilisateur : 2/3 restaurateurs complètent le parcours en < 20 min sans poser de questions

### Mesures quantitatives (post-déploiement)

| Métrique | Cible |
|----------|-------|
| Taux abandon après upload menu | < 30 % |
| % commerces avec ≥ 1 offre appliquée sous 7j | > 50 % |
| Tickets support « je ne sais pas quoi faire » | -70 % |
| Clics moyens menu → 1ère offre activée | < 8 |

---

## Annexe A — Inventaire navigation actuelle vs cible

```
ACTUEL (sidebar)                    CIBLE débutant
─────────────────                   ────────────────
Accueil                             Accueil (guidé)
Commerce                            (fusionné étape 1)
Programme                           Mon programme (étape tardive)
Offres promo                        (dans Mes idées)
Assistant IA                        Mes idées
QR inscription                      QR (étape finale)
Scanner                             (dans QR, onglet)
Clients                             (après 1er client)
```

---

## Annexe B — Priorisation impact / effort

| Action | Impact UX | Effort | Phase |
|--------|-----------|--------|-------|
| CTA après menu extrait | ★★★★★ | ★ | 1 |
| Retirer roadmap V2 panel | ★★★★ | ★ | 1 |
| Checklist dashboard | ★★★★★ | ★★★ | 2 |
| Fusion pages IA | ★★★★★ | ★★★★ | 3 |
| Retirer prérequis programme | ★★★★ | ★★ | 3 |
| Renommage textes IA | ★★★★ | ★★ | 4 |
| Nav débutant/avancé | ★★★ | ★★★ | 5 |

---

*Document vivant — à mettre à jour après tests restaurateurs et retours terrain. Pour implémenter : demander « Implémente la phase UX N » en référence à ce fichier.*
