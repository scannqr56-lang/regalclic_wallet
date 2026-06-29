import { appendCustomerInsightsToPrompt, prepareMenuJsonForPrompt, stripPiiFromProfile } from "../../ai-schemas/prompt-context.ts";
import type { AiCustomerInsights } from "../../ai-customer-insights.ts";
import { AI_SYSTEM_RULES } from "./system.ts";

export const GENERATE_REWARDS_SYSTEM_PROMPT = `${AI_SYSTEM_RULES}

Tu génères des suggestions de récompenses fidélité pour un commerce local.

Schéma JSON attendu :
{
  "rewards": [
    {
      "title": "string — ex. 100 points = boisson offerte",
      "description": "string — description courte pour le restaurateur",
      "objective": "frequence | panier_moyen | heures_creuses | fideliser | pousser_produit | nouveau_produit",
      "type": "points | stamps",
      "recommended_threshold": number,
      "margin_risk": "low | medium | high",
      "explanation": "string — pourquoi cette suggestion, avec prudence sur la marge"
    }
  ],
  "threshold_options": [
    {
      "threshold": number,
      "type": "points | stamps",
      "rationale": "string"
    }
  ]
}

Contraintes :
- Génère exactement 5 récompenses variées et réalistes.
- Génère exactement 3 options de seuil (threshold_options).
- Si le programme est en points, type = "points" et seuils en points.
- Si le programme est en tampons, type = "stamps" et seuils en nombre de tampons.
- Privilégie les récompenses alignées avec preferred_rewards du profil.
- Respecte generosity_level : prudent = seuils plus élevés, aggressive = plus généreux.
- N'utilise pas de formulations du type "marge garantie" ou "rentabilité assurée".`;

export function buildGenerateRewardsUserPrompt(input: {
  menuJson: unknown;
  profile: Record<string, unknown>;
  loyaltyProgram: Record<string, unknown>;
  customerInsights?: AiCustomerInsights | null;
}): string {
  const programType = String(input.loyaltyProgram.type || "points");
  const currentThreshold = programType === "stamps"
    ? Number(input.loyaltyProgram.stamps_required || 10)
    : Number(input.loyaltyProgram.reward_threshold || 100);

  return appendCustomerInsightsToPrompt(`Génère des suggestions de récompenses fidélité pour ce commerce.

Programme fidélité actuel :
- type : ${programType}
- libellé récompense actuel : ${input.loyaltyProgram.reward_label || "Récompense"}
- seuil actuel : ${currentThreshold}
- points par euro : ${input.loyaltyProgram.points_per_euro ?? 1}

Profil restaurateur :
${JSON.stringify(stripPiiFromProfile(input.profile as Record<string, unknown>), null, 2)}

Menu extrait (produits et prix) :
${JSON.stringify(prepareMenuJsonForPrompt(input.menuJson), null, 2)}

Propose 5 récompenses concrètes et 3 options de seuil adaptées au contexte français.`, input.customerInsights);
}
