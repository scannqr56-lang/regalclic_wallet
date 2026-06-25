# Configuration Apple Wallet — RegalClic Wallet V1

Les certificats Apple ne doivent **jamais** être commités dans le dépôt.
Configurez-les comme **secrets Supabase Edge Functions**.

## Secrets requis

Dans [Supabase Dashboard → Edge Functions → Secrets](https://supabase.com/dashboard/project/pfutrevqneggudriiyxr/settings/functions) ou via CLI :

| Secret | Description |
|--------|-------------|
| `APPLE_PASS_TYPE_IDENTIFIER` | ex. `pass.com.regalclic.loyalty` |
| `APPLE_TEAM_ID` | Team ID Apple Developer |
| `APPLE_ORGANIZATION_NAME` | `RegalClic` |
| `APPLE_SIGNER_CERT_PEM` | Certificat Pass Type ID (.pem) |
| `APPLE_SIGNER_KEY_PEM` | Clé privée du certificat (.pem) |
| `APPLE_WWDR_CERT_PEM` | Certificat WWDR Apple (G4) |

### Optionnels (Phase 7 — push APNs)

| Secret | Description |
|--------|-------------|
| `APPLE_APNS_KEY_ID` | Key ID de la clé APNs |
| `APPLE_APNS_KEY_PEM` | Contenu du fichier `.p8` |
| `APPLE_APNS_TEAM_ID` | Team ID |
| `APPLE_APNS_USE_SANDBOX` | `true` en dev |

## Déploiement CLI

```bash
cd /Users/zaaouaryassin/Projects/regalclic_wallet

# Exemple (remplacer par vos valeurs réelles)
supabase secrets set \
  APPLE_PASS_TYPE_IDENTIFIER="pass.com.votre.id" \
  APPLE_TEAM_ID="XXXXXXXXXX" \
  APPLE_ORGANIZATION_NAME="RegalClic"

# Les PEM multi-lignes : utiliser le dashboard Supabase ou un fichier
supabase secrets set APPLE_SIGNER_CERT_PEM="$(cat /chemin/vers/cert.pem)"
supabase secrets set APPLE_SIGNER_KEY_PEM="$(cat /chemin/vers/key.pem)"
supabase secrets set APPLE_WWDR_CERT_PEM="$(cat /chemin/vers/wwdr.pem)"

# Déployer les fonctions
supabase functions deploy wallet-apple-pass --no-verify-jwt
supabase functions deploy wallet-apple-webhook --no-verify-jwt
```

## Edge Functions déployées

| Function | Rôle |
|----------|------|
| `wallet-apple-pass` | Génère le `.pkpass` (GET/POST) |
| `wallet-apple-webhook` | Web service PassKit (mises à jour) |

## Test

1. Inscrire un client : `/join/votre-slug`
2. Page success → **Ajouter à Apple Wallet**
3. Sur iPhone : le pass s'ouvre dans Wallet
4. Vérifier : nom commerce, prénom, solde, QR scannable

## Dépannage

| Erreur | Cause probable |
|--------|----------------|
| `Certificats Apple manquants` | Secrets PEM non configurés dans Supabase |
| `Secrets Apple manquants (APPLE_PASS_TYPE_IDENTIFIER)` | Identifiants Apple non définis |
| Pass ne s'ouvre pas sur iPhone | Tester en HTTPS ou transférer le .pkpass par AirDrop |
| QR non scannable | Vérifier que `qr_token` est bien encodé dans le pass |

## TODO Phase 7

- Push APNs automatique après ajout points/tampons
- Fallback : régénération du pass via `wallet-apple-webhook`
