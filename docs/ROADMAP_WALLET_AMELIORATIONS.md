# Roadmap technique — Améliorations RegalClic Wallet

> **Objectif** : améliorer l’existant (design carte, personnalisation, notifications Wallet, offres promo) **sans reconstruire** le projet V1.  
> **Statut** : document de planification — **aucune implémentation** dans ce fichier.  
> **Dernière analyse** : juin 2026 — projet `regalclic_wallet` (V1 livrée, prod Vercel + Supabase `pfutrevqneggudriiyxr`).

---

## 1. Résumé de l’objectif

Passer d’une **V1 fonctionnelle** (inscription → carte Wallet → scan → points/tampons) à une **carte Wallet premium, personnalisable et commercialement vendable**, avec :

- design plus professionnel (Apple + Google),
- branding restaurant (logo, couleurs, liens, message),
- **notifications Wallet via mise à jour de carte** (pas des push marketing type app mobile),
- interface admin simple pour personnalisation et offres promo,
- stabilité et simplicité préservées.

---

## 2. État actuel du projet (audit Phase 0 intégré)

### 2.1 Stack & déploiement

| Couche | Technologie |
|--------|-------------|
| Frontend | Vite 6, React 18, React Router, Tailwind, shadcn/ui minimal |
| Backend | Supabase Postgres + Auth + RLS + Storage |
| Edge Functions | Deno (6 fonctions actives) |
| Prod frontend | `https://regalclic-wallet.vercel.app` |
| Prod backend | `https://pfutrevqneggudriiyxr.supabase.co` |

### 2.2 Routes existantes

| Route | Rôle |
|-------|------|
| `/auth` | Connexion restaurateur |
| `/dashboard`, `/business`, `/program`, `/qr`, `/scan`, `/customers` | Dashboard |
| `/join/:slug`, `/join/:slug/success` | Inscription client + boutons Wallet |

### 2.3 Génération Apple Wallet (existant)

**Fichiers clés :**
- `supabase/functions/wallet-apple-pass/index.ts` — GET/POST → `.pkpass`
- `supabase/functions/_shared/apple-pass-builder.ts` — construction `pass.json` + images + signature
- `supabase/functions/wallet-apple-webhook/index.ts` — PassKit web service (register device, GET pass mis à jour)
- `supabase/functions/_shared/apple-apns.ts` — push APNs après sync

**Type de pass actuel :** style **`generic`** (pas `storeCard` ni `loyalty` natif Apple).

**Champs `pass.json` actuels :**

| Zone | Contenu actuel |
|------|----------------|
| `organizationName` | `RegalClic` (env `APPLE_ORGANIZATION_NAME`) |
| `description` | `Carte fidélité {businessName}` |
| `logoText` | `RegalClic` si pas de logo commerce, sinon vide |
| `foregroundColor` | `rgb(255,255,255)` fixe |
| `backgroundColor` | `businesses.primary_color` → RGB |
| `labelColor` | Teal RegalClic fixe (`#44C4A1`) |
| `headerFields` | Label « Carte de fidélité » + **nom restaurant** |
| `primaryFields` | Solde points/tampons + `changeMessage` |
| `secondaryFields` | **Prénom client** uniquement |
| `auxiliaryFields` | Libellé récompense + récompenses disponibles si > 0 |
| `backFields` | 8 premiers chars du `qr_token` + texte info générique |
| `barcode` | QR = `qr_token` (hex 48 chars) |
| `webServiceURL` | `{SUPABASE_URL}/functions/v1/wallet-apple-webhook` |
| `authenticationToken` | `customer_memberships.apple_auth_token` |

**Images actuelles :**
- `icon.png`, `icon@2x.png`, `logo.png`, `logo@2x.png` — toutes dérivées du **même** fichier (`businesses.logo_url` ou fallback RegalClic)
- **Pas de** `strip.png`, `thumbnail.png`, `background.png`

**Identifiants :**
- `serialNumber` : `mbr_{membershipId sans tirets}` ou valeur stockée `apple_serial_number`
- `passTypeIdentifier` : env `APPLE_PASS_TYPE_IDENTIFIER`

**Points forts :**
- Pass signé, web service PassKit opérationnel, APNs branché, `changeMessage` sur le solde.

**Limites actuelles :**
- Pas de nom complet client, pas de `card_number` visible
- `backFields` très pauvres (pas d’adresse, règles programme, liens)
- Pas de strip / hero visuel
- `organizationName` = RegalClic, pas le restaurant (choix Apple à revalider)
- Logo commerce réutilisé pour icon + logo (dimensions non optimisées)
- Pas de message promo dynamique
- Pas de « prochaine récompense » / progression vers seuil
- `apple_serial_number` défini au **téléchargement** du pass, pas seulement à l’installation → fausse détection « carte Apple active »

### 2.4 Génération Google Wallet (existant)

**Fichiers clés :**
- `supabase/functions/wallet-google/index.ts` — provision + Save URL
- `supabase/functions/_shared/google-wallet-core.ts` — class/object, sync PATCH

