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

---

## 11. Assistant IA Fidélité (Pro IA)

Checklist manuelle avant lancement Pro IA. Routes : `/dashboard/ai-assistant/*` · Admin : `/admin/merchants` (panneau observabilité).

### Prérequis Assistant IA

- [ ] Edge Functions déployées : `ai-menu-upload`, `ai-extract-menu`, `ai-generate-suggestions`, `admin-merchants`
- [ ] Secret `OPENAI_API_KEY` configuré sur Supabase
- [ ] Bucket `business-private` actif (menus privés)
- [ ] Commerce avec programme fidélité actif (points ou tampons)
- [ ] Compte test **Starter** (1 essai) + compte test **Pro IA** (5 gen. / 2 uploads / mois)
- [ ] Compte admin RegalClic pour quotas / coûts (`platform_admins`)

### 11.1 Upload menu

| # | Test | Attendu |
|---|------|---------|
| 11.1.1 | Ouvrir `/dashboard/ai-assistant/upload` | Bandeau quota uploads + activité IA du mois |
| 11.1.2 | Upload PDF menu texte lisible | Statut `uploaded` ; ligne `ai_usage_logs` action `upload_menu` |
| 11.1.3 | Upload photo JPEG/PNG menu | Même comportement ; fichier dans `business-private` |
| 11.1.4 | Fichier `.docx` ou `.txt` | Erreur format non supporté (400) |
| 11.1.5 | Fichier > 10 Mo | Erreur taille max |
| 11.1.6 | Fichier vide | Erreur fichier vide |
| 11.1.7 | Quota uploads Starter épuisé | Bandeau ambre + upload bloqué |
| 11.1.8 | `AI_ASSISTANT_ENABLED=false` | Bandeau « Assistant indisponible » |

### 11.2 Extraction menu

| # | Test | Attendu |
|---|------|---------|
| 11.2.1 | Lancer extraction sur PDF | Statut `extracting` puis `extracted` |
| 11.2.2 | Page `/dashboard/ai-assistant/menu/:uploadId` | Éditeur catégories / produits / formules |
| 11.2.3 | Menu sans prix détectés | Produits sans prix ou `price_estimated` ; édition manuelle OK |
| 11.2.4 | Menu long (> 80 produits) | Extraction tronquée côté prompt ; édition complète possible |
| 11.2.5 | Photo floue / illisible | Extraction partielle ou `failed` + message utilisateur clair |
| 11.2.6 | Sauvegarde manuelle JSON valide | Statut `extracted` sans nouvel appel OpenAI |
| 11.2.7 | Sauvegarde menu vide (sans catégorie) | Validation front : message d'erreur |
| 11.2.8 | Échec extraction | Statut `failed` ; message « réessayez ou contactez le support » ; dashboard reste utilisable |
| 11.2.9 | Vérifier `ai_usage_logs` | 1 ligne `extract_menu` par appel OpenAI (retry = lignes multiples) |

### 11.3 Questionnaire profil

| # | Test | Attendu |
|---|------|---------|
| 11.3.1 | `/dashboard/ai-assistant/profile` | 8 questions affichées |
| 11.3.2 | Sauvegarder profil incomplet | Validation champs requis |
| 11.3.3 | Sauvegarder profil complet | Ligne `ai_restaurant_profiles` ; pas d'email/tél. dans prompts (PII filtrée) |

### 11.4 Génération IA

| # | Test | Attendu |
|---|------|---------|
| 11.4.1 | Générer récompenses `/ai-assistant/rewards` | Batch `completed` ; ≥ 5 suggestions `reward` + seuils `threshold` |
| 11.4.2 | Générer offres `/ai-assistant/offers` | Suggestions type `offer` en `pending` |
| 11.4.3 | Générer notifications `/ai-assistant/notifications` | Suggestions type `notification` ; titres ≤ 40 car., corps ≤ 120 |
| 11.4.4 | Générer calendrier `/ai-assistant/calendar` | ~30 entrées `ai_marketing_calendar_items` |
| 11.4.5 | Sans menu extrait | Bouton génération désactivé + message prérequis |
| 11.4.6 | Sans profil ou programme | Bouton désactivé |
| 11.4.7 | Quota génération atteint (Pro IA) | Erreur quota ; bandeau ambre |
| 11.4.8 | Essai Starter consommé | Message upgrade Pro IA |
| 11.4.9 | Échec génération (JSON invalide simulé) | Batch `failed` ; toast message utilisateur ; pas de crash page |
| 11.4.10 | Bandeau quota | « Générations : X / Y » cohérent avec `ai_suggestion_batches` du mois |

