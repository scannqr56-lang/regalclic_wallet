# Roadmap — Assistant IA Fidélité (RegalClic Wallet)

> **Objectif** : cadrage et découpage en phases de l’**Assistant IA Fidélité** dans RegalClic Wallet.  
> **Statut** : **MVP implémenté** (phases 2–16 + fondations 13–15–17 preview, juin 2026) — voir §25 pour la validation prod.  
> **Dernière mise à jour** : juin 2026 — projet `regalclic_wallet` (prod Vercel + Supabase `pfutrevqneggudriiyxr`).  
> **MVP** : validé et livré en code ; tests manuels E2E restants.

---

## Décisions produit validées

| Sujet | Décision | Détail technique |
|-------|----------|------------------|
| **MVP** | ✅ Validé | Voir section 16 — périmètre minimal lançable |
| **Provider IA** | **OpenAI** | `OPENAI_API_KEY` ; extraction menu → `gpt-4o` ; génération → `gpt-4o-mini` (ajustable) |
| **Storage menus** | **Bucket privé dédié** | Nouveau bucket `business-private` (non public), signed URLs courtes, RLS `is_business_member` — **ne pas** réutiliser `business-assets` (public) |
| **Billing V1** | **Flag plan manuel** | Colonne `businesses.plan` : `starter` \| `pro_ia` \| `business` — pas de Stripe au MVP ; **Stripe en V2** quand monétisation self-service |
| **Essai Starter** | **1 génération gratuite** | Flag `businesses.ai_trial_used` ; après essai → upgrade Pro IA requis |
| **Calendrier par défaut** | **30 jours** | Génération MVP : plan marketing sur 30 jours (plus 7/14 en option ultérieure) |

### Avancement implémentation (juin 2026)

| Phase | Intitulé | Statut |
|-------|----------|--------|
| 0 | Audit Wallet | Partiel |
| 1 | Cadrage UX | Partiel (wireframes / disclaimers UI) |
| 2–12 | Données → quotas | ✅ Livré |
| 13–14 | Prompts, logs, coûts | ✅ Livré |
| 15 | Tests | Partiel (auto ✅, E2E manuel) |
| 16 | MVP | ✅ Livré |
| 17 | V2/V3 | Backlog + preview insights |

---

## 1. Résumé de la fonctionnalité

**Assistant IA Fidélité** : un copilote marketing intégré au dashboard restaurateur qui, à partir d’un **menu uploadé** (PDF / image) et d’un **questionnaire court**, propose :

- des **récompenses** adaptées (points / tampons),
- des **offres promotionnelles** prêtes à l’emploi,
- des **messages de notification Wallet** courts,
- un **mini calendrier marketing** (7 / 14 / 30 jours),

avec **validation humaine obligatoire** avant toute publication sur les cartes Wallet.

**Positionnement** : option **Pro IA** au-dessus du Starter Wallet existant.

---

## 2. Problème terrain identifié

Les restaurateurs et commerces locaux manquent souvent de :

| Manque | Conséquence |
|--------|-------------|
| Temps pour concevoir des offres | Fidélité statique, peu renouvelée |
| Compétences marketing | Récompenses mal calibrées ou trop généreuses |
| Idées de récompenses | Seuils arbitraires (100 points « parce que ») |
| Rédaction de messages courts | Notifications Wallet absentes ou mal formulées |
| Recul sur les seuils points/tampons | Marge impactée ou programme peu motivant |
| Rythme de création d’offres | Pas de calendrier, pas de promos récurrentes |

RegalClic Wallet sait déjà **techniquement** mettre à jour une carte et envoyer une notif promo — mais le restaurateur ne sait pas **quoi** proposer.

---

## 3. Objectif business

| Offre | Contenu |
|-------|---------|
| **Starter Wallet** | Carte Wallet, QR, scan, points/tampons, sync, offres manuelles |
| **Pro IA** | Starter + Assistant IA Fidélité + suggestions + notifs prêtes + calendrier |
| **Business** (futur) | Multi-établissements, quotas élevés, accompagnement |

**Messages commerciaux** :

- *« Vous n’avez pas besoin d’être expert marketing. RegalClic vous propose les bonnes récompenses et les bonnes offres à envoyer à vos clients. »*
- *« Ajoutez votre menu, l’IA vous génère un plan de fidélité prêt à utiliser. »*

**Règle absolue** : l’IA **propose**, le restaurateur **valide**. Aucune publication automatique sans action explicite en V1.

---

## 4. Objectif produit

Répondre aux 10 questions métier :

1. Quelle récompense offrir sans trop perdre de marge ?
2. Combien de points / tampons avant déblocage ?
3. Boisson, dessert, réduction ou points bonus ?
4. Quelle offre envoyer cette semaine ?
5. Quel message court envoyer via Wallet ?
6. Comment remplir les heures creuses ?
7. Comment augmenter le panier moyen ?
8. Comment faire revenir les clients inactifs ? *(hors périmètre données V1 — suggestions génériques uniquement)*
9. Comment pousser un nouveau produit ?
10. Comment créer un plan marketing simple sur 30 jours ?

---

## 5. Périmètre MVP

| Inclus MVP | Détail |
|------------|--------|
| Upload menu | PDF, JPG, PNG, WebP — bucket **`business-private`** (dédié, non public) |
| Questionnaire | 8 questions, sauvegarde profil commerce |
| Extraction menu | OpenAI vision / PDF → JSON — fallback saisie manuelle |
| Génération IA | 5 récompenses, 5 offres, 10 notifications, **calendrier 30 jours** |
| Affichage | Cartes suggestions, filtres, badges risque marge |
| Actions | Utiliser → brouillon offre / ajuster programme / calendrier |
| Validation | Obligatoire avant activation campagne ou changement seuil |

---

## 6. Périmètre exclu (V1 / MVP)

- Publication automatique sans validation
- Segmentation comportementale avancée (clients inactifs réels)
- Analyse de marge réelle (coûts, food cost)
- Prédiction de chiffre d’affaires
- A/B testing
- Automatisations (envoi programmé auto)
- Ciblage fin par client
- Connexion caisse / POS
- Envoi de données clients nominatives à l’IA
- Assistant conversationnel libre (chat multi-tours) — V2

---

## 7. Parcours utilisateur cible