**Modèle actuel :**
- **`loyaltyClass`** par `business_id` : `issuerId.regalclic-business-{slug}`
- **`loyaltyObject`** par `membership_id` : `issuerId.regalclic-mbr-{slug}`
- `issuerName` = `RegalClic` (fixe)
- `programName` = nom restaurant
- `hexBackgroundColor` = `businesses.primary_color`
- `programLogo` = logo commerce ou fallback RegalClic
- **Pas de** `heroImage` sur la class
- Objet : `accountName` = prénom, `loyaltyPoints` = solde, `barcode` = `qr_token`, `textModulesData` = programme + récompense dispo
- **Pas de** `linksModuleData`
- `notifyPreference: NOTIFY_ON_UPDATE` à la création
- Sync : PATCH avec `messages[].messageType: TEXT_AND_NOTIFY` (« Solde mis à jour »)

**Limites actuelles :**
- Peu d’infos « dos de carte » (pas de liens, adresse, conditions)
- Pas de bannière / hero
- Nom client = prénom seulement
- Pas de progression « X points avant récompense »
- Class Google partagée par commerce — changement design impacte tous les clients du commerce

### 2.5 Scanner & fidélité (existant)

**Frontend :** `src/pages/dashboard/ScanPage.jsx`, `src/lib/scan.js`, `src/components/scan/QrScanner.jsx`

**RPC Supabase :**
- `lookup_membership_by_qr_token(p_qr_token)` — vérifie `is_business_member`
- `add_points_to_membership`, `add_stamp_to_membership`, `redeem_reward`

**Flux scan :**
1. Caméra ou saisie manuelle → `qr_token`
2. RPC lookup → fiche client
3. Action → RPC métier → mise à jour `customer_memberships`
4. Trigger DB → `wallet_sync_jobs`
5. Appel instantané → `wallet-sync-membership` Edge Function
6. Secours cron → `wallet-sync-worker` (GitHub Actions, 3 min)

### 2.6 Données stockées (tables existantes)

#### `businesses` — champs **déjà présents**
`name`, `slug`, `logo_url`, `primary_color`, `address`, `city`, `postal_code`, `country`, `phone`, `website`, `is_active`

#### `businesses` — champs **absents** (souhaités)
`wallet_strip_url`, `wallet_label_color`, `wallet_text_color`, `wallet_description`, `wallet_terms`, `wallet_promo_message`, `instagram_url`, `order_url`, `wallet_hero_url`

> **Note :** réutiliser `logo_url` et `primary_color` avant d’ajouter des doublons (`wallet_logo_url` seulement si besoin d’un logo Wallet distinct du logo dashboard).

#### `loyalty_programs` — existant
`type` (points|stamps), `points_per_euro`, `stamps_required`, `reward_label`, `reward_threshold`

#### `customers` — existant
`first_name`, `last_name`, `phone`, `email`

#### `customer_memberships` — existant
`card_number`, `qr_token`, `points_balance`, `stamps_balance`, `rewards_available`, `apple_serial_number`, `apple_auth_token`, `google_object_id`, `status`, `updated_at`

#### `customer_memberships` — absent / dérivable
`last_transaction_at` → dérivable de `loyalty_transactions` ; `last_wallet_update_at` → dérivable de `wallet_passes.last_updated_at`

#### Tables Wallet infra — existantes
`wallet_passes`, `apple_wallet_registrations`, `wallet_sync_jobs`

#### Tables campagnes — **absentes**
`wallet_campaigns`, `wallet_notifications_log` — à créer en Phase 8+ si validé

### 2.7 Variables d’environnement (existant)

