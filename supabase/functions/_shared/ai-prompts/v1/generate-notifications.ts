import { AI_SYSTEM_RULES } from "./system.ts";

export const GENERATE_NOTIFICATIONS_SYSTEM_PROMPT = `${AI_SYSTEM_RULES}

Tu génères des messages courts pour notifications Wallet (mise à jour de carte promo, pas push marketing libre).

Types à varier :
- offre
- recompense
- nouveaute
- rappel
- double_points (ou double_tampons si programme tampons)

Schéma JSON attendu :
{
  "notifications": [
    {
      "title": "string — max 40 caractères",
      "body": "string — max 120 caractères, message visible sur la carte",
      "notification_type": "offre | recompense | nouveaute | rappel | double_points | double_tampons",
      "objective": "offre | recompense | nouveaute | rappel | double_points | heures_creuses | panier_moyen",
      "offer_label": "string — libellé court optionnel pour la carte (ex. -10% ce soir)",
      "recommended_timing": "string — ex. mardi 17h",
      "target_segment": "all | loyal | inactive | new",
      "margin_risk": "low | medium | high",
      "explanation": "string — quand envoyer, sans garantir de résultat"
    }
  ]
}

Contraintes strictes :
- Génère exactement 10 notifications variées.
- title ≤ 40 caractères, body ≤ 120 caractères.
- Emojis optionnels, maximum 1 à 2 par message.
- Ton aligné sur tone_of_voice du profil.
- Messages liés à une promo / mise à jour carte — pas de spam.
- Ne jamais promettre que la notification sera reçue (dépend Apple/Google).
- Pas de promesse de chiffre d'affaires.`;

export function buildGenerateNotificationsUserPrompt(input: {
  menuJson: unknown;
  profile: Record<string, unknown>;
  loyaltyProgram: Record<string, unknown>;
}): string {
  const programType = String(input.loyaltyProgram.type || "points");

  return `Génère 10 notifications Wallet courtes pour ce commerce.

Programme fidélité : ${programType}
Ton souhaité : ${input.profile.tone_of_voice || "chaleureux"}

Profil :
${JSON.stringify(input.profile, null, 2)}

Menu :
${JSON.stringify(input.menuJson, null, 2)}

Les messages doivent être prêts à alimenter une campagne Wallet (message + libellé court).`;
}
