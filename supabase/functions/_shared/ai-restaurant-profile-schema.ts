export const BUSINESS_TYPE_OPTIONS = [
  { value: "restaurant", label: "Restaurant" },
  { value: "pizza", label: "Pizzeria" },
  { value: "snack", label: "Snack / fast-food" },
  { value: "boulangerie", label: "Boulangerie / pâtisserie" },
  { value: "cafe", label: "Café / bar" },
  { value: "coiffeur", label: "Coiffeur / barbier" },
  { value: "commerce", label: "Commerce local" },
  { value: "autre", label: "Autre" },
] as const;

export const MAIN_OBJECTIVE_OPTIONS = [
  { value: "frequence", label: "Faire revenir les clients plus souvent" },
  { value: "panier_moyen", label: "Augmenter le panier moyen" },
  { value: "heures_creuses", label: "Remplir les heures creuses" },
  { value: "pousser_produit", label: "Pousser un produit" },
  { value: "fideliser", label: "Récompenser les clients fidèles" },
  { value: "nouveau_produit", label: "Lancer un nouveau produit" },
] as const;

export const QUIET_DAY_OPTIONS = [
  { value: "lundi", label: "Lundi" },
  { value: "mardi", label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi", label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi", label: "Samedi" },
  { value: "dimanche", label: "Dimanche" },
] as const;

export const PREFERRED_REWARD_OPTIONS = [
  { value: "boisson", label: "Boisson offerte" },
  { value: "dessert", label: "Dessert offert" },
  { value: "reduction", label: "Réduction" },
  { value: "produit_offert", label: "Produit offert" },
  { value: "points_bonus", label: "Points bonus" },
  { value: "double_tampons", label: "Double tampons" },
] as const;

export const GENEROSITY_OPTIONS = [
  { value: "prudent", label: "Prudent" },
  { value: "balanced", label: "Équilibré" },
  { value: "aggressive", label: "Généreux" },
] as const;

export const TONE_OPTIONS = [
  { value: "chaleureux", label: "Chaleureux" },
  { value: "direct", label: "Direct" },
  { value: "jeune", label: "Jeune / dynamique" },
  { value: "premium", label: "Premium" },
  { value: "familial", label: "Familial" },
] as const;

export const MARGIN_SENSITIVITY_OPTIONS = [
  { value: "faible", label: "Faible — je peux tester des offres marquées" },
  { value: "moyenne", label: "Moyenne — équilibre entre attractif et prudent" },
  { value: "élevée", label: "Élevée — je préfère limiter les remises" },
] as const;

const BUSINESS_TYPES = new Set(BUSINESS_TYPE_OPTIONS.map((o) => o.value));
const MAIN_OBJECTIVES = new Set(MAIN_OBJECTIVE_OPTIONS.map((o) => o.value));
const QUIET_DAYS = new Set(QUIET_DAY_OPTIONS.map((o) => o.value));
const PREFERRED_REWARDS = new Set(PREFERRED_REWARD_OPTIONS.map((o) => o.value));
const GENEROSITY_LEVELS = new Set(GENEROSITY_OPTIONS.map((o) => o.value));
const TONES = new Set(TONE_OPTIONS.map((o) => o.value));
const MARGIN_LEVELS = new Set(MARGIN_SENSITIVITY_OPTIONS.map((o) => o.value));

export type RestaurantProfileInput = {
  business_type: string;
  main_objective: string;
  quiet_days: string[];
  quiet_hours: string | null;
  products_to_push: string[];
  preferred_rewards: string[];
  average_ticket: number | null;
  generosity_level: string;
  tone_of_voice: string;
  offers_to_avoid: string | null;
  margin_sensitivity: string | null;
  notes: string | null;
};

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asNullableString(value: unknown): string | null {
  const text = asString(value);
  return text || null;
}

function asStringArray(value: unknown, allowed?: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry) => entry && (!allowed || allowed.has(entry)));
}

function asAverageTicket(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function emptyRestaurantProfileInput(): RestaurantProfileInput {
  return {
    business_type: "",
    main_objective: "",
    quiet_days: [],
    quiet_hours: null,
    products_to_push: [],
    preferred_rewards: [],
    average_ticket: null,
    generosity_level: "",
    tone_of_voice: "",
    offers_to_avoid: null,
    margin_sensitivity: null,
    notes: null,
  };
}

export function normalizeRestaurantProfileInput(raw: unknown): RestaurantProfileInput {
  const source = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};

  const business_type = asString(source.business_type);
  const main_objective = asString(source.main_objective);
  const generosity_level = asString(source.generosity_level);
  const tone_of_voice = asString(source.tone_of_voice);
  const margin_sensitivity = asNullableString(source.margin_sensitivity);

  return {
    business_type: BUSINESS_TYPES.has(business_type as never) ? business_type : "",
    main_objective: MAIN_OBJECTIVES.has(main_objective as never) ? main_objective : "",
    quiet_days: asStringArray(source.quiet_days, QUIET_DAYS),
    quiet_hours: asNullableString(source.quiet_hours),
    products_to_push: asStringArray(source.products_to_push),
    preferred_rewards: asStringArray(source.preferred_rewards, PREFERRED_REWARDS),
    average_ticket: asAverageTicket(source.average_ticket),
    generosity_level: GENEROSITY_LEVELS.has(generosity_level as never) ? generosity_level : "",
    tone_of_voice: TONES.has(tone_of_voice as never) ? tone_of_voice : "",
    offers_to_avoid: asNullableString(source.offers_to_avoid),
    margin_sensitivity: margin_sensitivity && MARGIN_LEVELS.has(margin_sensitivity as never)
      ? margin_sensitivity
      : null,
    notes: asNullableString(source.notes),
  };
}

export function validateRestaurantProfileInput(data: RestaurantProfileInput): string | null {
  if (!data.business_type) return "Sélectionnez un type de commerce.";
  if (!data.main_objective) return "Sélectionnez un objectif principal.";
  if (!data.preferred_rewards.length) {
    return "Sélectionnez au moins une récompense acceptable.";
  }
  if (!data.generosity_level) return "Indiquez votre niveau de générosité.";
  if (!data.tone_of_voice) return "Choisissez un ton de communication.";
  if (data.average_ticket != null && data.average_ticket > 500) {
    return "Le ticket moyen semble trop élevé — vérifiez la valeur.";
  }
  return null;
}

export function profileInputToRow(businessId: string, data: RestaurantProfileInput) {
  return {
    business_id: businessId,
    business_type: data.business_type,
    main_objective: data.main_objective,
    quiet_days: data.quiet_days,
    quiet_hours: data.quiet_hours,
    products_to_push: data.products_to_push,
    preferred_rewards: data.preferred_rewards,
    average_ticket: data.average_ticket,
    generosity_level: data.generosity_level,
    tone_of_voice: data.tone_of_voice,
    offers_to_avoid: data.offers_to_avoid,
    margin_sensitivity: data.margin_sensitivity,
    notes: data.notes,
  };
}

export function rowToProfileInput(row: Record<string, unknown> | null): RestaurantProfileInput {
  if (!row) return emptyRestaurantProfileInput();
  return normalizeRestaurantProfileInput(row);
}