**Frontend :** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_PUBLIC_APP_URL` (dev)

**Edge Functions :** secrets Apple (certificats, APNs), Google (issuer, SA), `WALLET_SYNC_SECRET`, `WALLET_PUBLIC_APP_URL`, `REGALCLIC_WALLET_*`

### 2.8 Points forts globaux V1

- Parcours bout en bout opérationnel
- RLS solide (`is_business_member`)
- RPC atomiques pour points/tampons
- Sync Wallet instantanée + file de secours
- Dashboard clients + scanner
- Documentation setup Apple/Google/sync

### 2.9 Risques techniques déjà identifiés

| Risque | Impact |
|--------|--------|
| Apple sans `apple_wallet_registrations` | Pas de push → pas de MAJ visible |
| `apple_serial_number` avant installation réelle | Sync Apple tentée à tort |
| Google `UNDER_REVIEW` | Cartes visibles seulement pour testeurs |
| Pas de logs structurés sync | Debug difficile |
| Images logo non redimensionnées | Rendu Apple/Google médiocre |
| Pas de consentement marketing distinct | RGPD Phase 11 |

---

## 3. Objectif produit (vision carte améliorée)

### 3.1 Face de carte (visible immédiatement)

- Logo restaurant (ou RegalClic en fallback)
- Nom du restaurant
- Nom du client (prénom + nom si dispo)
- Solde actuel (points ou tampons)
- Récompense(s) disponible(s) si applicable
- QR code scannable (`qr_token` — **jamais** email/téléphone)
- Couleur de marque
- Message court : *« Scannez cette carte à chaque passage »* ou message promo

### 3.2 Dos / détails

- Numéro de carte (`card_number` ex. `RC-XXXXXXXX`)
- Règle de gain : *« 1 € = 1 point »* ou *« 10 tampons = 1 café »*
- Prochaine récompense (points/tampons restants)
- Dernière mise à jour
- Adresse, téléphone, lien commande, Instagram, site web
- Conditions de fidélité
- *« Carte propulsée par RegalClic »*

### 3.3 Périmètre inclus (cette roadmap)

- Amélioration visuelle et contenu des passes Apple/Google
- Personnalisation admin (couleurs, logo, message, liens)
- Sync Wallet post-transaction renforcée + logs
- Notifications **liées à mise à jour de carte**
- Offres promo simples (1 message, dates début/fin)
- RGPD de base (consentement marketing optionnel)

### 3.4 Périmètre exclu (V1 améliorée)

- Segmentation avancée, A/B test, automation marketing
- Push FCM/APNs hors contexte Wallet
- Géolocalisation active (Phase 10 = backlog)
- App mobile client
- Multi-programmes par commerce
- Stripe / facturation (Phase 13 = doc commerciale seulement)
- Refonte complète du schéma ou changement de stack

---

## 4. Contraintes Apple Wallet vs Google Wallet

### 4.1 Apple Wallet — rappels réalistes

Les **notifications Wallet Apple** ne sont **pas** des push marketing libres :

1. Le pass est mis à jour (nouveau `.pkpass` via web service)
2. Un **champ modifié** avec `changeMessage` peut déclencher une notification lock-screen
3. Nécessite : certificats, `webServiceURL`, enregistrement device (`apple_wallet_registrations.push_token`), APNs

**Formulation produit :** *« Notification lors d’une mise à jour de votre carte Wallet »*.

### 4.2 Google Wallet — rappels réalistes

- Mise à jour via API `loyaltyObject` PATCH
- `notifyPreference: NOTIFY_ON_UPDATE` + `messages` avec `messageType: TEXT_AND_NOTIFY` peuvent notifier
- Limites anti-spam Google, review issuer, délais variables
- Pas de équivalent FCM illimité

**Formulation produit :** *« Notification Google Wallet lors d’une mise à jour de carte, selon les règles Google »*.

### 4.3 Stratégie dual-platform

| Besoin | Apple | Google |
|--------|-------|--------|
| Afficher solde | `primaryFields` + `changeMessage` | `loyaltyPoints` |
| Nom client | `secondaryFields` / `auxiliaryFields` | `accountName` + `textModulesData` |
| Liens | `backFields` avec URLs | `linksModuleData` |
| Promo | `backFields` ou champ avec changeMessage | `textModulesData` + `messages` |
| Notif transaction | APNs + champ modifié | PATCH + `TEXT_AND_NOTIFY` |
| Notif promo | MAJ champ promo + changeMessage | PATCH message promo + notify |
| Logo | `logo.png`, `icon.png` | `programLogo` |
| Bannière | `strip.png` (generic/storeCard) | `heroImage` sur class/object |

**Principe d’architecture :** un module partagé `wallet-pass-model.ts` (à créer) qui calcule **un modèle métier unique** (`WalletCardViewModel`) consommé par `apple-pass-builder.ts` et `google-wallet-core.ts`.

---

## 5. Design cible — maquettes textuelles

### 5.1 Apple Wallet (generic → envisager storeCard)

```
┌─────────────────────────────────────┐
│ [logo]   RESTAURANT NOM             │  headerFields
│                                     │
│         42 POINTS                   │  primaryFields (+ changeMessage)
│                                     │
│ Client: Jean Dupont    Récomp: Café │  secondary + auxiliary
│ ─────────────────────────────────── │
│         [ QR CODE ]                 │
│         RC-A1B2C3D4E5               │  alternateText
└─────────────────────────────────────┘

Dos (backFields):
• Programme: 1€ = 1 point — Récompense à 100 pts
• Prochaine récompense: encore 58 points
• Récompenses disponibles: 1
• Dernière mise à jour: 25/06/2026 15:04
• Adresse: 12 rue …, Paris
• Téléphone: 06 …
• Commander: https://…
• Instagram: https://…
• Conditions: …
• Propulsé par RegalClic
```

### 5.2 Google Wallet (loyaltyObject)

```
┌─────────────────────────────────────┐
│ [hero image bannière — optionnel]   │
│ [logo]  Nom Restaurant              │
│ Jean Dupont                         │  accountName
│                                     │
│ Points: 42                          │  loyaltyPoints
│ Récompense: Café offert             │  textModule
│ Encore 58 pts avant récompense      │  textModule
│ ─────────────────────────────────── │
│         [ QR CODE ]                 │
└─────────────────────────────────────┘

