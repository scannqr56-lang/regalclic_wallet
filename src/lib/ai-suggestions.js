import { supabase } from '@/lib/supabase';

const AI_GENERATE_SUGGESTIONS_FUNCTION = 'ai-generate-suggestions';
const GENERATE_TIMEOUT_MS = 150_000;
const FULL_PLAN_TIMEOUT_MS = 600_000;

export const BATCH_TYPE_LABELS = {
  full_plan: 'Plan complet',
  rewards_only: 'Récompenses',
  offers_only: 'Offres promo',
  notifications_only: 'Notifications',
  calendar_only: 'Calendrier',
};

export const BATCH_STATUS_LABELS = {
  processing: 'En cours',
  completed: 'Terminé',
  failed: 'Échoué',
};

export const SUGGESTION_TYPE_LABELS = {
  reward: 'Récompense',
  threshold: 'Seuil',
  offer: 'Offre',
  notification: 'Notification',
  calendar_tip: 'Calendrier',
};

export const SUGGESTION_STATUS_LABELS = {
  pending: 'À valider',
  accepted: 'Acceptée',
  modified: 'Modifiée',
  discarded: 'Ignorée',
  applied: 'Appliquée',
};

export const MARGIN_RISK_LABELS = {
  low: 'Marge faible',
  medium: 'Marge moyenne',
  high: 'Marge élevée',
};

export const OBJECTIVE_LABELS = {
  frequence: 'Fréquence de visite',
  panier_moyen: 'Panier moyen',
  heures_creuses: 'Heures creuses',
  fideliser: 'Fidélisation',
  pousser_produit: 'Pousser un produit',
  nouveau_produit: 'Nouveau produit',
  retour_client: 'Retour client',
  nouveaute: 'Nouveauté',
  fideles: 'Clients fidèles',
  double_points: 'Double points',
  double_tampons: 'Double tampons',
  evenement: 'Événement',
  offre: 'Offre promo',
  recompense: 'Récompense',
  rappel: 'Rappel client',
};

export const TARGET_SEGMENT_LABELS = {
  all: 'Tous les clients',
  loyal: 'Clients fidèles',
  inactive: 'Clients inactifs',
  new: 'Nouveaux clients',
};

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

async function invokeGenerateSuggestions(action, payload = {}, timeoutMs = GENERATE_TIMEOUT_MS) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${AI_GENERATE_SUGGESTIONS_FUNCTION}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Génération impossible');
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Délai dépassé — réessayez dans un instant');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function fetchGenerationQuota(businessId) {
  return invokeGenerateSuggestions('quota_status', { business_id: businessId })
    .then((data) => data.quota?.generation ?? data.quota);
}

export function fetchAssistantQuota(businessId) {
  return invokeGenerateSuggestions('quota_status', { business_id: businessId })
    .then((data) => data.quota);
}

export function generateRewardSuggestions(businessId, menuUploadId) {
  return invokeGenerateSuggestions('rewards', {
    business_id: businessId,
    menu_upload_id: menuUploadId,
  });
}

export function generateOfferSuggestions(businessId, menuUploadId) {
  return invokeGenerateSuggestions('offers', {
    business_id: businessId,
    menu_upload_id: menuUploadId,
  });
}

export function generateNotificationSuggestions(businessId, menuUploadId) {
  return invokeGenerateSuggestions('notifications', {
    business_id: businessId,
    menu_upload_id: menuUploadId,
  });
}

export function generateFullPlanSuggestions(businessId, menuUploadId) {
  return invokeGenerateSuggestions('full_plan', {
    business_id: businessId,
    menu_upload_id: menuUploadId,
  }, FULL_PLAN_TIMEOUT_MS);
}

export async function fetchSuggestionBatchSummary(businessId, batchId) {
  const [suggestionsResult, calendarResult] = await Promise.all([
    supabase
      .from('ai_suggestions')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('batch_id', batchId),
    supabase
      .from('ai_marketing_calendar_items')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .eq('batch_id', batchId),
  ]);

  if (suggestionsResult.error) throw suggestionsResult.error;
  if (calendarResult.error) throw calendarResult.error;

  return {
    suggestions_count: suggestionsResult.count ?? 0,
    calendar_count: calendarResult.count ?? 0,
  };
}

export async function fetchSuggestionBatches(businessId) {
  const { data, error } = await supabase
    .from('ai_suggestion_batches')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchSuggestions(businessId, { batchId, types } = {}) {
  let query = supabase
    .from('ai_suggestions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (batchId) query = query.eq('batch_id', batchId);
  if (types?.length) query = query.in('suggestion_type', types);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateSuggestionStatus(suggestionId, status) {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .update({ status })
    .eq('id', suggestionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
