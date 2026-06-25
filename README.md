# RegalClic Wallet V1

Carte de fidélité digitale **Apple Wallet & Google Wallet** pour restaurants et commerces locaux — sans application client à télécharger.

**Production** : [https://regalclic-wallet.vercel.app](https://regalclic-wallet.vercel.app)  
**Supabase** : `pfutrevqneggudriiyxr`  
**Repo** : [github.com/scannqr56-lang/regalclic_wallet](https://github.com/scannqr56-lang/regalclic_wallet)

Projet **indépendant** du legacy `meytiz-fidelite-97cd73c4`.

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend | Vite 6, React 18, React Router, Tailwind, shadcn/ui |
| Backend | Supabase (Postgres, Auth, RLS, Storage) |
| Edge Functions | Deno — inscription, Wallet Apple/Google, sync |
| Déploiement | Vercel (SPA) + Supabase Edge Functions |

---

## État V1 — toutes les phases livrées

| Phase | Contenu | Statut |
|-------|---------|--------|
| 0 | Audit & pivot Wallet-first | ✅ |
| 1 | Schéma Supabase, RLS, RPC métier | ✅ |
| 2 | Dashboard restaurateur (commerce, programme, QR) | ✅ |
| 3 | Inscription publique `/join/:slug` | ✅ |
| 4 | Apple Wallet (`.pkpass` + PassKit webhook) | ✅ |
| 5 | Google Wallet (Save to Wallet JWT) | ✅ |
| 6 | Scanner QR restaurateur | ✅ |
| 7 | Sync Wallet post-transaction (instantanée + cron) | ✅ |
| 8 | Liste clients + fiche détail | ✅ |
| 9 | README, plan de test, polish | ✅ |

---

## Démarrage local

```bash
git clone https://github.com/scannqr56-lang/regalclic_wallet.git
cd regalclic_wallet

cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173)

### Variables frontend (`.env`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `VITE_SUPABASE_URL` | Oui | URL du projet Supabase |
| `VITE_SUPABASE_ANON_KEY` | Oui | Clé anon (Settings → API) |
| `VITE_PUBLIC_APP_URL` | Dev seulement | URL locale pour les liens QR (`http://localhost:5173`) |

---

## Parcours restaurateur

1. **Créer un compte** → `/auth`
2. **Commerce** → nom, slug, logo, couleur
3. **Programme** → points ou tampons + récompense
4. **QR inscription** → afficher en boutique (lien ou PNG)
5. **Scanner** → créditer points/tampons via QR Wallet client
6. **Clients** → liste, historique, lien vers scanner

---

## Parcours client final

1. Scanner le QR en boutique → `/join/:slug`
2. Formulaire (prénom + consentement)
3. Page succès → **Ajouter à Apple Wallet** ou **Google Wallet**
4. Présenter la carte en caisse (QR sur le téléphone)

---

## Routes

| Route | Accès | Description |
|-------|-------|-------------|
| `/auth` | Public | Connexion / inscription restaurateur |
| `/dashboard` | Auth | Accueil + KPIs |
| `/dashboard/business` | Auth | Paramètres commerce |
| `/dashboard/program` | Auth | Programme fidélité |
| `/dashboard/qr` | Auth | QR d'inscription |
| `/dashboard/scan` | Auth | Scanner client |
| `/dashboard/customers` | Auth | Liste clients |
| `/dashboard/customers/:id` | Auth | Fiche client |
| `/join/:slug` | Public | Inscription client |
| `/join/:slug/success` | Public | Carte + boutons Wallet |

---

## Edge Functions Supabase

| Function | Rôle |
|----------|------|
| `public-join` | Inscription client publique |
| `wallet-apple-pass` | Génération `.pkpass` |
| `wallet-apple-webhook` | PassKit web service (push Apple) |
| `wallet-google` | Save to Google Wallet |
| `wallet-sync-membership` | Sync instantanée après scan |
| `wallet-sync-worker` | File de secours (cron 3 min) |

### Documentation Wallet

- [Apple Wallet](docs/APPLE_WALLET_SETUP.md)
- [Google Wallet](docs/GOOGLE_WALLET_SETUP.md)
- [Sync Wallet](docs/WALLET_SYNC_SETUP.md)
- [Plan de test V1](docs/V1_TEST_PLAN.md)

### Secrets Supabase requis (prod)

Voir `.env.example` — Apple, Google, `WALLET_SYNC_SECRET`, APNs.

**GitHub Actions** (sync cron) : secrets `WALLET_SYNC_SECRET` + `SUPABASE_PROJECT_REF`.

---

## Structure du projet

```
regalclic_wallet/
├── src/
│   ├── pages/dashboard/    # Dashboard restaurateur
│   ├── pages/join/         # Inscription publique client
│   ├── components/         # UI, scanner, wallet
│   └── lib/                # Supabase, scan, customers, wallet
├── supabase/
│   ├── migrations/         # Schéma V1
│   └── functions/          # Edge Functions Deno
├── docs/                   # Guides setup & tests
└── vercel.json             # Rewrites SPA
```

---

## Déploiement

### Vercel

1. Connecter le repo GitHub
2. Variables : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Build : `npm run build` — Output : `dist`

### Supabase

```bash
supabase link --project-ref pfutrevqneggudriiyxr
supabase db push                    # migrations (si nouveau projet)
supabase functions deploy --no-verify-jwt  # voir config.toml par fonction
```

---

## Scripts npm

```bash
npm run dev        # Dev local
npm run build      # Build production
npm run preview    # Prévisualiser le build
npm run typecheck  # Vérification JS/TS
```

---

## Licence

Propriétaire — RegalClic / Zawar Software.