linksModuleData:
• Site web • Commander • Instagram • Appeler
```

### 5.3 Champs dynamiques communs (ViewModel)

| Champ | Source données |
|-------|----------------|
| `businessName` | `businesses.name` |
| `customerDisplayName` | `customers.first_name` + `last_name` |
| `balance` | `points_balance` ou `stamps_balance` |
| `balanceLabel` | selon `loyalty_programs.type` |
| `rewardLabel` | `loyalty_programs.reward_label` |
| `rewardsAvailable` | `customer_memberships.rewards_available` |
| `pointsToNextReward` | calcul : `threshold - balance` (points) |
| `stampsToNextReward` | calcul : `stamps_required - stamps_balance` |
| `cardNumber` | `customer_memberships.card_number` |
| `qrToken` | `customer_memberships.qr_token` |
| `lastUpdatedAt` | `customer_memberships.updated_at` |
| `lastTransactionAt` | max `loyalty_transactions.created_at` |
| `earnRuleText` | dérivé programme |
| `promoMessage` | `businesses.wallet_promo_message` (futur) |
| `primaryColor` | `businesses.primary_color` |
| `logoUrl` | `businesses.logo_url` |
| `heroUrl` | `businesses.wallet_hero_url` (futur) |
| Liens | `website`, `order_url`, `instagram_url`, `phone` |

---

## 6. Données — réutiliser vs ajouter

### 6.1 Indispensable maintenant (Priorité 1–2)

| Besoin | Action |
|--------|--------|
| Logo restaurant | **Réutiliser** `businesses.logo_url` |
| Couleur | **Réutiliser** `primary_color` |
| Nom, adresse, tel, site | **Réutiliser** champs existants |
| Message promo | **Ajouter** `businesses.wallet_promo_message text` |
| Conditions | **Ajouter** `businesses.wallet_terms text` (optionnel V1) |
| Lien commande / Instagram | **Ajouter** `order_url`, `instagram_url` OU réutiliser `website` |

### 6.2 Utile bientôt (Priorité 2–3)

| Champ | Table | Usage |
|-------|-------|-------|
| `wallet_hero_url` | `businesses` | Bannière Google + strip Apple |
| `wallet_label_color` | `businesses` | Contraste Apple `labelColor` |
| `label_color` override | idem | Personnalisation fine |

### 6.3 Plus tard (V2/V3)

- `wallet_campaigns` + `wallet_notifications_log`
- `customers.marketing_consent_at`
- Géolocalisation `businesses.lat/lng`
- Logo Wallet séparé (`wallet_logo_url`) si conflit dimensions

### 6.4 Migrations proposées (ne pas exécuter maintenant)

**Migration `20250626xxxx_wallet_branding.sql` (exemple) :**
```sql
alter table public.businesses
  add column if not exists wallet_promo_message text,
  add column if not exists wallet_terms text,
  add column if not exists wallet_hero_url text,
  add column if not exists order_url text,
  add column if not exists instagram_url text,
  add column if not exists wallet_label_color text;
