# Synchronisation Wallet post-transaction — Phase 7

Après un scan (points, tampons, récompense), un **trigger PostgreSQL** enqueue un job dans `wallet_sync_jobs`. Le worker `wallet-sync-worker` met à jour :

- **Google Wallet** : PATCH du Loyalty Object (solde, récompenses)
- **Apple Wallet** : push APNs → l’iPhone télécharge le `.pkpass` mis à jour via `wallet-apple-webhook`

## Flux automatique

```
Scanner restaurateur
  → RPC add_points / add_stamp / redeem
  → UPDATE customer_memberships (solde)
  → trigger enqueue_wallet_sync_on_balance_change
  → wallet_sync_jobs (pending)
  → wallet-sync-worker (cron toutes les 3 min)
  → Google PATCH + Apple APNs
```

## Secrets requis (Supabase Edge Functions)

| Secret | Description |
|--------|-------------|
| `WALLET_SYNC_SECRET` | Secret partagé pour appeler le worker (générer avec `openssl rand -hex 32`) |
| `GOOGLE_*` | Déjà configurés (Phase 5) |
| `APPLE_APNS_KEY_ID` | Key ID de la clé APNs `.p8` |
| `APPLE_APNS_KEY_PEM` | Contenu du fichier `.p8` |
| `APPLE_APNS_TEAM_ID` | Team ID Apple (souvent = `APPLE_TEAM_ID`) |
| `APPLE_APNS_USE_SANDBOX` | `true` en dev, `false` en prod |
| `APPLE_PASS_TYPE_IDENTIFIER` | Déjà configuré (Phase 4) |

### Configurer le secret worker

```bash
cd /Users/zaaouaryassin/Projects/regalclic_wallet

# Générer un secret
openssl rand -hex 32

supabase secrets set WALLET_SYNC_SECRET="votre_secret_ici"
```

## Migration SQL

Appliquer `20250625120005_wallet_sync_claim.sql` (RPC `claim_wallet_sync_jobs`) :

```bash
supabase db push
```

## Déployer le worker

```bash
supabase functions deploy wallet-sync-worker --no-verify-jwt
```

## Cron GitHub Actions (recommandé)

Le workflow `.github/workflows/wallet-sync-cron.yml` appelle le worker **toutes les 3 minutes**.

Secrets GitHub du repo (`Settings → Secrets`) :

| Secret | Valeur |
|--------|--------|
| `WALLET_SYNC_SECRET` | Même valeur que Supabase |
| `SUPABASE_PROJECT_REF` | `pfutrevqneggudriiyxr` |

## Test manuel

1. Scanner un client et ajouter des points
2. Vérifier qu’un job existe :

```sql
select * from wallet_sync_jobs where processed_at is null order by created_at desc;
```

3. Déclencher le worker :

```bash
curl -X POST "https://pfutrevqneggudriiyxr.supabase.co/functions/v1/wallet-sync-worker" \
  -H "x-wallet-sync-secret: VOTRE_SECRET"
```

Réponse attendue : `{ "processed": 1, "failed": 0, ... }`

4. Vérifier la carte Google Wallet / Apple Wallet du client (quelques secondes à 2 min)

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| Jobs jamais traités | Cron GitHub non configuré ou `WALLET_SYNC_SECRET` manquant |
| Google non mis à jour | Credentials Google ou `google_object_id` absent |
| Apple non mis à jour | Pas d’enregistrement dans `apple_wallet_registrations` (client n’a pas ajouté le pass) |
| APNs échec | `APPLE_APNS_USE_SANDBOX` incorrect ou clé APNs invalide |

## Apple : enregistrement appareil

Le push APNs ne fonctionne que si le client a **ajouté** la carte Apple Wallet et que l’iPhone s’est enregistré via PassKit (`apple_wallet_registrations.push_token`).

Si aucun token : message « ré-ajouter la carte » — le solde sera à jour au prochain téléchargement manuel du pass.
