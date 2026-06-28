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
| 3.4 | Scan restaurateur + points | Toast restaurateur « Carte Wallet mise à jour » ; **pas** de notification lock-screen côté client |
| 3.5 | Solde sur iPhone | Mis à jour sous ~10 s (APNs silent + refresh pass) |
| 3.6 | Seuil récompense atteint | Solde + badge récompense MAJ ; pas de notif lock-screen (sauf `WALLET_NOTIFY_REWARD_UNLOCKED=true`) |

**Si pas de mise à jour Apple** : supprimer la carte, ré-ajouter depuis la page succès (enregistrement PassKit requis).

---

## 4. Google Wallet

| # | Test | Attendu |
|---|------|---------|
| 4.1 | Bouton « Ajouter à Google Wallet » (Android) | Redirection `pay.google.com/gp/v/save/...` |
| 4.2 | Carte dans Google Wallet | QR + solde visibles |
| 4.3 | Scan + points | Solde MAJ sur la carte (~2 s) ; **pas** de notification push « Solde mis à jour » |
| 4.4 | Solde sur téléphone | Cohérent avec dashboard |
| 4.5 | Grille carte (petit écran) | Champs en grille 2×2 lisible (alignée aperçu admin / iOS) |

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
| 7.1 | Après scan, toast sync | « Google Wallet synchronisé » ou message explicite (côté restaurateur uniquement) |
| 7.2 | Job en base `wallet_sync_jobs` | `processed_at` renseigné après sync |
| 7.3 | Worker manuel (optionnel) | `curl -X POST .../wallet-sync-worker -H "x-wallet-sync-secret: ..."` → `processed: 1` |
| 7.4 | Log `wallet_sync_logs` après +points | `notification_sent = false`, `details.notification.mode = "silent"`, `reason = "points_added"` |
| 7.5 | Log après +tampon | `reason = "stamps_added"`, `mode = "silent"` |
| 7.6 | `wallet_passes.pending_notification` après scan fidélité | `null` (pas de changeMessage Apple en attente) |

---

## 8. Notifications Wallet (silent vs notify)

Politique V1 : la carte se met toujours à jour ; seules certaines actions déclenchent une **notification visible** (lock-screen / bannière).

| Événement | Mode | Notif client attendue |
|-----------|------|------------------------|
| + points (`points_added`) | silent | Non |
| + tampon (`stamps_added`) | silent | Non |
| Utilisation récompense (`reward_redeemed`) | silent | Non |
| Ajustement manuel solde | silent | Non |
| Seuil récompense (`reward_unlocked`) | silent* | Non (* notify si `WALLET_NOTIFY_REWARD_UNLOCKED=true` sur Supabase) |
| Campagne promo avec « Notifier à l'activation » | notify | Oui (Apple changeMessage + Google `TEXT_AND_NOTIFY`) |
| Diffusion promo « Notifier tous » / test notif | notify | Oui |
| Sync technique / retry | silent | Non |

| # | Test | Attendu |
|---|------|---------|
| 8.1 | Scan +10 points (iPhone) | Carte MAJ, **aucune** alerte « Points gagnés » sur l'écran verrouillé |
| 8.2 | Scan +10 points (Android) | Carte MAJ, **aucune** notif Google « Solde mis à jour » |
| 8.3 | +1 tampon | Idem silent ; compteur tampons MAJ sur la carte |
| 8.4 | Utiliser une récompense | Solde récompenses MAJ ; pas de notif |
| 8.5 | Activer campagne + case « Notifier » cochée | Message promo visible sur carte **et** notif lock-screen (si quota non atteint) |
| 8.6 | Activer campagne **sans** notifier | Promo sur la carte uniquement ; pas de push |
| 8.7 | Quota promo (`WALLET_CAMPAIGN_MAX_PER_DAY`) | Bouton « Notifier tous » désactivé ou message quota |
| 8.8 | Fiche client → historique sync | Libellé sync sans mention « notification envoyée » après scan fidélité |

---

## 9. Campagnes promo (dashboard)

| # | Test | Attendu |
|---|------|---------|
| 9.1 | Créer offre (titre, message, dates) | Campagne en brouillon ou active selon dates |
| 9.2 | Aperçu carte admin | Bandeau promo visible sur preview Google / Apple |
| 9.3 | « Tester notification » (1 client) | Notif reçue sur le téléphone test ; log `notification_sent = true` |
| 9.4 | Fin de campagne | Promo retirée de la carte au prochain sync |

---

## 10. Sécurité rapide

| # | Test | Attendu |
|---|------|---------|
| 10.1 | `/dashboard` sans auth | Redirection `/auth` |
| 10.2 | RPC `add_points` sans session | Erreur non authentifié |
| 10.3 | Restaurateur A scanne carte commerce B | Refusé |

---

## Scénario démo 5 minutes (restaurant pilote)

1. Montrer le dashboard + QR affiché en caisse
2. Client s'inscrit sur son téléphone
3. Ajoute la carte Google ou Apple Wallet
4. Restaurateur scanne et crédite un achat
5. Client voit le solde mis à jour sur sa carte (**sans** notification push — comportement voulu)
6. Restaurateur ouvre la fiche client → historique
7. (Optionnel) Activer une offre promo avec notification pour montrer la différence

---

## Dépannage express

| Symptôme | Piste |
|----------|-------|
| QR pointe vers localhost | Redéployer Vercel ; en prod l'URL du site est utilisée automatiquement |
| Google Wallet erreur | Vérifier secrets + issuer + compte de service autorisé |
| Apple pas de mise à jour | Ré-ajouter la carte ; vérifier APNs + `apple_wallet_registrations` |
| Sync « sous peu » | Voir toast détail ; vérifier logs Edge Function |
| Liste clients vide | Vérifier inscriptions sur le bon `slug` |
| Client reçoit notif à chaque scan | Comportement corrigé en V1 : fidélité = silent ; vérifier déploiement Edge Functions |
| Promo sans notif visible | Cocher « Notifier à l'activation » ou utiliser « Notifier tous » ; vérifier quota journalier |
| Récompense débloquée sans notif | Normal par défaut ; activer `WALLET_NOTIFY_REWARD_UNLOCKED=true` si souhaité |
