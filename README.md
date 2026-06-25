# RegalClic Wallet V1

Solution de fidélité digitale **Wallet-first** pour restaurants et commerces locaux.

Projet **indépendant** de `meytiz-fidelite-97cd73c4` (legacy).

## Stack

- Vite + React + Tailwind CSS
- Supabase (Auth, Postgres, Storage, Edge Functions)

## État d'avancement

| Phase | Statut |
|-------|--------|
| 0 — Audit | ✅ |
| 1 — Base Supabase | ✅ |
| 2 — Dashboard commerce | ✅ |
| 3 — Inscription publique | ✅ |
| 4 — Apple Wallet | ✅ |
| 5 — Google Wallet | À faire |

## Démarrage local

```bash
cp .env.example .env
# Renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Supabase > Settings > API)

npm install
npm run dev
```

Ouvrir http://localhost:5173

### Parcours test Phase 2

1. Créer un compte sur `/auth`
2. **Commerce** → créer votre restaurant (nom, slug, couleur…)
3. **Programme** → choisir points ou tampons + récompense
4. **QR inscription** → copier le lien ou télécharger le PNG

### Parcours test Phase 3

1. Ouvrir `/join/votre-slug` (ou scanner le QR du dashboard)
2. Remplir le formulaire (prénom + consentement minimum)
3. Arriver sur `/join/votre-slug/success?membership=...`
4. Voir les boutons Apple / Google Wallet (actifs en Phase 4–5)

## Structure

```
regalclic_wallet/
├── src/
│   ├── pages/dashboard/   # Dashboard restaurateur
│   ├── components/        # UI + layout
│   └── lib/               # Supabase, auth, utils
├── supabase/migrations/   # Schéma V1
└── package.json
```

## Supabase

Projet lié : `pfutrevqneggudriiyxr`  
Voir [`supabase/README.md`](supabase/README.md) pour les migrations.
