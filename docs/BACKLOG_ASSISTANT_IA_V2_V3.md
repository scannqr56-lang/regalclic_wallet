# Backlog Assistant IA — V2 / V3

Document de référence pour la **phase 17** et les évolutions post-MVP.  
Complète [`ROADMAP_ASSISTANT_IA_FIDELITE.md`](./ROADMAP_ASSISTANT_IA_FIDELITE.md) (phase 17).

**Légende statut** : `preview` = fondation livrée · `planned` = priorisé · `research` = à cadrer

---

## Livré en preview (phase 17)

| ID | Fonctionnalité | Implémentation |
|----|----------------|----------------|
| V2-SEG | Segmentation clients (fidèles / inactifs / nouveaux) | RPC `get_ai_customer_insights` |
| V2-TX | Contexte scans réels dans prompts IA | `ai-customer-insights.ts` + prompts v1 |
| V2-REM | Rappel « offres prêtes » (dashboard) | `AiReadySuggestionsBanner` sur le hub |

---

## V2 — Priorité haute

### V2-01 — Billing Stripe Pro IA
- **Objectif** : self-service abonnement Pro IA / Business
- **Dépendances** : compte Stripe, webhooks Edge Function
- **Critères** : `businesses.plan` mis à jour via webhook ; downgrade gracieux
- **Effort** : L

### V2-02 — Calendrier mensuel auto-proposé
- **Objectif** : chaque début de mois, proposition calendrier 30 j sans clic manuel
- **Dépendances** : cron / job planifié, quota dédié
- **Critères** : notification dashboard + batch `calendar_only` auto
- **Effort** : M

### V2-03 — Rappels email restaurateur
- **Objectif** : email « 2 offres prêtes cette semaine » si suggestions `pending`
- **Dépendances** : provider email (Resend / SendGrid), template
- **Critères** : max 1 email / semaine / commerce ; opt-out
- **Effort** : M

### V2-04 — Génération visuels promo
- **Objectif** : image carte / story à partir d'une offre IA
- **Dépendances** : DALL·E ou template Canvas ; storage `business-private`
- **Critères** : export PNG ; disclaimer « aperçu non contractuel »
- **Effort** : L

### V2-05 — Segmentation avancée
- **Objectif** : filtres « top 20 % fidèles », « inactifs > 60 j », panier moyen
- **Dépendances** : V2-SEG en prod avec données suffisantes
- **Critères** : UI filtres hub ; `target_segment` aligné sur règles métier
- **Effort** : M

---

## V2 — Priorité moyenne

### V2-06 — Campagnes ciblées par segment
- **Objectif** : brouillon campagne pré-filtré (ex. offre inactive uniquement)
- **Note V1** : `target_segment` est informatif ; pas d'envoi auto par segment
- **Effort** : M

### V2-07 — Historique performance suggestions
- **Objectif** : taux d'application (`applied` / `pending`) par batch
- **Effort** : S

---

## V3 — Recherche & innovation

### V3-01 — Scoring performance offres
- Corréler campagnes IA activées ↔ `wallet_sync_logs` / scans période
- **Effort** : L

### V3-02 — A/B testing messages
- 2 variantes notification ; métrique ouverte / sync
- **Effort** : L

### V3-03 — Intégration caisse
- Import ticket moyen / mix produit (API partenaire)
- **Effort** : XL

### V3-04 — Analyse rentabilité
- Saisie food cost ; alerte marge sur suggestions `high` risk
- **Effort** : L

### V3-05 — Assistant conversationnel
- Chat multi-tours ; hors scope V1/V2 MVP
- **Effort** : XL

### V3-06 — Benchmark sectoriel
- Comparatif anonymisé par `business_type` (restaurant, coiffeur…)
- **Effort** : XL

---

## Architecture technique (cibles)

| Composant | V2 | V3 |
|-----------|----|----|
| `get_ai_customer_insights` | ✅ preview | enrichir KPI |
| `ai_suggestion_performance` | table scores batch | A/B variants |
| Stripe webhooks | `billing-stripe` EF | — |
| Cron calendrier | GitHub Actions / pg_cron | — |
| Email digest | `ai-weekly-digest` EF | — |

---

## Ordre d'implémentation recommandé

1. **Stripe Pro IA** (monétisation)
2. **Rappels email** + **calendrier auto** (rétention)
3. **Segmentation avancée** + campagnes ciblées
4. **Visuels promo**
5. V3 scoring → A/B → caisse

---

## Hors périmètre

- Envoi automatique campagnes sans validation restaurateur
- Segmentation avec PII envoyée à OpenAI
- Garanties de CA dans les prompts

---

*Mis à jour : phase 17 — juin 2026*
