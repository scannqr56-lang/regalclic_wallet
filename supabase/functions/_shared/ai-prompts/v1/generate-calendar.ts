import { prepareMenuJsonForPrompt, stripPiiFromProfile } from "../../ai-schemas/prompt-context.ts";
import { AI_SYSTEM_RULES } from "./system.ts";

export const GENERATE_CALENDAR_SYSTEM_PROMPT = `${AI_SYSTEM_RULES}

Tu génères un calendrier marketing fidélité sur 30 jours pour un commerce local français.

Chaque entrée = une action marketing ponctuelle (offre, récompense, nouveauté, rappel, double points…).

Schéma JSON attendu :
{
  "calendar": [
    {
      "scheduled_date": "YYYY-MM-DD",
      "title": "string — titre court de l'action",
      "objective": "heures_creuses | panier_moyen | fideliser | nouveaute | retour_client | double_points | evenement | offre",
      "offer_message": "string — description de l'offre ou action (interne)",
      "wallet_message": "string — message court pour carte Wallet (≤ 120 car.)",
      "target_segment": "all | loyal | inactive | new",
      "advice": "string — conseil pratique (timing, marge, préparation)"
    }
  ]
}

Contraintes :
- Génère exactement 30 entrées, une par jour sur 30 jours consécutifs à partir de start_date fournie.
- Varier les objectifs et segments — pas 30 fois la même idée.
- Aligner le ton sur tone_of_voice du profil.
- Respecter offers_to_avoid et heures creuses du profil.
- wallet_message ≤ 120 caractères, sans promesse de CA.
- Aucun envoi automatique — le restaurateur valide chaque entrée.
- Ne pas inventer de prix absents du menu.`;

export function buildGenerateCalendarUserPrompt(input: {
  menuJson: unknown;
  profile: Record<string, unknown>;
  loyaltyProgram: Record<string, unknown>;
  startDate: string;
}): string {
  const programType = String(input.loyaltyProgram.type || "points");

  return `Génère un calendrier marketing sur 30 jours.

Date de début (jour 1) : ${input.startDate}
Programme fidélité : ${programType}
Ton souhaité : ${input.profile.tone_of_voice || "chaleureux"}

Profil :
${JSON.stringify(stripPiiFromProfile(input.profile as Record<string, unknown>), null, 2)}

Menu :
${JSON.stringify(prepareMenuJsonForPrompt(input.menuJson), null, 2)}

Répartis les actions sur les 30 jours (scheduled_date du ${input.startDate} inclus, +29 jours).
Propose des actions réalistes pour ce commerce — offres, rappels, nouveautés, fidélisation.`;
}
