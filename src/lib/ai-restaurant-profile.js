import { supabase } from '@/lib/supabase';

const AI_RESTAURANT_PROFILE_FUNCTION = 'ai-restaurant-profile';

export const BUSINESS_TYPE_OPTIONS = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'pizza', label: 'Pizzeria' },
  { value: 'snack', label: 'Snack / fast-food' },
  { value: 'boulangerie', label: 'Boulangerie / pâtisserie' },
  { value: 'cafe', label: 'Café / bar' },
  { value: 'coiffeur', label: 'Coiffeur / barbier' },
  { value: 'commerce', label: 'Commerce local' },
  { value: 'autre', label: 'Autre' },
];

export const MAIN_OBJECTIVE_OPTIONS = [
  { value: 'frequence', label: 'Faire revenir les clients plus souvent' },
  { value: 'panier_moyen', label: 'Augmenter le panier moyen' },
  { value: 'heures_creuses', label: 'Remplir les heures creuses' },
  { value: 'pousser_produit', label: 'Pousser un produit' },
  { value: 'fideliser', label: 'Récompenser les clients fidèles' },
  { value: 'nouveau_produit', label: 'Lancer un nouveau produit' },
];

export const QUIET_DAY_OPTIONS = [
  { value: 'lundi', label: 'Lundi' },
  { value: 'mardi', label: 'Mardi' },
  { value: 'mercredi', label: 'Mercredi' },
  { value: 'jeudi', label: 'Jeudi' },
  { value: 'vendredi', label: 'Vendredi' },
  { value: 'samedi', label: 'Samedi' },
  { value: 'dimanche', label: 'Dimanche' },
];

export const PREFERRED_REWARD_OPTIONS = [
  { value: 'boisson', label: 'Boisson offerte' },
  { value: 'dessert', label: 'Dessert offert' },
  { value: 'reduction', label: 'Réduction' },
  { value: 'produit_offert', label: 'Produit offert' },
  { value: 'points_bonus', label: 'Points bonus' },
  { value: 'double_tampons', label: 'Double tampons' },
];

export const GENEROSITY_OPTIONS = [
  { value: 'prudent', label: 'Prudent' },
  { value: 'balanced', label: 'Équilibré' },
  { value: 'aggressive', label: 'Généreux' },
];

export const TONE_OPTIONS = [
  { value: 'chaleureux', label: 'Chaleureux' },
  { value: 'direct', label: 'Direct' },
  { value: 'jeune', label: 'Jeune / dynamique' },
  { value: 'premium', label: 'Premium' },
  { value: 'familial', label: 'Familial' },
];

export const MARGIN_SENSITIVITY_OPTIONS = [
  { value: 'faible', label: 'Faible — je peux tester des offres marquées' },
  { value: 'moyenne', label: 'Moyenne — équilibre entre attractif et prudent' },
  { value: 'élevée', label: 'Élevée — je préfère limiter les remises' },
];

const ALLOWED = {
  business_type: new Set(BUSINESS_TYPE_OPTIONS.map((o) => o.value)),
  main_objective: new Set(MAIN_OBJECTIVE_OPTIONS.map((o) => o.value)),
  quiet_days: new Set(QUIET_DAY_OPTIONS.map((o) => o.value)),
  preferred_rewards: new Set(PREFERRED_REWARD_OPTIONS.map((o) => o.value)),
  generosity_level: new Set(GENEROSITY_OPTIONS.map((o) => o.value)),
  tone_of_voice: new Set(TONE_OPTIONS.map((o) => o.value)),
  margin_sensitivity: new Set(MARGIN_SENSITIVITY_OPTIONS.map((o) => o.value)),
};

function asString(value, fallback = '') {
  if (typeof value === 'string') return value.trim();
  if (value == null) return fallback;
  return String(value).trim();
}

function asNullableString(value) {
  const text = asString(value);
  return text || null;
}

function asStringArray(value, allowed) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => asString(entry))
    .filter((entry) => entry && (!allowed || allowed.has(entry)));
}

