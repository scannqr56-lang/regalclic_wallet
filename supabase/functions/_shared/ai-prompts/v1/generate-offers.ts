import { prepareMenuJsonForPrompt, stripPiiFromProfile } from "../../ai-schemas/prompt-context.ts";
import { AI_SYSTEM_RULES } from "./system.ts";

export const GENERATE_OFFERS_SYSTEM_PROMPT = `${AI_SYSTEM_RULES}

Tu génères des offres promotionnelles Wallet pour un commerce local français.

Types d'offres à couvrir (varier les 5 suggestions) :
- heures_creuses
- panier_moyen
- retour_client
- nouveaute
- fideles
- double_points (ou double_tampons si programme tampons)
- evenement

Schéma JSON attendu :
{
  "offers": [
    {
      "title": "string — titre interne court (ex. Happy hour mardi)",
      "offer_label": "string — libellé court sur la carte Wallet (ex. -10% ce soir)",
      "objective": "heures_creuses | panier_moyen | retour_client | nouveaute | fideles | double_points | evenement",
      "customer_message": "string — message affiché sur la carte Wallet (clair, concret)",
      "recommended_duration_days": number,
      "recommended_timing": "string — ex. mardi 17h, week-end midi",
      "target_segment": "all | loyal | inactive | new",
      "margin_risk": "low | medium | high",
      "generosity_level": "prudent | balanced | aggressive",
      "explanation": "string — conseil d'utilisation, sans promettre de CA"
    }
  ]
}

Contraintes :
- Génère exactement 5 offres variées et réalistes.
- Adapte au menu, au profil restaurateur et aux heures creuses indiquées.
- Respecte offers_to_avoid du profil.
- Aligner le ton sur tone_of_voice du profil.
- Ne jamais promettre de chiffre d'affaires ou de rentabilité garantie.
- Les messages doivent être compatibles avec une mise à jour de carte Wallet (promo visible sur la carte).
- recommended_duration_days entre 1 et 14 pour une offre ponctuelle.`;

export function buildGenerateOffersUserPrompt(input: {
  menuJson: unknown;
  profile: Record<string, unknown>;
  loyaltyProgram: Record<string, unknown>;
}): string {
  const programType = String(input.loyaltyProgram.type || "points");

  return `Génère 5 offres promotionnelles Wallet pour ce commerce.

Programme fidélité :
- type : ${programType}
- libellé récompense : ${input.loyaltyProgram.reward_label || "Récompense"}

Profil restaurateur :
${JSON.stringify(stripPiiFromProfile(input.profile as Record<string, unknown>), null, 2)}

Menu extrait :
${JSON.stringify(prepareMenuJsonForPrompt(input.menuJson), null, 2)}

Propose des offres concrètes, prêtes à être transformées en brouillon campagne Wallet (titre, message, libellé court).`;
}
