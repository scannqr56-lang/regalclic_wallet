# Spécification carte Wallet — RegalClic (Phase 1)

> Document de référence pour l’implémentation Apple Wallet (Phase 3) et Google Wallet (Phase 4).  
> **Modèle code :** `supabase/functions/_shared/wallet-card-model.ts`

---

## 1. Objectif

Définir **un seul modèle métier** (`WalletCardViewModel`) consommé par les générateurs Apple et Google, afin d’afficher une carte fidélité professionnelle, cohérente et personnalisable par restaurant.

---

## 2. Décisions produit actées (Phase 1)

| Sujet | Décision | Justification |
|-------|----------|---------------|
| Style Apple | **`storeCard`** par défaut | Rendu fidélité retail ; strip optionnel. Override : `APPLE_PASS_STYLE=generic` |
| `organizationName` Apple | **`RegalClic`** | Émetteur technique du pass ; le restaurant = `headerFields` / `programName` |
| QR code | **`qr_token` opaque** uniquement | Jamais email, téléphone ou PII |
| Nom client | **Prénom + nom** si dispo, sinon prénom, sinon « Client » | Lisible sans sur-exposer |
| Notifications | **Via mise à jour de carte** | `changeMessage` Apple + `TEXT_AND_NOTIFY` Google — pas de push FCM libre |

---

## 3. Maquette textuelle — Apple Wallet (`storeCard`)

```
┌─────────────────────────────────────┐
│ [logo]   RESTAURANT NOM             │  headerFields.business
│                                     │
│         42 POINTS                   │  primaryFields.balance (+ changeMessage)
│                                     │
│ Client: Jean Dupont                 │  secondaryFields.customer
│ Prochaine récomp.: Encore 58 points │  auxiliaryFields.next_reward
│ Récompense: Café offert             │  auxiliaryFields.reward
│ Disponible: 1 café à utiliser       │  auxiliaryFields.available (si > 0)
│ ─────────────────────────────────── │
│         [ QR CODE ]                 │  barcode.message = qr_token
│         RC-A1B2C3D4E5               │  alternateText = card_number
│ [strip image optionnelle]           │  strip.png si hero configurée
└─────────────────────────────────────┘

Dos (backFields) :
• N° de carte : RC-XXXXXXXX
• Programme : 1 € = 1 point — Café offert
• Prochaine récompense : Encore 58 points
• Récompense disponible : 1 café à utiliser (si applicable)
• Dernière transaction : 25/06/2026 15:04
• Dernière mise à jour : 25/06/2026 15:04
• Adresse : 12 rue …, 75001 Paris
• Téléphone : 06 …
• Site web / Commander / Instagram (URLs https)
• Conditions : …
• Offre en cours : -10% aujourd’hui (si promo)
• Carte propulsée par RegalClic
• Info : Scannez cette carte à chaque passage…
```

**Couleurs :**
- `backgroundColor` ← `businesses.primary_color` (défaut `#0B1E3F`)
- `foregroundColor` ← `rgb(255,255,255)`
- `labelColor` ← `wallet_label_color` ou teal RegalClic `#44C4A1`

---

## 4. Maquette textuelle — Google Wallet (`loyaltyObject`)

```
┌─────────────────────────────────────┐
│ [heroImage — bannière optionnelle]  │  loyaltyClass.heroImage
│ [programLogo]                       │
│ Nom Restaurant (programName)        │
│ Jean Dupont                         │  accountName
│ Points: 42                          │  loyaltyPoints
│ ─────────────────────────────────── │
│ Modules texte :                     │  textModulesData
│   Programme / Règle / Prochaine récomp.│
│   Récompense dispo / Promo / MAJ    │
│ ─────────────────────────────────── │
│         [ QR CODE ]                 │  barcode.value = qr_token
│         RC-A1B2C3D4E5               │  alternateText = card_number
└─────────────────────────────────────┘

Liens (linksModuleData) :
• Site web • Commander • Instagram
```

---

## 5. Champs dynamiques — `WalletCardViewModel`

| Champ ViewModel | Source DB | Face | Dos / modules |
|-----------------|-----------|------|---------------|
| `businessName` | `businesses.name` | ✓ header | ✓ programName |
| `customerDisplayName` | `customers.first_name` + `last_name` | ✓ | ✓ accountName |
| `balance` + `balanceLabel` | `points_balance` ou `stamps_balance` | ✓ | ✓ loyaltyPoints |
| `rewardLabel` | `loyalty_programs.reward_label` | ✓ | ✓ |
| `rewardsAvailableText` | `rewards_available` | ✓ si > 0 | ✓ |
| `nextRewardText` | calculé | ✓ | ✓ |
| `earnRuleText` | dérivé programme | — | ✓ |
| `cardNumber` | `card_number` | QR alt | ✓ |
| `qrToken` | `qr_token` | QR | — |
| `promoMessage` | `wallet_promo_message` (*) | tagline | ✓ |
| `walletTerms` | `wallet_terms` (*) | — | ✓ |
| `formattedAddress` | adresse + ville + CP | — | ✓ |
| `phone`, liens | `phone`, `website`, `order_url`, `instagram_url` | — | ✓ links |
| `lastUpdatedDisplay` | `updated_at` | — | ✓ |
| `lastTransactionDisplay` | `loyalty_transactions` max | — | ✓ |
| `logoUrl` | `logo_url` | asset | programLogo |
| `heroUrl` | `wallet_hero_url` (*) | strip / hero | heroImage |
| `primaryColorHex` | `primary_color` | couleur fond | hexBackgroundColor |