function asAverageTicket(value) {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function emptyRestaurantProfileForm() {
  return {
    business_type: '',
    main_objective: '',
    quiet_days: [],
    quiet_hours: '',
    products_to_push_text: '',
    preferred_rewards: [],
    average_ticket: '',
    generosity_level: '',
    tone_of_voice: '',
    offers_to_avoid: '',
    margin_sensitivity: '',
    notes: '',
  };
}

export function buildProfileFormDefaults({ profile, loyaltyProgram } = {}) {
  const base = emptyRestaurantProfileForm();

  if (profile) {
    return {
      ...base,
      business_type: profile.business_type || '',
      main_objective: profile.main_objective || '',
      quiet_days: profile.quiet_days || [],
      quiet_hours: profile.quiet_hours || '',
      products_to_push_text: (profile.products_to_push || []).join('\n'),
      preferred_rewards: profile.preferred_rewards || [],
      average_ticket: profile.average_ticket != null ? String(profile.average_ticket) : '',
      generosity_level: profile.generosity_level || '',
      tone_of_voice: profile.tone_of_voice || '',
      offers_to_avoid: profile.offers_to_avoid || '',
      margin_sensitivity: profile.margin_sensitivity || '',
      notes: profile.notes || '',
    };
  }

  if (loyaltyProgram) {
    const preferred = [];
    const label = (loyaltyProgram.reward_label || '').toLowerCase();
    if (label.includes('boisson')) preferred.push('boisson');
    if (label.includes('dessert')) preferred.push('dessert');
    if (label.includes('réduction') || label.includes('reduction') || label.includes('%')) {
      preferred.push('reduction');
    }
    if (loyaltyProgram.type === 'stamps') preferred.push('double_tampons');

    return {
      ...base,
      preferred_rewards: preferred,
      generosity_level: 'balanced',
      tone_of_voice: 'chaleureux',
      margin_sensitivity: 'moyenne',
    };
  }

  return base;
}

export function formToProfilePayload(form) {
  const products_to_push = form.products_to_push_text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    business_type: form.business_type,
    main_objective: form.main_objective,
    quiet_days: form.quiet_days,
    quiet_hours: asNullableString(form.quiet_hours),
    products_to_push,
    preferred_rewards: form.preferred_rewards,
    average_ticket: asAverageTicket(form.average_ticket),
    generosity_level: form.generosity_level,
    tone_of_voice: form.tone_of_voice,
    offers_to_avoid: asNullableString(form.offers_to_avoid),
    margin_sensitivity: asNullableString(form.margin_sensitivity),
    notes: asNullableString(form.notes),
  };
}

export function normalizeRestaurantProfilePayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};

  return {
    business_type: ALLOWED.business_type.has(source.business_type) ? source.business_type : '',
    main_objective: ALLOWED.main_objective.has(source.main_objective) ? source.main_objective : '',
    quiet_days: asStringArray(source.quiet_days, ALLOWED.quiet_days),
    quiet_hours: asNullableString(source.quiet_hours),
    products_to_push: asStringArray(source.products_to_push),
    preferred_rewards: asStringArray(source.preferred_rewards, ALLOWED.preferred_rewards),
    average_ticket: asAverageTicket(source.average_ticket),
    generosity_level: ALLOWED.generosity_level.has(source.generosity_level)
      ? source.generosity_level
      : '',
    tone_of_voice: ALLOWED.tone_of_voice.has(source.tone_of_voice) ? source.tone_of_voice : '',
    offers_to_avoid: asNullableString(source.offers_to_avoid),
    margin_sensitivity: source.margin_sensitivity && ALLOWED.margin_sensitivity.has(source.margin_sensitivity)
      ? source.margin_sensitivity
      : null,
    notes: asNullableString(source.notes),
  };
}

export function validateRestaurantProfilePayload(data) {
  if (!data.business_type) return 'Sélectionnez un type de commerce.';
  if (!data.main_objective) return 'Sélectionnez un objectif principal.';
  if (!data.preferred_rewards.length) return 'Sélectionnez au moins une récompense acceptable.';
  if (!data.generosity_level) return 'Indiquez votre niveau de générosité.';
  if (!data.tone_of_voice) return 'Choisissez un ton de communication.';
  if (data.average_ticket != null && data.average_ticket > 500) {
    return 'Le ticket moyen semble trop élevé — vérifiez la valeur.';
  }
  return null;
}

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

export async function fetchRestaurantProfile(businessId) {
  const { data, error } = await supabase
    .from('ai_restaurant_profiles')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function saveRestaurantProfile(businessId, form) {
  const payload = normalizeRestaurantProfilePayload(formToProfilePayload(form));
  const validationError = validateRestaurantProfilePayload(payload);
  if (validationError) throw new Error(validationError);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${AI_RESTAURANT_PROFILE_FUNCTION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      business_id: businessId,
      profile: payload,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Enregistrement impossible');
  }

  return data.profile;
}

export function getLoyaltyProgramSummary(loyaltyProgram) {
  if (!loyaltyProgram) return null;

  if (loyaltyProgram.type === 'stamps') {
    return `Programme tampons — ${loyaltyProgram.stamps_required} tampons pour « ${loyaltyProgram.reward_label} »`;
  }

  const threshold = loyaltyProgram.reward_threshold ?? 100;
  return `Programme points — seuil actuel : ${threshold} pts pour « ${loyaltyProgram.reward_label} »`;
}

export function toggleArrayValue(list, value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