```
Dashboard → Assistant IA Fidélité
    │
    ├─► [1] Upload menu (PDF / photo)
    │       └─► Extraction → aperçu produits/prix → correction manuelle si besoin
    │
    ├─► [2] Questionnaire (objectif, creux, ton, générosité…)
    │       └─► Sauvegarde profil IA
    │
    ├─► [3] « Générer mes suggestions »
    │       └─► Batch IA (récompenses + offres + notifs + calendrier)
    │
    ├─► [4] Parcourir suggestions
    │       ├─► Utiliser → brouillon offre Wallet / ajuster programme
    │       ├─► Modifier → édition inline
    │       ├─► Ignorer
    │       └─► Copier le texte
    │
    ├─► [5] Calendrier marketing proposé
    │       └─► Marquer « prêt » / « ignoré » — pas d’envoi auto
    │
    └─► [6] Historique des générations
```

**Lien avec l’existant** :

- Suggestion « offre » → `wallet_campaigns` (status `draft`) via flux similaire à `OffersPage` + `campaigns.js`
- Suggestion « récompense / seuil » → `loyalty_programs` + table `rewards` (déjà utilisée par `ProgramSettingsPage.jsx`)
- Suggestion « notification » → champs `message` / `offer_label` de campagne + case `notify_on_activate` (respect politique silent/notify)

---

