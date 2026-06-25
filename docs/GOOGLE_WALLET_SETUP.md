# Configuration Google Wallet — RegalClic Wallet V1

Les clés Google ne doivent **jamais** être commitées dans le dépôt.
Configurez-les comme **secrets Supabase Edge Functions**.

## Prérequis Google Cloud

1. [Google Pay & Wallet Console](https://pay.google.com/business/console) — créer un compte émetteur (issuer).
2. Noter l’**Issuer ID** (numérique).
3. Créer un **compte de service** dans Google Cloud Console avec accès à l’API **Google Wallet API**.
4. Télécharger la clé JSON du compte de service.
5. Dans la console Wallet, **autoriser le compte de service** comme éditeur d’objets.

## Secrets requis

Dans [Supabase Dashboard → Edge Functions → Secrets](https://supabase.com/dashboard/project/pfutrevqneggudriiyxr/settings/functions) ou via CLI :

| Secret | Description |
|--------|-------------|
| `GOOGLE_WALLET_ISSUER_ID` | Issuer ID numérique (ex. `3388000000022...`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `xxx@xxx.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Clé privée PEM (`-----BEGIN PRIVATE KEY-----`) |
| `GOOGLE_WALLET_ORIGINS` | Origines autorisées pour Save to Wallet, séparées par des virgules |
| `GOOGLE_WALLET_REVIEW_STATUS` | `UNDER_REVIEW` (défaut) ou `APPROVED` une fois validé par Google |

### Origines recommandées

```
GOOGLE_WALLET_ORIGINS=https://regalclic-wallet.vercel.app,http://localhost:5173
```

## Déploiement CLI

```bash
cd /Users/zaaouaryassin/Projects/regalclic_wallet

supabase secrets set \
  GOOGLE_WALLET_ISSUER_ID="VOTRE_ISSUER_ID" \
  GOOGLE_SERVICE_ACCOUNT_EMAIL="wallet@projet.iam.gserviceaccount.com" \
  GOOGLE_WALLET_ORIGINS="https://regalclic-wallet.vercel.app,http://localhost:5173" \
  GOOGLE_WALLET_REVIEW_STATUS="UNDER_REVIEW"

# Clé privée (échapper les retours à la ligne ou utiliser le dashboard)
supabase secrets set GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="$(cat /chemin/vers/private-key.pem)"

supabase functions deploy wallet-google --no-verify-jwt
```

## Architecture V1

| Élément Google | Correspondance RegalClic |
|----------------|--------------------------|
| Loyalty Class | Un par commerce (`business_id`) |
| Loyalty Object | Un par `customer_membership` |
| QR code | `customer_memberships.qr_token` |
| Solde | Points ou tampons selon `loyalty_programs.type` |
| Stockage | `customer_memberships.google_object_id` + `wallet_passes` |

## Edge Function

- **Nom** : `wallet-google`
- **Méthode** : `POST` (ou `GET` avec query params)
- **Paramètres** : `membership_id`, `business_slug`
- **Réponse** : `{ saveUrl, objectId, classId }`

Le frontend redirige l’utilisateur vers `saveUrl` (`https://pay.google.com/gp/v/save/...`).

## Test manuel

```bash
curl -X POST "https://pfutrevqneggudriiyxr.supabase.co/functions/v1/wallet-google" \
  -H "Authorization: Bearer VOTRE_ANON_KEY" \
  -H "apikey: VOTRE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"membership_id":"UUID","business_slug":"mon-restaurant"}'
```

## Dépannage

| Erreur | Cause probable |
|--------|----------------|
| `Secrets Google manquants` | Variables non définies dans Supabase |
| `OAuth Google invalide` | Clé privée mal formatée (vérifier `\n`) |
| `Création class Google impossible` | Compte de service non autorisé dans la console Wallet |
| `Save to Wallet` ne s’ouvre pas | `GOOGLE_WALLET_ORIGINS` ne contient pas l’URL du site |

## Phase 7 — synchronisation

Le module `_shared/google-wallet-core.ts` est utilisé par `wallet-sync-worker` pour mettre à jour le solde sur Google Wallet après chaque transaction. Voir [`docs/WALLET_SYNC_SETUP.md`](WALLET_SYNC_SETUP.md).