```

**Migration `20250626xxxx_wallet_campaigns.sql` (Phase 8+) :**
```sql
-- wallet_campaigns, wallet_notifications_log (voir Phase 8)
```

---

## 7. Phases détaillées

---

### PHASE 0 — Audit de l’existant ✅ (documenté ci-dessus)

**Objectif :** baseline technique avant toute modification.

**Livrable :** section 2 de ce document.

#### Checklist validation Phase 0
- [x] Stack et routes cartographiées
- [x] Fichiers Wallet listés
- [x] Tables et champs inventoriés
- [x] Limites Apple/Google documentées
- [x] Sync actuelle comprise

#### Fichiers concernés (lecture seule)
- `supabase/functions/_shared/apple-pass-builder.ts`
- `supabase/functions/_shared/google-wallet-core.ts`
- `supabase/functions/_shared/wallet-sync-core.ts`
- `supabase/migrations/20250625120000_v1_core_schema.sql`
- `src/pages/dashboard/ScanPage.jsx`

---

### PHASE 1 — Définir le design cible de la carte Wallet

**Objectif :** spécification produit + technique unique avant code.

**Tâches :**
1. Valider style Apple : garder `generic` ou passer à `storeCard` (recommandé : **storeCard** pour fidélité retail — vérifier rendu avec strip)
2. Figurer la liste exhaustive des champs face + dos (section 5)
3. Définir textes FR par défaut et fallbacks
4. Définir règles de calcul « prochaine récompense »
5. Créer le contrat `WalletCardViewModel` (interface TypeScript partagée)
6. Valider avec 1–2 maquettes Figma ou captures annotées (optionnel)

**Livrables :**
- Spec `WalletCardViewModel` (fichier à créer : `supabase/functions/_shared/wallet-card-model.ts`)
- Table de mapping champ → Apple / Google
- Guide dimensions images (voir Phase 2)

#### Checklist Phase 1
- [x] Maquette textuelle Apple validée → [`WALLET_CARD_SPEC.md`](WALLET_CARD_SPEC.md) §3
- [x] Maquette textuelle Google validée → [`WALLET_CARD_SPEC.md`](WALLET_CARD_SPEC.md) §4
- [x] Liste champs dynamiques figée → `wallet-card-model.ts` + spec §5
- [x] Règles fallback documentées → spec §7
- [x] `organizationName` Apple tranché → **RegalClic** (spec §2)
- [x] Decision storeCard vs generic actée → **storeCard** (override `APPLE_PASS_STYLE=generic`)

#### Fichiers créés (Phase 1 ✅)
- [`docs/WALLET_CARD_SPEC.md`](WALLET_CARD_SPEC.md)
- [`supabase/functions/_shared/wallet-card-model.ts`](../supabase/functions/_shared/wallet-card-model.ts)

#### Critères de validation
- Un développeur peut implémenter Apple + Google sans ambiguïté métier
- Aucun champ PII sensible dans le QR

---

### PHASE 2 — Préparer les données et assets

**Objectif :** la base et le storage supportent le design cible.

**Tâches :**
1. Migration colonnes `businesses` (promo, terms, hero, liens) — voir §6.4
2. Documenter dimensions images :

| Asset | Apple | Google | Recommandation |
|-------|-------|--------|----------------|
| Icon | 29×29 @1x, 58×58 @2x | — | Carré, PNG |
| Logo | 160×50 @1x max | 660×660 min class | Logo commerce sur fond transparent |
| Strip | 375×123 @1x | — | Bannière optionnelle |
| Hero | — | 1032×336 | Bannière Google |

3. Validation hex couleurs (regex existante dans `wallet-branding.ts` — étendre)
4. Pipeline resize : Edge Function ou resize côté upload dashboard (sharp non dispo Deno deploy → **resize à l’upload** côté client ou service dédié)
5. Bucket Storage : réutiliser `business-assets` avec sous-dossiers `{businessId}/logo.png`, `{businessId}/hero.webp`

**Réutiliser sans migration :**
- `logo_url`, `primary_color`, `phone`, `website`, `address`, `city`, `postal_code`

#### Checklist Phase 2
- [x] Migration appliquée → `20250626120000_wallet_branding.sql`
- [x] Upload hero optionnel → `uploadBusinessHero` + UI dashboard
- [x] Validation couleur hex → `wallet-colors.js` + `wallet-branding.ts`
- [x] Fallback logo RegalClic → inchangé (`resolveFallbackLogoUrl`)
- [x] Formats MIME validés → PNG/JPEG/WebP + resize canvas

#### Fichiers modifiés (Phase 2 ✅)
- `supabase/migrations/20250626120000_wallet_branding.sql`
- `src/pages/dashboard/BusinessSettingsPage.jsx`
- `src/lib/supabase.js`, `src/lib/wallet-image.js`, `src/lib/wallet-colors.js`
- `supabase/functions/_shared/wallet-branding.ts`

#### Risques
- Images trop lourdes → timeout Edge Function
- Logo rectangulaire mal rendu sur Apple icon

---

### PHASE 3 — Amélioration Apple Wallet

**Objectif :** carte Apple premium, complète, à jour.

**Tâches techniques :**
1. Introduire `WalletCardViewModel` dans `buildApplePkpass`
2. Enrichir `backFields` : règles, prochaine récompense, adresse, liens cliquables, conditions, RegalClic
3. Afficher `card_number` (pas seulement prefix qr_token)
4. Nom complet client si `last_name` présent
5. Ajouter `strip.png` / `strip@2x.png` si `wallet_hero_url` ou générique RegalClic
6. Séparer icon (carré) vs logo (rectangulaire) — ne pas réutiliser le même bytes
7. Évaluer passage `storeCard` vs `generic` (structure JSON différente)
8. Améliorer `changeMessage` sur plusieurs champs si besoin (solde + récompense dispo)
9. Regénération pass sur sync : déjà via `buildPkpassFromSerial` — enrichir avec nouveaux champs

**pass.json cible (extrait) :**
```json
{
  "storeCard": {
    "primaryFields": [{ "key": "balance", "label": "Points", "value": "42", "changeMessage": "Vous avez maintenant %@ points" }],
    "secondaryFields": [{ "key": "customer", "label": "Client", "value": "Jean Dupont" }],
    "auxiliaryFields": [
      { "key": "reward_next", "label": "Prochaine récompense", "value": "Encore 58 points" },
      { "key": "reward_avail", "label": "Disponible", "value": "1 café" }
    ],
    "backFields": [ "...liens et conditions..." ]
  }
}
```

#### Checklist Phase 3
- [ ] `.pkpass` généré sans erreur OpenSSL
- [ ] Ajout sur iPhone réel OK
- [ ] Logo restaurant visible
- [ ] Nom client visible
- [ ] Solde correct
- [ ] QR scannable par `/dashboard/scan`
- [ ] Dos de carte lisible (liens cliquables)
- [ ] Fallback sans logo commerce
- [ ] Fallback client sans `last_name`
- [ ] Contraste couleurs acceptable

#### Fichiers probables
- `supabase/functions/_shared/apple-pass-builder.ts` (principal)
- `supabase/functions/_shared/wallet-card-model.ts` (nouveau)
- `supabase/functions/wallet-apple-pass/index.ts`
- `supabase/functions/wallet-apple-webhook/index.ts`

#### Risques
- Changer `generic` → `storeCard` casse passes existants (forcer ré-ajout)
- Trop de `backFields` → pass lourd
- `organizationName` Apple a des règles de review

---

### PHASE 4 — Amélioration Google Wallet

**Objectif :** parité fonctionnelle et visuelle avec Apple.

**Tâches :**
1. Consommer `WalletCardViewModel` dans `buildGoogleObjectBody` / `buildGoogleClassBody`
2. Ajouter `heroImage` sur class (bannière commerce)
3. Ajouter `linksModuleData` : site, commande, Instagram, tel (`tel:`)
4. Enrichir `textModulesData` : règle gain, prochaine récompense, dernière MAJ, promo
5. `accountName` = nom complet
6. PATCH class lors changement branding commerce (logo, couleur, hero)
7. Harmoniser messages sync avec type transaction (points vs récompense débloquée)

#### Checklist Phase 4
- [ ] Save to Google Wallet OK
- [ ] Logo + couleur visibles
- [ ] Hero image si configurée
- [ ] Nom client visible
- [ ] Solde correct après scan
- [ ] QR scannable
- [ ] Liens module fonctionnels
- [ ] Notification test après sync (appareil réel)
- [ ] Issuer `APPROVED` ou testeurs configurés

#### Fichiers probables
- `supabase/functions/_shared/google-wallet-core.ts`
- `supabase/functions/wallet-google/index.ts`
- `supabase/functions/_shared/wallet-card-model.ts`

#### Risques
- `heroImage` URL non HTTPS → rejet API
- Trop de `TEXT_AND_NOTIFY` → limitation Google

---

### PHASE 5 — Interface admin personnalisation Wallet

**Objectif :** le restaurateur personnalise sa carte sans toucher au code.

**Option A (recommandée V1) :** étendre `/dashboard/business` avec section « Apparence Wallet »  
**Option B :** nouvelle route `/dashboard/wallet-design`

**Champs UI :**
- Logo (existant) + bannière hero (upload)
- Couleur principale (existant)
- Message court carte (`wallet_promo_message`)
- Conditions fidélité (`wallet_terms`)
- Téléphone, site, lien commande, Instagram (existants + nouveaux)
- **Aperçu HTML** simplifié (mockup carte, pas rendu Apple/Google natif)

**Comportement :**
- Sauvegarde → `businesses` mis à jour
- **Nouvelles cartes** : design appliqué immédiatement
- **Cartes existantes** : bouton « Mettre à jour toutes les cartes » (Phase 6/9) — pas automatique au save

#### Checklist Phase 5
- [ ] Upload logo OK (existant)
- [ ] Upload bannière OK
- [ ] Couleurs sauvegardées
- [ ] Preview HTML visible
- [ ] Textes promo/conditions sauvegardés
- [ ] Liens validés (URL)

#### Fichiers probables
- `src/pages/dashboard/BusinessSettingsPage.jsx` ou `WalletDesignPage.jsx` (nouveau)
- `src/components/wallet/WalletCardPreview.jsx` (nouveau)
- `src/lib/supabase.js` (`uploadBusinessHero` à ajouter)

---

### PHASE 6 — Mise à jour Wallet après transaction (renforcement)

**Objectif :** fiabiliser la sync déjà en place + logs.

**État actuel :**
- ✅ Trigger `wallet_sync_jobs`
- ✅ `wallet-sync-membership` instantané depuis scanner
- ✅ `wallet-sync-worker` cron secours
- ✅ Google PATCH + Apple APNs

**Améliorations :**
1. **Ne pas bloquer** la RPC fidélité si sync échoue (déjà le cas — conserver)
2. Ajouter table `wallet_sync_logs` ou enrichir logs Edge Function structurés
3. Corriger détection « Apple actif » : sync Apple **uniquement** si `apple_wallet_registrations` > 0
4. Enrichir PATCH Google / regen Apple avec `WalletCardViewModel` complet (prochaine récompense, etc.)
5. Bouton admin « Forcer sync carte client » sur fiche client (optionnel)
6. Retry exponentiel sur worker pour jobs échoués

#### Checklist Phase 6
- [ ] Points/tampons toujours enregistrés même si Wallet down
- [ ] Erreur Wallet loggée avec `membership_id`, plateforme, message
- [ ] Google sync < 3 s en conditions normales
- [ ] Apple sync si device enregistré
- [ ] Pas de faux positif Apple sans installation
- [ ] Dashboard restaurateur voit statut sync (optionnel toast amélioré)

#### Fichiers probables
- `supabase/functions/_shared/wallet-sync-core.ts`
- `supabase/functions/wallet-sync-membership/index.ts`
- `src/lib/scan.js`
- Migration `wallet_sync_logs` (optionnel)

---

### PHASE 7 — Notifications Wallet transactionnelles

**Objectif :** notifier utilement lors des changements de solde.

**Notifications prioritaires (via MAJ carte) :**

| Événement | Apple (stratégie) | Google (stratégie) |
|-----------|-------------------|---------------------|
| Points gagnés | `changeMessage` sur champ balance | `TEXT_AND_NOTIFY` message solde |
| Tampon gagné | idem | idem |
| Récompense débloquée | `changeMessage` sur champ récompense dispo | textModule + message |
| Récompense utilisée | MAJ sans notif forcée (optionnel) | message discret |

**Règles :**
- Ne notifier que si valeur **réellement changée**
- Pas de notification si solde identique
- Logger chaque tentative

**Apple spécifique :**
- Le texte notification = `changeMessage` du champ modifié
- Ex. : `"Vous avez maintenant %@ points"` → « Vous avez maintenant 42 points »

**Google spécifique :**
- `messages[].messageType = TEXT_AND_NOTIFY` — **limiter la fréquence** (éviter à chaque centime)

#### Checklist Phase 7
- [ ] Test iPhone : notification après +10 points
- [ ] Test Android : notification après +10 points
- [ ] Pas de notification sans changement
- [ ] Récompense débloquée déclenche message distinct
- [ ] Logs consultation possible

#### Fichiers probables
- `supabase/functions/_shared/apple-pass-builder.ts` (changeMessage)
- `supabase/functions/_shared/google-wallet-core.ts` (`buildGoogleSyncPatchBody`)
- `supabase/functions/_shared/wallet-sync-core.ts`

#### Prérequis avant tests
- Apple : device enregistré dans `apple_wallet_registrations`
- Google : issuer configuré, compte testeur si `UNDER_REVIEW`
- APNs : `APPLE_APNS_USE_SANDBOX` correct selon environnement

---

### PHASE 8 — Offres promotionnelles simples

**Objectif :** le restaurateur publie une offre visible sur les cartes.

**Fonctionnement V1 :**
1. CRUD offre admin (`/dashboard/offers` ou section business)
2. Stockage `wallet_campaigns` (ou champ unique `wallet_promo_message` en ultra-MVP)
3. Activation → PATCH toutes les `google_object_id` + push Apple tous les serials enregistrés
4. Désactivation automatique après `ends_at` (cron)

**Ultra-MVP (avant table campaigns) :**
- Champ `businesses.wallet_promo_message` + bouton « Appliquer à toutes les cartes »

**Champs campagne :**
- `title`, `message`, `offer_label`, `starts_at`, `ends_at`, `status` (draft|active|ended)

**Hors scope V1 :**
- Segmentation, ciblage comportemental, A/B

#### Checklist Phase 8
- [ ] Créer offre brouillon
- [ ] Activer offre
- [ ] Message visible sur carte Google test
- [ ] Message visible sur carte Apple test (backField ou auxiliary)
- [ ] Désactivation fin de campagne
- [ ] Logs par membership

#### Fichiers probables
- `supabase/migrations/20250626xxxx_wallet_campaigns.sql`
- `src/pages/dashboard/OffersPage.jsx` (nouveau)
- `supabase/functions/wallet-campaign-broadcast/index.ts` (nouveau)
- `supabase/functions/_shared/wallet-sync-core.ts` (extension)

---

### PHASE 9 — Notifications promotionnelles simples

**Objectif :** l’offre promo peut déclencher une notification Wallet (si plateforme le permet).

**Différence :**
- **Silencieux :** MAJ champ promo sans `changeMessage` / sans `TEXT_AND_NOTIFY`
- **Avec notification :** changeMessage Apple + `TEXT_AND_NOTIFY` Google

**Garde-fous produit :**
- Max **1 campagne active** par commerce
- Max **1 broadcast notifiant / jour / commerce** (configurable)
- Alerte admin : *« Les notifications Wallet dépendent des règles Apple/Google »*
- Consentement marketing optionnel (Phase 11)

#### Checklist Phase 9
- [ ] Envoi test 1 carte
- [ ] Envoi toutes cartes actives d’un commerce
- [ ] Log succès/échec par membership
- [ ] Message si 0 carte éligible
- [ ] Blocage si quota dépassé

---

### PHASE 10 — Géolocalisation (backlog V2/V3)

**Objectif :** documenter sans implémenter maintenant.

- Apple : `locations[]` dans pass.json (lat, lng, relevText)
- Déclenchement à proximité du commerce (lock screen suggestion)
- Nécessite coordonnées GPS commerce (`businesses.latitude`, `businesses.longitude`)
- Différent d’une notification push classique

**Exemples relevText :**
- « Vous êtes près de {restaurant} — présentez votre carte »

#### Checklist (futur)
- [ ] Coordonnées commerce saisies
- [ ] Pass avec location enregistré
- [ ] Test proximité réelle iPhone

---

### PHASE 11 — Sécurité, RGPD et consentement

**Objectif :** conformité minimale avant marketing Wallet.

**Tâches :**
1. Consentement inscription : fidélité (obligatoire) vs marketing (opt-in séparé)
2. Stocker `marketing_consent` + timestamp sur `customers` ou `customer_memberships`
3. Ne jamais encoder email/tél dans QR (`qr_token` opaque — **déjà le cas**)
4. Minimiser PII sur face de carte (prénom OK, email non)
5. Mention politique confidentialité sur `/join`
6. Préparer suppression client (RPC future `anonymize_customer`)
7. Logs campagnes = audit trail

#### Checklist Phase 11
- [ ] Checkbox marketing distincte sur join
- [ ] Campagne promo respecte opt-in (Phase 9)
- [ ] QR = token aléatoire 48 hex
- [ ] Pas d’email dans pass.json

#### Fichiers probables
- `src/pages/join/JoinPage.jsx`
- `supabase/functions/public-join/index.ts`
- `supabase/migrations/20250626xxxx_marketing_consent.sql`

---

### PHASE 12 — Tests complets sur vrais appareils

**Objectif :** valider toutes les améliorations.

Reprendre et étendre [`docs/V1_TEST_PLAN.md`](V1_TEST_PLAN.md) avec :

**Apple :** iPhone Safari, installation, logo, nom, QR, update transaction, notification, back fields, promo  
**Google :** Android Chrome, idem + links + hero  
**Admin :** design, offre, sync forcée  
**Erreurs :** logo absent, couleur invalide, Wallet non configuré, client autre commerce

#### Checklist globale Phase 12
- [ ] 100 % parcours démo 5 min OK
- [ ] 0 régression scanner / points
- [ ] Logs sync exploitables
- [ ] Documentation restaurateur (1 page PDF/Notion — hors scope dev)

---

### PHASE 13 — Version commerciale

**Objectif :** packaging offre sans dev Stripe immédiat.

#### Offre Starter (proposition)
- Carte Wallet personnalisée (logo + couleur)
- QR inscription
- Scanner points/tampons
- 1 récompense simple
- Sync solde Wallet

#### Offre Pro (proposition)
- Tout Starter +
- Bannière hero
- Message promo sur carte
- Notifications transactionnelles Wallet
- 1 campagne promo active / mois
- Support prioritaire setup Apple/Google

#### Limites assumées (communication commerciale)
- Pas d’app mobile client
- Notifications = mises à jour Wallet, pas SMS/push illimités
- Design soumis aux contraintes Apple/Google review

---

## 8. Ordre recommandé d’implémentation

```
Phase 0 ✅ (audit — ce document)
    ↓