(*) Champs prévus Phase 2 — le ViewModel les accepte déjà avec fallback `null`.

---

## 6. Règles de calcul

### 6.1 Prochaine récompense — points

```
threshold = reward_threshold ?? 100
unitsToNext = threshold - (balance % threshold)
Si balance % threshold == 0 et balance > 0 → unitsToNext = 0 (seuil atteint)
```

Exemple : balance 42, threshold 100 → « Encore 58 points »

### 6.2 Prochaine récompense — tampons

```
required = max(stamps_required, 1)
unitsToNext = required - stamps_balance (si stamps_balance < required)
```

Exemple : 7/10 tampons → « Encore 3 tampons »

### 6.3 Règle de gain (texte)

| Type | Format |
|------|--------|
| Points | `1 € = X point(s)` selon `points_per_euro` |
| Tampons | `N tampons = 1 {reward_label}` |

### 6.4 Récompenses disponibles

| `rewards_available` | Texte |
|---------------------|-------|
| 0 | (masqué) |
| 1 | `1 {reward_label} à utiliser` |
| n > 1 | `n récompenses à utiliser` |

---

## 7. Règles de fallback

| Situation | Comportement |
|-----------|--------------|
| Pas de logo commerce | Logo RegalClic (`REGALCLIC_WALLET_LOGO_URL` ou URL app) |
| Pas de nom client | « Client » |
| Pas de nom commerce | « Commerce » |
| Pas de `last_name` | Prénom seul |
| Couleur invalide | `#0B1E3F` RegalClic |
| Pas d’adresse | Champ masqué |
| Pas de promo | Tagline « Votre fidélité récompensée » |
| Pas de hero | Pas de strip Apple / pas de hero Google |
| URL non https | Ignorée (sauf `tel:` pour téléphone) |

---

## 8. Mapping ViewModel → Apple (`mapViewModelToAppleFields`)

| Zone Apple | Clé | Source ViewModel |
|------------|-----|------------------|
| headerFields | `business` | `businessName` |
| primaryFields | `balance` | `balance` + `balanceChangeMessage` |
| secondaryFields | `customer` | `customerDisplayName` |
| auxiliaryFields | `next_reward` | `nextRewardText` |
| auxiliaryFields | `reward` | `rewardLabel` |
| auxiliaryFields | `available` | `rewardsAvailableText` (si présent) |
| backFields | `card_number`, `program`, liens, etc. | voir `wallet-card-model.ts` |
| barcode.message | — | `qrToken` |
| barcode.alt | — | `cardNumber` |

**Notifications transactionnelles Apple :** modifier `primaryFields.balance` avec `changeMessage` ; optionnel `auxiliaryFields.available` si récompense débloquée.

---

## 9. Mapping ViewModel → Google (`mapViewModelToGoogleFields`)

| Champ Google | Source ViewModel |
|--------------|------------------|
| `accountName` | `customerDisplayName` |
| `loyaltyPoints.label` | `balanceLabel` |
| `loyaltyPoints.balance.int` | `balance` |
| `barcode.value` | `qrToken` |
| `barcode.alternateText` | `cardNumber` |
| `textModulesData` | programme, règle, prochaine récomp., promo, MAJ, conditions |
| `linksModuleData` | `links` (https uniquement) |
| `messages` (sync) | `notifyMessage.header` + `body` |

**Notifications Google :** `messageType: TEXT_AND_NOTIFY` sur sync — limiter la fréquence (1 notif par transaction significative).

---

## 10. Dimensions images (référence Phase 2)

| Asset | Plateforme | Dimensions |
|-------|------------|------------|
| `icon.png` | Apple | 29×29 |
| `icon@2x.png` | Apple | 58×58 |
| `logo.png` | Apple | max 160×50 |
| `logo@2x.png` | Apple | max 320×100 |
| `strip.png` | Apple storeCard | 375×123 |
| `strip@2x.png` | Apple | 750×246 |
| `programLogo` | Google | min 660×660 (carré) |
| `heroImage` | Google | 1032×336 |

Formats : PNG, JPEG, WebP — max 2 Mo.

---

## 11. Champs interdits sur la carte

- Email client
- Téléphone client dans le QR
- Token prévisible (le `qr_token` reste opaque 48 hex)
- Données bancaires

---

## 12. Utilisation développeur

```typescript
import {
  buildWalletCardViewModel,
  mapViewModelToAppleFields,
  mapViewModelToGoogleFields,
} from "../_shared/wallet-card-model.ts";

const vm = buildWalletCardViewModel({
  membership: { id, card_number, qr_token, points_balance, stamps_balance, rewards_available, updated_at },
  customer: { first_name, last_name },
  business: { id, name, logo_url, primary_color, address, city, postal_code, phone, website },
  program: { type, points_per_euro, stamps_required, reward_label, reward_threshold },
  lastTransactionAt: "2026-06-25T13:04:00Z",
});

const appleFields = mapViewModelToAppleFields(vm);
const googleFields = mapViewModelToGoogleFields(vm);
```

---

## 13. Prochaine étape

**Phase 2** — migration `businesses` (promo, terms, hero, liens) puis **Phase 3/4** — brancher `apple-pass-builder.ts` et `google-wallet-core.ts` sur ce ViewModel.