## 8. Architecture fonctionnelle

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard React (Vite)                                         │
│  /dashboard/ai-assistant/*                                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │ JWT Supabase Auth
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase                                                       │
│  • Postgres (tables ai_*, RLS is_business_member)               │
│  • Storage (menus uploadés, privé par business)                 │
│  • Edge Functions (extraction + génération IA — clé serveur)      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
     OpenAI (GPT-4o / GPT-4o-mini)   Système Wallet existant
     • extraction vision              • wallet_campaigns
     • génération JSON                • loyalty_programs / rewards
                                     • wallet-campaign-broadcast
                                     • wallet-sync-membership
```

**Principes d’intégration** (alignés V1) :

1. **Ne pas modifier** le flux scan → RPC → sync Wallet pour l’IA.
2. **Réutiliser** `wallet_campaigns` pour les offres générées (brouillon).
3. **Réutiliser** `ProgramSettingsPage` / `rewards` pour seuils et libellés.
4. **Respecter** `wallet-update-core.ts` : fidélité = silent, promo validée = notify optionnelle.
5. **Toute** appel IA côté **Edge Function** (jamais clé API dans le navigateur).

---

## 9. Audit de l’existant (Phase 0 — intégré)

### 9.1 Stack actuelle

| Couche | Technologie | Fichiers clés |
|--------|-------------|---------------|
| Frontend | Vite 6, React 18, React Router 6, TanStack Query 5, Tailwind, shadcn minimal | `package.json`, `src/App.jsx` |
| Auth | Supabase Auth email/password | `src/lib/AuthContext.jsx`, `ProtectedRoute.jsx` |
| Commerce | 1 commerce / session restaurateur | `src/hooks/useMyBusiness.js` → RPC `get_my_business()` |
| Backend | Supabase Postgres + RLS | `supabase/migrations/` |
| Edge | Deno, 8 fonctions | `supabase/functions/` |
| Prod | Vercel + Supabase `pfutrevqneggudriiyxr` | `vercel.json` |

### 9.2 Routes dashboard existantes

| Route | Page | Lien IA |
|-------|------|---------|
| `/dashboard` | `DashboardHomePage.jsx` | Entrée via sidebar « Assistant IA » (`DashboardLayout`) |
| `/dashboard/business` | `BusinessSettingsPage.jsx` | Logo, hero, branding — **réutiliser upload** |
| `/dashboard/program` | `ProgramSettingsPage.jsx` | Seuils, `reward_label`, table `rewards` |
| `/dashboard/offers` | `OffersPage.jsx` | **Cible principale** offres brouillon / actives |
| `/dashboard/qr` | `QrPage.jsx` | — |
| `/dashboard/scan` | `ScanPage.jsx` | — |
| `/dashboard/customers` | `CustomersPage.jsx` | Pas de données client vers IA en V1 |
| `/dashboard/customers/:id` | `CustomerDetailPage.jsx` | — |

### 9.3 Tables existantes réutilisables

| Table | Usage IA |
|-------|----------|
| `businesses` | Contexte commerce (nom, type implicite, branding) |
| `loyalty_programs` | Type points/tampons, seuils actuels, `reward_label` |
| `rewards` | Récompense catalogue (1 ligne liée au programme) |
| `wallet_campaigns` | Offres promo — **création brouillon depuis suggestion** |
| `wallet_campaign_broadcast_logs` | Stats après activation (lecture seule IA) |
| `business-assets` (storage) | Modèle upload — **nouveau préfixe `menus/`** |

### 9.4 Système offres & notifications (existant)

- **Campagnes** : `wallet_campaigns` + EF `wallet-campaign-broadcast` (`activate`, `end`, `update`, `delete`, `notify_all`, `notify_test`, `quota_status`)
- **Frontend** : `src/lib/campaigns.js`, `src/pages/dashboard/OffersPage.jsx`
- **Notifications** : politique dans `wallet-update-core.ts` / `wallet-notification-core.ts`
  - Fidélité (points, tampons) → **silent**
  - Promo validée + `notify_on_activate` → **notify** (quota `WALLET_CAMPAIGN_MAX_PER_DAY`)
- **Carte** : `wallet-card-model.ts` — ViewModel partagé Apple/Google

### 9.5 Upload & Storage existants

- Bucket `business-assets` (public, 2 Mo, images) — `supabase/migrations/20250625120003_v1_storage.sql`
- Helpers : `uploadBusinessLogo`, `uploadBusinessHero` dans `src/lib/supabase.js`
- Traitement image : `src/lib/wallet-image.js` (webp)

**Décision validée** : bucket **`business-private`** (dédié, **non public**).

| Paramètre | Valeur |
|-----------|--------|
| Bucket | `business-private` (nouvelle migration) |
| Public | **Non** — accès via signed URL uniquement (Edge Function) |
| Chemin | `{business_id}/ai-menus/{upload_id}.{ext}` |
| Policies | `is_business_member(business_id)` — select/insert/delete |
| Séparation | `business-assets` reste pour logos/heroes publics ; menus IA isolés |

Les helpers existants `uploadBusinessLogo` / `uploadBusinessHero` (`src/lib/supabase.js`) **ne sont pas réutilisés** pour les menus — flux upload dédié via EF `ai-menu-upload`.

### 9.6 Edge Functions existantes (ne pas casser)

| Function | Rôle |
|----------|------|
| `public-join` | Inscription client |
| `wallet-apple-pass` | Génération pkpass |
| `wallet-apple-webhook` | PassKit |
| `wallet-google` | Save to Wallet |
| `wallet-sync-membership` | Sync post-scan |
| `wallet-sync-worker` | Cron file d’attente |
| `wallet-campaign-broadcast` | Campagnes promo |
| `wallet-stamp-strip` | PNG tampons |

**Nouvelles fonctions prévues** (Phase ultérieure) : `ai-menu-upload`, `ai-extract-menu`, `ai-generate-suggestions`, `ai-suggestion-use`.

### 9.7 Points réutilisables

- Pattern **OffersPage** : formulaire + mutations + appel EF
- Pattern **campaigns.js** : CRUD Supabase + `invokeCampaignAction`
- Pattern **BusinessSettingsPage** : upload fichier + preview
- Pattern **wallet-card-model** : messages promo sur carte
- RLS `is_business_member(business_id)` — à répliquer sur toutes tables `ai_*`
- RPC `get_business_stats` — contexte KPI futur V2 (non envoyé à l’IA en V1)

### 9.8 Zones à ne pas casser

- Flux scan : `add_points_to_membership`, `add_stamp_to_membership`, `redeem_reward` (migration `20250628120000`)
- Sync Wallet et politique silent/notify
- Pass Apple/Google génération
- RLS clients (`customers` insert via service role uniquement)
- Contrainte 1 campagne active / commerce

### 9.9 Risques techniques principaux

| Risque | Mitigation |
|--------|------------|
| Coût IA incontrôlé | Quotas Pro, logs tokens, limite taille menu |
| Extraction menu erronée | Fallback saisie manuelle + preview éditable |
| JSON IA invalide | Validation Zod + retry + message utilisateur |
| Fuite clé API | Edge Functions uniquement |
| Menus sensibles publics | Storage privé + signed URLs |
| Suggestions trop agressives | Prompt + badge risque marge + disclaimers |
| Conflit avec campagne active | Créer brouillon uniquement ; activation manuelle |
| PDF scanné illisible | OCR / vision + statut `extraction_failed` |

### 9.10 Architecture cible proposée

- **3 couches** : Upload/Extraction → Profil + Génération → Validation/Publication
- **1 batch** = 1 génération complète (récompenses + offres + notifs + calendrier)
- **Statuts suggestion** : `pending` → `accepted` | `modified` | `discarded` | `applied`
- **Lien applied** : `wallet_campaign_id` ou `loyalty_program_snapshot` en metadata

---

## 10. Modèle de données proposé

### 10.1 Tables existantes — pas de duplication

| Besoin IA | Table existante |
|-----------|-----------------|
| Offre promo | `wallet_campaigns` |
| Libellé / seuil récompense | `loyalty_programs` + `rewards` |
| Message sur carte | `businesses.wallet_promo_message` ou campagne `message` |

### 10.2 Nouvelles tables

#### `ai_menu_uploads` — **indispensable V1**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `business_id` | uuid FK → businesses | |
| `uploaded_by` | uuid FK → auth.users | |
| `storage_path` | text | Chemin bucket privé |
| `file_name` | text | |
| `file_type` | text | mime |
| `file_size` | integer | |
| `status` | text | `uploaded` \| `extracting` \| `extracted` \| `failed` |
| `extracted_text` | text | Brut OCR/PDF |
| `extracted_json` | jsonb | Structure menu normalisée |
| `error_message` | text | |
| `created_at`, `updated_at` | timestamptz | |

#### `ai_restaurant_profiles` — **indispensable V1**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `business_id` | uuid FK unique | 1 profil actif / commerce |
| `business_type` | text | pizza, snack, boulangerie… |
| `main_objective` | text | enum objectifs |
| `quiet_days` | text[] | ex. `['mardi','mercredi']` |
| `quiet_hours` | text | ex. `14h-18h` |
| `products_to_push` | text[] | |
| `preferred_rewards` | text[] | boisson, dessert… |
| `average_ticket` | numeric | |
| `generosity_level` | text | `prudent` \| `balanced` \| `aggressive` |
| `tone_of_voice` | text | chaleureux, direct… |
| `offers_to_avoid` | text | |
| `margin_sensitivity` | text | faible / moyenne / élevée |
| `notes` | text | |
| `created_at`, `updated_at` | timestamptz | |

#### `ai_suggestion_batches` — **indispensable V1**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `business_id` | uuid FK | |
| `menu_upload_id` | uuid FK nullable | |
| `profile_id` | uuid FK | |
| `type` | text | `full_plan` \| `rewards_only`… |
| `status` | text | `processing` \| `completed` \| `failed` |
| `prompt_version` | text | ex. `v1.0.0` |
| `model_used` | text | |
| `raw_input` | jsonb | Snapshot entrées (sans PII client) |
| `raw_output` | jsonb | Réponse brute IA |
| `error_message` | text | |
| `created_by` | uuid | |
| `created_at` | timestamptz | |

#### `ai_suggestions` — **indispensable V1**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `business_id` | uuid FK | |
| `batch_id` | uuid FK | |
| `suggestion_type` | text | `reward` \| `offer` \| `notification` \| `threshold` \| `calendar_tip` |
| `title` | text | |
| `description` | text | |
| `objective` | text | |
| `customer_message` | text | Texte carte / promo |
| `wallet_notification_title` | text | Court |
| `wallet_notification_body` | text | Court |
| `recommended_threshold` | integer | Points ou tampons |
| `recommended_timing` | text | ex. `mardi 17h` |
| `target_segment` | text | `all` \| `loyal` \| `inactive`… |
| `margin_risk` | text | `low` \| `medium` \| `high` |
| `confidence_score` | numeric | 0–1 optionnel |
| `explanation` | text | Pourquoi cette suggestion |
| `status` | text | `pending` \| `accepted` \| `modified` \| `discarded` \| `applied` |
| `applied_entity_type` | text | `wallet_campaign` \| `loyalty_program` |
| `applied_entity_id` | uuid | |
| `created_at`, `updated_at` | timestamptz | |

#### `ai_marketing_calendar_items` — **indispensable V1**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `business_id` | uuid FK | |
| `batch_id` | uuid FK | |
| `suggestion_id` | uuid FK nullable | |
| `scheduled_date` | date | |
| `title` | text | |
| `objective` | text | |
| `offer_message` | text | |
| `wallet_message` | text | |
| `target_segment` | text | |
| `advice` | text | |
| `status` | text | `draft` \| `ready` \| `published` \| `ignored` |
| `wallet_campaign_id` | uuid FK nullable | Si appliqué |
| `created_at`, `updated_at` | timestamptz | |

#### `ai_usage_logs` — **utile V1, renforcé V2**

| Champ | Type | Notes |
|-------|------|-------|
| `id` | uuid PK | |
| `business_id` | uuid FK | |
| `user_id` | uuid | |
| `action` | text | `extract_menu`, `generate_batch`… |
| `batch_id` | uuid nullable | |
| `tokens_input` | integer | |
| `tokens_output` | integer | |
| `cost_estimate` | numeric | USD/EUR estimé |
| `model_used` | text | |
| `duration_ms` | integer | |
| `created_at` | timestamptz | |

### 10.3 Synthèse par version

| Table | V1 MVP | V2 |
|-------|--------|-----|
| `ai_menu_uploads` | ✅ | Enrichir métadonnées |
| `ai_restaurant_profiles` | ✅ | Historique versions |
| `ai_suggestion_batches` | ✅ | — |
| `ai_suggestions` | ✅ | Scoring performance |
| `ai_marketing_calendar_items` | ✅ | Rappels auto |
| `ai_usage_logs` | ✅ | Dashboard coûts admin |
| `business_subscriptions` | ❌ | Quotas Pro/Business |

---

## 11. Phases détaillées

---

### PHASE 0 — Audit de l’existant

**Objectif** : valider l’intégration sans régression V1.

**Livrables** :
- [x] Résumé stack (section 9)
- [x] Provider IA : **OpenAI**
- [x] Bucket menus : **`business-private`** (privé dédié)
- [ ] Revue manuelle post-déploiement de chaque flux Wallet
- [ ] Cartographie dépendances `wallet-card-model.ts`

**Checklist** :
- [ ] Lire `docs/ROADMAP_WALLET_AMELIORATIONS.md` (phases 7–9 notifs/campagnes)
- [ ] Lire `docs/WALLET_CARD_SPEC.md`
- [ ] Tester `OffersPage` bout en bout
- [ ] Documenter écarts README vs routes réelles (`/dashboard/offers`)

---

### PHASE 1 — Cadrage produit Assistant IA Fidélité

**Objectif** : figer le périmètre V1 Pro IA.

**Inclus V1** :
- Upload menu + questionnaire + génération + validation + brouillons

**Exclu V1** : voir section 6

**Starter vs Pro IA** :

| Fonction | Starter | Pro IA |
|----------|---------|--------|
| Carte Wallet | ✅ | ✅ |
| Offres manuelles | ✅ | ✅ |
| Assistant IA | **1 essai gratuit** puis ❌ | ✅ quotas mensuels |
| Calendrier IA | ❌ (sauf inclus dans l’essai) | ✅ 30 j / génération |
| Historique générations | ❌ | ✅ |

**Règles validation humaine** :
1. Toute suggestion = statut `pending` à la création
2. « Utiliser » = création brouillon + statut `applied` après succès
3. Activation campagne = action explicite sur `OffersPage` (existant)
4. Aucun `notify_all` automatique depuis l’IA

**Checklist** :
- [ ] Maquettes Figma ou wireframes 5 écrans
- [ ] Copywriting disclaimers légaux **dans l’UI** (« à valider selon vos marges » — présent dans les sorties IA, pas encore en bandeau fixe)
- [x] Définir nom menu sidebar : « Assistant IA » (`/dashboard/ai-assistant`)

---

### PHASE 2 — Modèle de données

**Objectif** : migration SQL + RLS.

**Fichiers à créer** :
- `supabase/migrations/YYYYMMDDHHMMSS_ai_assistant_core.sql`

**RLS pattern** (aligné existant) :
```sql
-- Exemple
create policy "ai_menu_uploads_select_member"
  on public.ai_menu_uploads for select
  using (public.is_business_member(business_id));
```

**Checklist** :
- [x] Migration tables section 10.2 + `businesses.plan`, `businesses.ai_trial_used` (`20250629120000_ai_assistant_core.sql`)
- [x] Index `business_id`, `batch_id`, `status`
- [x] FK cascade `business_id` → `on delete cascade`
- [x] Grants : authenticated SELECT/INSERT/UPDATE ; pas de DELETE client sur logs
- [x] Migration bucket **`business-private`** + policies storage (`20250629120001_ai_storage_business_private.sql`)

---

### PHASE 3 — Upload menu PDF / image

**Objectif** : écran upload sécurisé.

**Route** : `/dashboard/ai-assistant/upload`

**UI** :
- Zone drag & drop (réutiliser patterns `BusinessSettingsPage`)
- Preview fichier
- Barre progression
- Liste uploads précédents

**Contraintes** :
| Paramètre | Valeur recommandée |
|-----------|-------------------|
| Formats | PDF, JPG, PNG, WebP |
| Taille max | 10 Mo (configurable `AI_MAX_MENU_FILE_SIZE_MB`) |
| MIME | Vérification serveur |
| Chemin | `{business_id}/ai-menus/{uuid}.{ext}` |

**Edge Function** : `ai-menu-upload` (POST multipart ou signed upload URL)

**Checklist** :
- [x] Composant `MenuUploadZone.jsx`
- [x] Page `AiAssistantUploadPage.jsx`
- [x] Enregistrement ligne `ai_menu_uploads`
- [x] Gestion erreur réseau / taille

---

### PHASE 4 — Extraction contenu menu

**Objectif** : produire `extracted_json` structuré.

**Stratégies** :

| Source | Approche |
|--------|----------|
| PDF texte | Extraction texte native (pdf.js / serveur) puis LLM structuration |
| PDF image | Vision model (GPT-4o vision) |
| Photo menu | Vision + OCR fallback |
| Échec | Formulaire édition manuelle catégories/produits |

**JSON cible** :
```json
{
  "categories": [
    {
      "name": "Pizzas",
      "items": [
        { "name": "Margherita", "description": "...", "price": 9.90 }
      ]
    }
  ],
  "menus": [
    { "name": "Menu midi", "price": 12.90, "included_items": ["plat", "boisson"] }
  ],
  "detected_currency": "EUR",
  "extraction_confidence": "medium",
  "notes": ["Prix à vérifier — page 2 floue"]
}
```

**Edge Function** : `ai-extract-menu`

**Checklist** :
- [x] Statuts `extracting` → `extracted` | `failed`
- [x] UI édition manuelle post-extraction (`MenuExtractionEditor`, `AiAssistantMenuPage`)
- [x] Ne jamais afficher « marge garantie » (sanitisation phase 13)
- [x] Timeout 60–120 s + message utilisateur

---

### PHASE 5 — Questionnaire restaurateur

**Objectif** : compléter le menu.

**Route** : `/dashboard/ai-assistant/profile`

**Questions** (8) — voir cahier des charges utilisateur.

**Stockage** : `ai_restaurant_profiles` upsert par `business_id`

**Checklist** :
- [x] Formulaire une page (`AiAssistantProfilePage`, 8 questions)
- [x] Valeurs par défaut depuis `loyalty_programs` (seuil actuel, type)
- [x] Bouton enregistrer + Edge Function `ai-restaurant-profile`
- [x] Validation côté client + serveur (`validateRestaurantProfilePayload`)

---

### PHASE 6 — Génération IA des récompenses

**Objectif** : 5+ suggestions récompense + 3 seuils.

**Entrées** :
- `extracted_json` menu
- `ai_restaurant_profiles`
- `loyalty_programs` (type points/tampons actuel)

**Sortie JSON** (extrait) :
```json
{
  "rewards": [
    {
      "title": "100 points = boisson offerte",
      "description": "...",
      "objective": "augmenter_fréquence",
      "type": "points",
      "recommended_threshold": 100,
      "margin_risk": "low",
      "explanation": "La boisson a généralement une marge plus confortable qu'une remise globale — à valider selon vos coûts."
    }
  ],
  "threshold_options": [
    { "points": 80, "rationale": "..." },
    { "points": 100, "rationale": "..." },
    { "points": 120, "rationale": "..." }
  ]
}
```

**Edge Function** : partie de `ai-generate-suggestions` ou endpoint dédié

**Checklist** :
- [x] Prompts v1 (`ai-prompts/v1/`)
- [x] Validation schéma (`ai-schemas/`, parsing + retry)
- [x] Insert `ai_suggestions` type `reward` | `threshold`
- [x] Retry 1× si JSON invalide (`ai-openai-json.ts`)

---

### PHASE 7 — Génération IA des offres promotionnelles

**Objectif** : 5 offres contextualisées.

**Types** : heure creuse, panier moyen, retour client, nouveauté, fidèles, double points/tampons, événement

**Champs** : titre, objectif, message client, durée, moment, cible, générosité, risque marge, conseil

**Lien** : préparer champs compatibles `wallet_campaigns` (`title`, `message`, `offer_label`, `starts_at`, `ends_at`)

**Checklist** :
- [x] Suggestions type `offer` en base
- [x] Badge UI risque marge (`MarginBadge` dans `SuggestionCard`)
- [x] Pas de promesse CA (sanitisation prompts + sorties)

---

### PHASE 8 — Génération IA des notifications Wallet

**Objectif** : 10 messages courts prêts pour Wallet.

**Contraintes RegalClic** (existant) :
- Notification = mise à jour carte + `changeMessage` Apple / `TEXT_AND_NOTIFY` Google
- Fidélité scan = **silent** — les notifs IA = **promo** uniquement
- Longueur : titre ≤ 40 car., corps ≤ 120 car. (recommandé)
- Emojis : optionnels, max 1–2
- Disclaimer : `WALLET_NOTIFY_DISCLAIMER` déjà sur `OffersPage`

**Exemples types** : offre, récompense, nouveauté, rappel, double points

**Checklist** :
- [x] Suggestions type `notification`
- [x] Lien vers champs campagne `message` + `offer_label` (application → brouillon)
- [x] Ton aligné `tone_of_voice` profil (prompt génération)

---

### PHASE 9 — Génération calendrier marketing

**Objectif** : plan marketing **30 jours** par défaut (options 7 / 14 en V2).

**Structure item** :
- date / période
- offre + objectif
- message Wallet
- cible + conseil
- statut `draft`

**UI** : `/dashboard/ai-assistant/calendar` — vue liste ou grille semaine

**Règle V1** : **aucun envoi automatique** — boutons « Créer brouillon offre » / « Programmer plus tard » (= statut `ready`)

**Checklist** :
- [x] Insert `ai_marketing_calendar_items`
- [x] Filtre par semaine (`AiAssistantCalendarPage`)
- [x] Export copier calendrier (« Copier la semaine »)

---

### PHASE 10 — Interface validation des suggestions

**Objectif** : hub de décision restaurateur.

**Route** : `/dashboard/ai-assistant/suggestions`

**UI** :
- Cartes par type (récompense / offre / notif / seuil)
- Filtres + tri risque marge
- Actions : Utiliser | Modifier | Ignorer | Copier

**Action « Utiliser »** :

| Type suggestion | Action technique |
|-----------------|----------------|
| `offer` | INSERT `wallet_campaigns` status `draft` + lien `applied_entity_id` |
| `notification` | Pré-remplir brouillon campagne avec `message` |
| `reward` / `threshold` | Redirect `ProgramSettingsPage` avec query params ou modal confirmation |
| `calendar_tip` | Créer brouillon + lier `ai_marketing_calendar_items` |

**Checklist** :
- [x] Composant `SuggestionCard.jsx`
- [x] Modale édition avant application (`SuggestionEditModal`)
- [x] Toast succès + lien vers offre brouillon

---

### PHASE 11 — Connexion système offres Wallet

**Objectif** : pont IA → RegalClic existant.

**Flux cible** :
```
Suggestion IA (offer)
    → wallet_campaigns (draft)
    → Restaurateur édite sur OffersPage
    → Activer (wallet-campaign-broadcast activate)
    → Sync cartes (broadcastCampaignToMemberships)
    → [Option] notify_on_activate si validé
```

**Fichiers existants étendus** :
- `src/lib/campaigns.js` — helper `createCampaignFromSuggestion(suggestion)`
- `src/pages/dashboard/OffersPage.jsx` — badge « Créée par IA »
- `supabase/functions/_shared/wallet-campaign-core.ts` — inchangé si brouillon seulement

**Récompenses** :
- Mise à jour `loyalty_programs.reward_label`, `reward_threshold` / `stamps_required`
- Upsert `rewards` (pattern `ProgramSettingsPage.jsx`)

**Checklist** :
- [x] Ne pas auto-activer campagne
- [x] Tracer `ai_suggestions.applied_entity_id` (`ai-apply-suggestion.js`)
- [x] Sync Wallet uniquement après activation manuelle (flux `OffersPage` inchangé)

---

### PHASE 12 — Gestion limites premium

**Objectif** : monétisation simple sans complexité paiement au lancement.

**Décision validée — V1** : flag manuel sur `businesses` :

```sql
-- Extension businesses (migration Phase 2)
plan text not null default 'starter'
  check (plan in ('starter', 'pro_ia', 'business')),
ai_trial_used boolean not null default false
```

| Plan | Attribution V1 | Générations / mois | Uploads menu / mois | Calendrier |
|------|----------------|-------------------|---------------------|------------|
| `starter` | Défaut à l’inscription | **1 essai** (lifetime) puis 0 | 1 (avec l’essai) | 30 j (avec l’essai) |
| `pro_ia` | Manuel admin / SQL / futur Stripe | 5 | 2 | 30 j |
| `business` | Manuel / contrat | 20 | 10 | 30 j |

**V2 billing** : intégration **Stripe** (abonnement Pro IA) — le flag `plan` sera mis à jour via webhook ; pas de Stripe au MVP.

**Checklist** :
- [x] Vérification quota dans EF **avant** appel OpenAI (`ai-quota-core.ts`)
- [x] Message UI « Essai utilisé — passez à Pro IA » (`AiQuotaBanner`)
- [x] Message UI quota Pro atteint
- [x] Feature flag `AI_ASSISTANT_ENABLED` global (code EF)
- [x] Script admin pour passer un commerce en `pro_ia` (`scripts/set-business-ai-plan.sql` + admin merchants)

---

### PHASE 13 — Prompt engineering et sécurité IA

**Objectif** : prompts versionnés, sorties fiables.

**Fichiers livrés** :
- `supabase/functions/_shared/ai-prompts/v1/system.ts`
- `supabase/functions/_shared/ai-prompts/v1/extract-menu.ts`
- `supabase/functions/_shared/ai-prompts/v1/generate-plan.ts`
- `supabase/functions/_shared/ai-schemas/` — validation + tests Deno
- `supabase/functions/_shared/ai-openai-json.ts` — retry JSON
- `supabase/functions/_shared/ai-sanitize.ts` — disclaimers sorties IA

**Prompt système — règles** :
1. Ne jamais garantir un résultat business
2. Toujours « à valider selon vos marges »
3. Signaler risque marge sur chaque suggestion
4. Ne pas inventer de prix absents du menu (marquer `estimated` si absent)
5. Adapter au `business_type` et `main_objective`
6. Propositions réalistes pour commerce local français
7. Le restaurateur garde la main avant publication
8. Formulations Wallet = alertes liées à carte, pas push marketing libre

**Retry** : 1 retry si JSON invalide ; sinon `batch.status = failed`

---

### PHASE 14 — Logs, coûts et observabilité

**Objectif** : maîtriser coûts et erreurs.

**À logger** (`ai_usage_logs`) :
- tokens in/out, modèle, durée, `business_id`, action
- coût estimé (table tarifs interne)

**Résilience** :
- Échec IA ≠ crash dashboard
- Message : « La génération a échoué, réessayez ou contactez le support »

**Checklist** :
- [x] Dashboard admin agrégat coûts (`AdminAiUsagePanel`)
- [x] Alerte si coût mensuel > seuil (`ai-usage-summary.ts`)

---

### PHASE 15 — Tests

**Stratégie** :

| Catégorie | Cas |
|-----------|-----|
| Upload | PDF texte, photo, fichier invalide, > taille max |
| Extraction | Menu sans prix, menu long, photo floue, JSON partiel |
| Génération | Récompenses, offres, notifs, calendrier |
| Validation | Utiliser, ignorer, modifier |
| Intégration | Création brouillon campagne, mise à jour programme |
| Sécurité | Accès autre business, anon, quota dépassé |
| IA | JSON invalide, timeout API, clé manquante |
| Wallet | Brouillon IA → activation → sync (non régression) |

**Fichier** : [`docs/V1_TEST_PLAN.md`](./V1_TEST_PLAN.md) §11 (Assistant IA Fidélité)

**Checklist** :
- [x] Section 11 ajoutée au plan de test (`V1_TEST_PLAN.md`)
- [x] Tests automatisés Vitest (`npm run test`) — quotas, onboarding, apply suggestion
- [x] Tests Deno schémas IA (`supabase/functions/_shared/ai-schemas/*.test.ts`)
- [ ] Validation manuelle E2E prod (§11.1–11.8) — à exécuter avant annonce Pro IA

### PHASE 16 — MVP recommandé

**Le plus petit lancement vendable** :

1. Upload menu PDF/image (storage privé)
2. Extraction + édition manuelle fallback
3. Questionnaire 8 questions
4. **1 clic** → génération :
   - 5 récompenses
   - 5 offres
   - 10 notifications Wallet
   - calendrier **30 jours**
5. Liste suggestions + filtres
6. « Utiliser » → brouillon `wallet_campaigns` ou préfill programme
7. Validation manuelle obligatoire
8. Quota Pro IA basique (5 générations/mois)

**Hors MVP** : segmentation avancée, auto-send, chat, analytics performance (→ backlog V2/V3)

**Statut** : **livré** (juin 2026) — hub `/dashboard/ai-assistant`, génération `full_plan` 1 clic, historique batches, onboarding guidé (`ai-onboarding.js`).

**Checklist** :
- [x] Upload menu PDF/image (storage privé)
- [x] Extraction + édition manuelle fallback
- [x] Questionnaire 8 questions
- [x] Génération 1 clic (récompenses, offres, notifs, calendrier 30 j)
- [x] Liste suggestions + filtres + pages par type
- [x] « Utiliser » → brouillon campagne ou préfill programme
- [x] Validation manuelle obligatoire
- [x] Quota Pro IA (5 générations/mois) + essai Starter

---

### PHASE 17 — Backlog V2 / V3

**Statut** : backlog documenté + fondations V2 preview livrées (juin 2026).

Voir [`docs/BACKLOG_ASSISTANT_IA_V2_V3.md`](./BACKLOG_ASSISTANT_IA_V2_V3.md).

**Preview livré** :
- RPC `get_ai_customer_insights` (segments fidèles / inactifs / nouveaux)
- Contexte scans réels injecté dans les prompts de génération
- Bandeau rappel « offres prêtes » sur le hub
- Panneau feuille de route V2/V3

**V2** (backlog) :
- Suggestions basées sur `loyalty_transactions` / scans réels
- Clients inactifs (dernière visite > X jours)
- Segmentation simple (fidèles vs nouveaux)
- Calendrier mensuel auto-proposé
- Rappels email dashboard « 2 offres prêtes cette semaine »
- Génération visuels promo (image carte)

**V3** :
- Scoring performance offres (taux sync / scans période)
- A/B testing messages
- Intégration caisse
- Analyse rentabilité si coûts saisis
- Assistant conversationnel
- Benchmark par type de commerce

---

## 12. Prompts IA à prévoir (résumé)

| Prompt | Rôle |
|--------|------|
| `system_v1` | Règles globales, ton, disclaimers |
| `extract_menu_v1` | Image/PDF → JSON menu |
| `generate_rewards_v1` | Récompenses + seuils |
| `generate_offers_v1` | Offres promo |
| `generate_notifications_v1` | Messages Wallet courts |
| `generate_calendar_v1` | Plan **30 jours** (défaut MVP) |

**Versioning** : champ `prompt_version` dans `ai_suggestion_batches`

---

## 13. Formats JSON attendus (schémas)

Voir sections Phase 4, 6, 7, 8, 9 + schémas livrés `supabase/functions/_shared/ai-schemas/`

**Validation** : parsing TypeScript côté Edge Function avant insert DB (+ tests Deno)

---

## 14. Fichiers livrés (référence)

### Frontend — livré
```
src/pages/dashboard/
  AiAssistantHomePage.jsx
  AiAssistantUploadPage.jsx
  AiAssistantMenuPage.jsx
  AiAssistantProfilePage.jsx
  AiAssistantSuggestionsPage.jsx
  AiAssistantRewardsPage.jsx
  AiAssistantOffersPage.jsx
  AiAssistantNotificationsPage.jsx
  AiAssistantCalendarPage.jsx
  AiAssistantHistoryPage.jsx
src/components/ai-assistant/
  AiAssistantNav.jsx, AiQuotaBanner.jsx, AiActivitySummary.jsx
  MenuUploadZone.jsx, MenuExtractionEditor.jsx
  SuggestionCard.jsx, SuggestionEditModal.jsx, CalendarItemCard.jsx
  AiCustomerInsightsPanel.jsx, AiReadySuggestionsBanner.jsx, AiRoadmapPanel.jsx
  AiOriginBadge.jsx
src/lib/
  ai-assistant.js, ai-apply-suggestion.js, ai-onboarding.js
src/components/admin/AdminAiUsagePanel.jsx
```

### Backend — livré
```
supabase/migrations/20250629120000_ai_assistant_core.sql
supabase/migrations/20250629120001_ai_storage_business_private.sql
supabase/migrations/20250629120002_ai_batch_calendar_type.sql
supabase/migrations/20250701120000_ai_customer_insights.sql
supabase/functions/ai-menu-upload/, ai-extract-menu/, ai-generate-suggestions/
supabase/functions/ai-restaurant-profile/, ai-suggestion-action/
supabase/functions/_shared/ai-prompts/, ai-schemas/, ai-quota-core.ts
supabase/functions/_shared/ai-usage-log.ts, ai-usage-summary.ts
supabase/functions/_shared/ai-customer-insights.ts, ai-generate-suggestions-core.ts
scripts/set-business-ai-plan.sql
```

### Existants — extension légère uniquement
```
src/App.jsx                          — routes ai-assistant
src/components/dashboard/DashboardLayout.jsx — nav
src/lib/campaigns.js                 — createFromSuggestion
src/pages/dashboard/OffersPage.jsx   — badge IA
src/pages/dashboard/ProgramSettingsPage.jsx — prefill seuil
.env.example                         — variables IA
docs/V1_TEST_PLAN.md                 — tests IA
```

### Existants — ne pas modifier en V1 IA (sauf extension explicitement listée)
```
supabase/functions/_shared/wallet-card-model.ts
supabase/functions/_shared/wallet-sync-core.ts
supabase/functions/_shared/wallet-notification-core.ts
RPC add_points / add_stamp / redeem_reward
```

---

## 15. Routes / pages à prévoir

| Route | Page | Description |
|-------|------|-------------|
| `/dashboard/ai-assistant` | `AiAssistantHomePage` | Hub, onboarding, génération 1 clic |
| `/dashboard/ai-assistant/upload` | `AiAssistantUploadPage` | Upload + liste menus |
| `/dashboard/ai-assistant/menu/:uploadId` | `AiAssistantMenuPage` | Extraction + édition menu |
| `/dashboard/ai-assistant/profile` | `AiAssistantProfilePage` | Questionnaire |
| `/dashboard/ai-assistant/suggestions` | `AiAssistantSuggestionsPage` | Hub validation batch |
| `/dashboard/ai-assistant/rewards` | `AiAssistantRewardsPage` | Génération récompenses |
| `/dashboard/ai-assistant/offers` | `AiAssistantOffersPage` | Génération offres |
| `/dashboard/ai-assistant/notifications` | `AiAssistantNotificationsPage` | Génération notifications |
| `/dashboard/ai-assistant/calendar` | `AiAssistantCalendarPage` | Calendrier proposé |
| `/dashboard/ai-assistant/history` | `AiAssistantHistoryPage` | Batches passés |

**Routes existantes liées** :
- `/dashboard/offers` — brouillons créés depuis IA
- `/dashboard/program` — seuils / récompenses

---

## 16. API / Edge Functions à prévoir

| Endpoint | Méthode | Auth | Rôle |
|----------|---------|------|------|
| `/functions/v1/ai-menu-upload` | POST | JWT | Enregistrer fichier + métadonnées |
| `/functions/v1/ai-extract-menu` | POST | JWT | Lancer extraction `menu_upload_id` |
| `/functions/v1/ai-generate-suggestions` | POST | JWT | Génération complète ou partielle |
| `/functions/v1/ai-suggestion-action` | POST | JWT | `use` \| `discard` \| `update` |

**Alternative** : RPC Supabase pour CRUD simple + 1 EF `ai-orchestrator` — préférer **EF** pour tout ce qui touche l’IA.

**Pas d’API `/api/*` Vercel** : le projet utilise Supabase Edge Functions exclusivement.

---

## 17. Variables d’environnement à prévoir

| Variable | Usage |
|----------|--------|
| `OPENAI_API_KEY` | **Provider validé** — secret Edge Functions uniquement |
| `AI_MODEL_MENU_EXTRACTION` | Défaut : `gpt-4o` (vision + PDF) |
| `AI_MODEL_SUGGESTIONS` | Défaut : `gpt-4o-mini` (génération batch) |
| `AI_MAX_MENU_FILE_SIZE_MB` | `10` |
| `AI_MONTHLY_GENERATION_LIMIT_STARTER` | `0` (hors 1 essai `ai_trial_used`) |
| `AI_MONTHLY_GENERATION_LIMIT_PRO` | `5` |
| `AI_MONTHLY_UPLOAD_LIMIT_PRO` | `2` |
| `AI_CALENDAR_DEFAULT_DAYS` | `30` |
| `AI_ASSISTANT_ENABLED` | `true` / `false` kill switch |
| `AI_PROMPT_VERSION` | `v1.0.0` |

**Existant requis** (déjà en prod) : `SUPABASE_SERVICE_ROLE_KEY`, secrets Wallet inchangés.

**Ne pas documenter dans `.env` frontend** : aucune clé IA côté Vite.

---

## 18. Règles de sécurité / RLS

1. Restaurateur ne voit que ses `ai_*` où `business_id` = son commerce (`is_business_member`)
2. Uploads menus : storage privé, signed URL courte durée
3. Génération IA : vérifier `business_id` + quota + plan côté serveur
4. **Aucune donnée client** (nom, téléphone, historique) dans prompts V1
5. Clé API IA uniquement Edge Functions
6. `ai_usage_logs` : insert service role ou EF ; select membre
7. Rate limiting EF (ex. 10 req/h/business) — optionnel MVP

---

## 19. Gestion premium / quotas

- Vérification **serveur** avant `ai-generate-suggestions`
- Comptage : `count(*) from ai_suggestion_batches where business_id = ? and created_at > début_mois`
- UI : bandeau « Pro IA requis » sur Starter
- Essai gratuit : **1 batch lifetime** si `plan = starter` et `ai_trial_used = false` ; puis passage `ai_trial_used = true`

---

## 20. Logs / coûts IA

- Chaque appel provider → ligne `ai_usage_logs` (`ai-usage-log.ts`)
- Estimation coût : tokens × tarif modèle (`ai-usage-summary.ts`)
- Dashboard restaurateur : « Générations restantes » (`AiQuotaBanner`, `AiActivitySummary`)
- Admin RegalClic : coût agrégé par mois + alerte seuil (`AdminAiUsagePanel`)

---

## 21. Stratégie de tests (synthèse)

Voir Phase 15 + [`V1_TEST_PLAN.md`](./V1_TEST_PLAN.md) §11 :

**Automatisés** (livré) :
- [x] Parsing schémas IA + quotas + apply suggestion (Vitest / Deno)

**Manuels prod** (à valider) :
- [ ] Upload invalide rejeté
- [ ] Extraction → édition → génération
- [ ] Suggestion offre → brouillon campagne visible OffersPage
- [ ] Activation manuelle → sync Wallet
- [ ] Quota Pro bloqué
- [ ] RLS cross-business refusé

---

## 22. Ordre d’implémentation recommandé

| # | Étape | Phase doc | Statut |
|---|--------|-----------|--------|
| 1 | Audit & décisions (provider, storage) | 0 | Partiel (audits manuels ouverts) |
| 2 | Cadrage produit + wireframes | 1 | Partiel (wireframes / disclaimers UI) |
| 3 | Migration tables + RLS + bucket | 2 | ✅ |
| 4 | Upload menu UI + EF | 3 | ✅ |
| 5 | Questionnaire profil | 5 | ✅ |
| 6 | Extraction menu | 4 | ✅ |
| 7 | Prompts + génération batch | 6, 7, 8, 13 | ✅ |
| 8 | UI suggestions + validation | 10 | ✅ |
| 9 | Pont brouillon offre / programme | 11 | ✅ |
| 10 | Calendrier UI | 9 | ✅ |
| 11 | Quotas premium | 12 | ✅ |
| 12 | Logs & coûts | 14 | ✅ |
| 13 | Tests E2E | 15 | Partiel (auto ✅, manuel prod) |
| 14 | Polish UI + copy | 16 | ✅ |
| 15 | Preview V2 insights | 17 | ✅ (backlog V2/V3 documenté) |

---

## 23. Décisions produit — historique

Toutes les questions ouvertes ont été tranchées (juin 2026). Voir encart **« Décisions produit validées »** en tête de document.

| # | Sujet | Décision retenue |
|---|--------|------------------|
| 1 | Provider IA | **OpenAI** (`gpt-4o` extraction, `gpt-4o-mini` génération) |
| 2 | Bucket menus | **`business-private`** — bucket dédié non public, signed URLs |
| 3 | Billing V1 | **Flag `businesses.plan`** manuel ; **Stripe en V2** |
| 4 | Essai Starter | **1 génération gratuite** (`ai_trial_used`) |
| 5 | Calendrier défaut | **30 jours** |

---

## 24. Prochaines étapes

**MVP code** : phases 2–16 livrées ; phase 17 = backlog V2/V3 + preview insights.

**Avant annonce Pro IA en prod** (§25) :
1. Exécuter les tests manuels [`V1_TEST_PLAN.md`](./V1_TEST_PLAN.md) §11
2. Ajouter disclaimers légaux **visibles** sur les pages assistant (bandeau fixe)
3. Documenter l’assistant dans le README restaurateur
4. Valider kill switch `AI_ASSISTANT_ENABLED` en staging/prod

**Développement suivant** : prioriser le backlog [`BACKLOG_ASSISTANT_IA_V2_V3.md`](./BACKLOG_ASSISTANT_IA_V2_V3.md) (Stripe, emails, scoring…).

---

## 25. Checklist globale « prêt pour prod Pro IA »

- [x] Migration appliquée prod (`ai_*`, `business-private`, insights V2)
- [x] Edge Functions déployées + secrets IA (`ai-menu-upload`, `ai-extract-menu`, `ai-generate-suggestions`, …)
- [x] Quotas actifs (`ai-quota-core`, `AiQuotaBanner`)
- [ ] Disclaimers légaux **page assistant** (bandeau UI — présents dans sorties IA seulement)
- [ ] Tests E2E brouillon → activation offre → sync Wallet (§11.6)
- [ ] Documentation restaurateur (aide contextuelle / README)
- [x] Monitoring coûts IA (`AdminAiUsagePanel`, `ai_usage_logs`)
- [ ] Kill switch `AI_ASSISTANT_ENABLED` testé en prod

---

*Document vivant — dernière sync code : juin 2026 (commits `9dc47bd`, `90c546d`). Pour la suite : backlog V2/V3 ou « valide §25 prod ».*
