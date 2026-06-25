# RegalClic Wallet — Migrations Supabase V1

Ce dossier contient le schéma de base de données pour la V1 Wallet-first, **indépendant** du projet legacy `meytiz-fidelite-97cd73c4`.

## Ordre des migrations

| Fichier | Contenu |
|---------|---------|
| `20250625120000_v1_core_schema.sql` | Tables, index, triggers `updated_at`, sync Wallet |
| `20250625120001_v1_rls_policies.sql` | RLS + policies |
| `20250625120002_v1_rpc_functions.sql` | RPC métier atomiques |
| `20250625120003_v1_storage.sql` | Bucket `business-assets` (logos) |
| `20250625120004_fix_pgcrypto.sql` | Fix `gen_random_bytes` (schéma `extensions` Supabase) |

## Appliquer les migrations

### Option A — Supabase Dashboard (recommandé pour démarrer)

1. Créer un **nouveau projet** Supabase dédié à RegalClic Wallet V1.
2. Ouvrir **SQL Editor**.
3. Exécuter chaque fichier **dans l'ordre** (copier-coller le contenu complet).

### Option B — Supabase CLI

```bash
cd /Users/zaaouaryassin/Projects/regalclic_wallet
supabase link --project-ref VOTRE_PROJECT_REF
supabase db push
```

## Tables créées

- `businesses` — commerce
- `business_staff` — accès staff
- `loyalty_programs` — programme points ou tampons
- `customers` — clients (multi-commerce)
- `customer_memberships` — carte fidélité + `qr_token`
- `loyalty_transactions` — historique immuable
- `rewards` — récompense(s)
- `wallet_passes` — trace technique Wallet
- `apple_wallet_registrations` — PassKit
- `wallet_sync_jobs` — file sync post-transaction

## RPC disponibles

| RPC | Qui peut l'appeler | Rôle |
|-----|-------------------|------|
| `get_my_business()` | authenticated | Commerce du restaurateur |
| `get_business_public_by_slug(slug)` | anon + authenticated | Page `/join/[slug]` |
| `create_public_membership(...)` | **service_role only** | Inscription client |
| `lookup_membership_by_qr_token(token)` | authenticated staff | Scanner |
| `add_points_to_membership(...)` | authenticated staff | Ajout points |
| `add_stamp_to_membership(...)` | authenticated staff | Ajout tampon |
| `redeem_reward(...)` | authenticated staff | Utiliser récompense |
| `get_business_stats(business_id)` | authenticated staff | KPIs dashboard |

## Tests manuels SQL (après migration)

```sql
-- 1. Créer un user test via Auth UI, puis :
-- 2. Insérer un commerce (en tant que ce user via l'app ou SQL avec son uid)
insert into businesses (owner_id, name, slug)
values ('UUID_DU_USER', 'Pizza Test', 'pizza-test');

insert into loyalty_programs (business_id, name, type, reward_threshold, reward_label)
values (
  (select id from businesses where slug = 'pizza-test'),
  'Fidélité Pizza',
  'points',
  100,
  'Boisson offerte'
);

insert into rewards (loyalty_program_id, business_id, name, threshold_value, type)
values (
  (select id from loyalty_programs where business_id = (select id from businesses where slug = 'pizza-test')),
  (select id from businesses where slug = 'pizza-test'),
  'Boisson offerte',
  100,
  'points'
);

-- 3. Inscription publique (service role dans SQL editor = ok)
select create_public_membership(
  'pizza-test', 'Jean', 'Dupont', '0612345678', null, true
);
```

## Sécurité

- Un restaurateur ne voit que les memberships de **son** commerce (`is_business_member`).
- Les clients ne s'inscrivent **pas** via insert direct : RPC `create_public_membership` avec service role.
- `wallet_passes`, `wallet_sync_jobs`, `apple_wallet_registrations` : RLS sans policy client → Edge Functions uniquement.

## Prochaine phase

Phase 2 : bootstrap Vite + React dans `regalclic_wallet` et pages dashboard.