### 11.5 Validation suggestions

| # | Test | Attendu |
|---|------|---------|
| 11.5.1 | `/dashboard/ai-assistant/suggestions` | Liste + filtres type / statut / marge |
| 11.5.2 | **Utiliser** une offre | Brouillon `wallet_campaigns` créé ; suggestion `applied` |
| 11.5.3 | **Utiliser** une notification | Campagne brouillon avec message Wallet |
| 11.5.4 | **Utiliser** récompense / seuil | Programme fidélité prérempli ou mis à jour (selon type) |
| 11.5.5 | **Ignorer** une suggestion | Statut `discarded` |
| 11.5.6 | **Modifier** puis appliquer | Statut `modified` ; contenu édité conservé |
| 11.5.7 | Copier texte suggestion | Presse-papiers OK |
| 11.5.8 | Calendrier → créer campagne | Entrée calendrier liée à `wallet_campaign_id` |

### 11.6 Intégration Wallet (non-régression)

| # | Test | Attendu |
|---|------|---------|
| 11.6.1 | Brouillon offre IA visible `/dashboard/offers` | Campagne en brouillon, dates cohérentes |
| 11.6.2 | Activer campagne IA (sans notifier) | Promo sur carte client ; sync OK |
| 11.6.3 | Activer campagne IA (avec notifier) | Promo + notif lock-screen (cf. section 8) |
| 11.6.4 | Scan + points après activation IA | Wallet V1 inchangé (silent sync) |
| 11.6.5 | Récompense IA appliquée au programme | Seuil / libellé visible dashboard programme |

### 11.7 Sécurité & quotas

| # | Test | Attendu |
|---|------|---------|
| 11.7.1 | `/dashboard/ai-assistant/*` sans auth | Redirection `/auth` |
| 11.7.2 | Restaurateur A lit menu commerce B (UUID) | RLS : accès refusé |
| 11.7.3 | Appel Edge Function sans token | 401 |
| 11.7.4 | `ai_usage_logs` insert côté client | Refusé (service role uniquement) |
| 11.7.5 | Membre lit ses propres `ai_usage_logs` | SELECT OK via RLS |
| 11.7.6 | Admin modifie plan `pro_ia` / reset essai | Quotas mis à jour immédiatement |

### 11.8 Observabilité & coûts (admin)

| # | Test | Attendu |
|---|------|---------|
| 11.8.1 | `/admin/merchants` panneau IA | Coût USD estimé + appels du mois |
| 11.8.2 | Après extraction + génération | Lignes dans tableau « Par commerce » |
| 11.8.3 | Seuil `AI_MONTHLY_COST_ALERT_USD` dépassé | Bandeau alerte rouge admin |
| 11.8.4 | Restaurateur page upload | « X appels IA ce mois » (sans coût USD) |

### 11.9 Tests automatisés (CI locale)

```bash
npm install
npm run test          # Vitest — logique front (menu, quotas, suggestions)
npm run test:ai-schemas   # Deno — parsing JSON, sanitisation, erreurs IA
npm run test:all      # Les deux
```

| Suite | Fichiers couverts |
|-------|-------------------|
| Vitest | `ai-menu-extraction`, `ai-quota`, `ai-usage`, `ai-apply-suggestion` |
| Deno | `json-parse`, `sanitize-text`, `generation-errors` |

### Scénario démo Assistant IA (10 min)

1. Upload menu PDF → extraction → correction manuelle si besoin
2. Compléter questionnaire profil (8 questions)
3. Générer récompenses + offres
4. Valider une offre → brouillon campagne
5. Activer la campagne → montrer promo sur carte Wallet test
6. (Admin) Montrer coûts IA agrégés du mois

### Dépannage Assistant IA

| Symptôme | Piste |
|----------|-------|
| « Service IA non configuré » | Vérifier `OPENAI_API_KEY` secret Supabase |
| Génération bloquée quota | Admin → plan Pro IA ou reset `ai_trial_used` |
| Extraction lente / timeout | Réessayer ; saisie manuelle fallback |
| Page blanche menu | Vérifier console ; imports React Router |
| Coûts admin à 0 | Vérifier déploiement Edge Functions phase 14 |
| JSON invalide persistant | Logs `ai_suggestion_batches.error_message` ; retry auto = 2 appels max |