Phase 1 — Spec design + WalletCardViewModel
    ↓
Phase 2 — Migration données légère + assets
    ↓
Phase 3 — Apple Wallet amélioré    ←──┐
    ↓                                  │ parallélisable
Phase 4 — Google Wallet amélioré   ←──┘
    ↓
Phase 5 — Admin personnalisation + preview
    ↓
Phase 6 — Sync renforcée + logs
    ↓
Phase 7 — Notifications transactionnelles
    ↓
Phase 11 — RGPD consentement (peut être avant Phase 8 si promo marketing)
    ↓
Phase 8 — Offres promo simples
    ↓
Phase 9 — Notifications promo
    ↓
Phase 12 — Tests complets
    ↓
Phase 13 — Packaging commercial
    ↓
Phase 10 — Géolocalisation (V2+)
```

### MVP prioritaire (minimum vendable amélioré)

1. **Phase 1** — spec
2. **Phase 3 + 4** — carte plus belle (nom, logo, solde, dos riche, prochaine récompense)
3. **Phase 5** — admin couleur/logo/message
4. **Phase 6** — sync fiable + logs
5. **Phase 7** — notif « vous avez gagné X points »

### Backlog V2/V3

- Campagnes avancées + segmentation
- Géolocalisation (Phase 10)
- Logo Wallet séparé, multi-langue
- Staff multi-utilisateurs dashboard
- Export clients CSV
- Webhook partenaire caisse
- White-label domaine `{slug}.regalclic.app`

---

## 9. Fichiers probablement concernés (index global)

| Domaine | Fichiers |
|---------|----------|
| Modèle partagé | `supabase/functions/_shared/wallet-card-model.ts` (**nouveau**) |
| Apple | `apple-pass-builder.ts`, `wallet-apple-pass/index.ts`, `wallet-apple-webhook/index.ts`, `apple-apns.ts` |
| Google | `google-wallet-core.ts`, `wallet-google/index.ts` |
| Sync | `wallet-sync-core.ts`, `wallet-sync-membership/index.ts`, `wallet-sync-worker/index.ts` |
| Branding | `wallet-branding.ts` |
| Migrations | `supabase/migrations/20250626xxxx_*.sql` |
| Dashboard | `BusinessSettingsPage.jsx`, `OffersPage.jsx` (**nouveau**), `WalletCardPreview.jsx` (**nouveau**) |
| Join | `JoinPage.jsx`, `public-join/index.ts` |
| Scan | `ScanPage.jsx`, `scan.js` (inchangé métier, maybe sync logs UI) |
| Docs | `docs/WALLET_CARD_SPEC.md`, `docs/V1_TEST_PLAN.md` |

---

## 10. Variables d’environnement potentielles (nouvelles)

| Variable | Usage |
|----------|-------|
| `REGALCLIC_WALLET_DEFAULT_HERO_URL` | Bannière fallback |
| `REGALCLIC_WALLET_STRIP_URL` | Strip Apple fallback |
| `WALLET_SYNC_MAX_RETRIES` | Worker |
| `WALLET_CAMPAIGN_MAX_PER_DAY` | Anti-spam promo |
| `APPLE_PASS_STYLE` | `generic` ou `storeCard` (feature flag) |

---

## 11. Risques techniques (synthèse)

| # | Risque | Mitigation |
|---|--------|------------|
| R1 | Changer structure pass Apple casse cartes installées | Versionner passes ; communiquer ré-ajout |
| R2 | Google notif spam / rejet | Limiter `TEXT_AND_NOTIFY` ; 1 notif / transaction significative |
| R3 | Images invalides | Validation upload + resize |
| R4 | Apple sans device enregistré | Détecter via `apple_wallet_registrations` ; UX claire |
| R5 | Issuer Google en review | Testeurs ; doc statut `UNDER_REVIEW` |
| R6 | Sync bloque pas mais UX mauvaise si échec silencieux | Toasts + logs admin |
| R7 | RGPD marketing sans opt-in | Phase 11 avant promo notifiante |
| R8 | Complexité campagnes | Ultra-MVP = 1 champ `wallet_promo_message` avant tables |

---

## 12. Stratégie de test

1. **Tests unitaires** (optionnel) : `wallet-card-model` calculs prochaine récompense
2. **Tests intégration** : génération pass.json snapshot
3. **Tests manuels** : [`V1_TEST_PLAN.md`](V1_TEST_PLAN.md) étendu après chaque phase
4. **Tests device réels** obligatoires pour Phases 3, 4, 7, 9

---

## 13. Critères de validation globaux (Definition of Done améliorations)

- [ ] Aucune régression parcours V1 (join → wallet → scan → points)
- [ ] Carte Apple et Google affichent logo, nom client, solde, QR fonctionnel
- [ ] Dos de carte / modules texte avec règles programme et liens
- [ ] Restaurateur personnalise couleur/logo/message sans déploiement code
- [ ] Sync post-transaction < 5 s Google, Apple si device enregistré
- [ ] Notification transactionnelle testée sur 1 iPhone + 1 Android
- [ ] Offre promo affichable (même sans notif) sur cartes actives
- [ ] Logs sync consultables
- [ ] Consentement marketing si notifications promo
- [ ] Documentation restaurateur à jour

---

## 14. Prochaine action recommandée

Quand vous serez prêt à coder, demandez :

> **« Implémente la Phase 1 »** — création du `WalletCardViewModel` et spec champs.  
> Puis enchaîner **Phase 2 → Phase 3 → Phase 4** pour l’impact visuel maximal.

---

*Document maintenu par l’équipe RegalClic Wallet — ne pas supprimer l’existant sans migration explicite.*
