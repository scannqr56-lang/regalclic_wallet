# Plan de test V1 — RegalClic Wallet

Checklist bout en bout avant démo client ou premier restaurant pilote.

**Environnement prod** : [https://regalclic-wallet.vercel.app](https://regalclic-wallet.vercel.app)

---

## Prérequis

- [ ] Compte restaurateur créé sur `/auth`
- [ ] Commerce configuré (nom, slug, logo optionnel)
- [ ] Programme fidélité actif (points ou tampons)
- [ ] Secrets Apple Wallet configurés sur Supabase (Phase 4)
- [ ] Secrets Google Wallet configurés sur Supabase (Phase 5)
- [ ] `WALLET_SYNC_SECRET` + cron GitHub OU sync manuelle OK (Phase 7)

---

## 1. Dashboard restaurateur

| # | Test | Attendu |
|---|------|---------|
| 1.1 | Connexion `/auth` | Redirection dashboard |
| 1.2 | Créer / modifier commerce | Sauvegarde OK, slug unique |
| 1.3 | Upload logo | Image visible sur page join |
| 1.4 | Créer programme points | Seuil + libellé récompense enregistrés |
| 1.5 | Page QR | Lien `https://regalclic-wallet.vercel.app/join/SLUG` (pas localhost en prod) |
| 1.6 | Télécharger PNG QR | Fichier téléchargé |
| 1.7 | KPIs accueil | Compteurs clients / points cohérents |

---

## 2. Inscription client

| # | Test | Attendu |
|---|------|---------|
| 2.1 | Ouvrir `/join/SLUG` sur mobile | Page branding commerce |
| 2.2 | Inscription (prénom + consentement) | Redirection success + `?membership=UUID` |
| 2.3 | Double inscription même client | Message carte existante ou fusion |
| 2.4 | Slug invalide | Erreur commerce introuvable |

---

## 3. Apple Wallet

| # | Test | Attendu |
|---|------|---------|
| 3.1 | Bouton « Ajouter à Apple Wallet » (iPhone) | Téléchargement / ouverture `.pkpass` |
| 3.2 | Ajouter à Wallet iOS | Carte visible avec QR + solde |
| 3.3 | Vérifier `apple_wallet_registrations` en base | Au moins 1 ligne avec `push_token` après ajout |
| 3.4 | Scan restaurateur + points | Toast « Carte Wallet mise à jour » |
| 3.5 | Solde sur iPhone | Mis à jour sous ~10 s (APNs + refresh) |

**Si pas de mise à jour Apple** : supprimer la carte, ré-ajouter depuis la page succès (enregistrement PassKit requis).

---

## 4. Google Wallet

| # | Test | Attendu |
|---|------|---------|
| 4.1 | Bouton « Ajouter à Google Wallet » (Android) | Redirection `pay.google.com/gp/v/save/...` |
| 4.2 | Carte dans Google Wallet | QR + solde visibles |
| 4.3 | Scan + points | Notification « Solde mis à jour » (~2 s) |
| 4.4 | Solde sur téléphone | Cohérent avec dashboard |

---

## 5. Scanner restaurateur

| # | Test | Attendu |
|---|------|---------|
| 5.1 | Scanner QR carte Wallet (caméra) | Fiche client affichée |
| 5.2 | Saisie manuelle token QR | Même résultat |
| 5.3 | Ajout points (montant €) | Calcul `points_per_euro` correct |
| 5.4 | Programme tampons : +1 tampon | Compteur incrémenté |
| 5.5 | Seuil récompense atteint | `rewards_available` +1 |
| 5.6 | Utiliser récompense | Décrément `rewards_available` |
| 5.7 | Carte autre commerce | Erreur accès refusé |
| 5.8 | Lien fiche client → scanner | Fiche préchargée (`?membership=`) |

---

## 6. Clients & historique

| # | Test | Attendu |
|---|------|---------|
| 6.1 | `/dashboard/customers` | Liste clients inscrits |
| 6.2 | Recherche par nom / téléphone | Filtrage OK |
| 6.3 | Fiche client | Solde + 50 derniers mouvements |
| 6.4 | Badges Wallet | Google / Apple si configurés |

---

## 7. Sync Wallet (technique)

| # | Test | Attendu |
|---|------|---------|
| 7.1 | Après scan, toast sync | « Google Wallet synchronisé » ou message explicite |
| 7.2 | Job en base `wallet_sync_jobs` | `processed_at` renseigné après sync |
| 7.3 | Worker manuel (optionnel) | `curl -X POST .../wallet-sync-worker -H "x-wallet-sync-secret: ..."` → `processed: 1` |

---

## 8. Sécurité rapide

| # | Test | Attendu |
|---|------|---------|
| 8.1 | `/dashboard` sans auth | Redirection `/auth` |
| 8.2 | RPC `add_points` sans session | Erreur non authentifié |
| 8.3 | Restaurateur A scanne carte commerce B | Refusé |

---

## Scénario démo 5 minutes (restaurant pilote)

1. Montrer le dashboard + QR affiché en caisse
2. Client s'inscrit sur son téléphone
3. Ajoute la carte Google ou Apple Wallet
4. Restaurateur scanne et crédite un achat
5. Client voit le solde mis à jour sur sa carte
6. Restaurateur ouvre la fiche client → historique

---

## Dépannage express

| Symptôme | Piste |
|----------|-------|
| QR pointe vers localhost | Redéployer Vercel ; en prod l'URL du site est utilisée automatiquement |
| Google Wallet erreur | Vérifier secrets + issuer + compte de service autorisé |
| Apple pas de mise à jour | Ré-ajouter la carte ; vérifier APNs + `apple_wallet_registrations` |
| Sync « sous peu » | Voir toast détail ; vérifier logs Edge Function |
| Liste clients vide | Vérifier inscriptions sur le bon `slug` |
