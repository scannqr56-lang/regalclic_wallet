import { supabase } from '@/lib/supabase';

const AI_GENERATE_SUGGESTIONS_FUNCTION = 'ai-generate-suggestions';

export const PLAN_LABELS = {
  starter: 'Starter',
  pro_ia: 'Pro IA',
  business: 'Business',
};

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

async function invokeQuotaAction(action, businessId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${AI_GENERATE_SUGGESTIONS_FUNCTION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, business_id: businessId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Impossible de charger les quotas');
  }
  return data;
}

/** Résumé complet : plan, génération, uploads, kill switch */
export async function fetchAssistantQuota(businessId) {
  const data = await invokeQuotaAction('quota_status', businessId);
  return data.quota;
}

/** Compatibilité pages existantes */
export async function fetchGenerationQuota(businessId) {
  const summary = await fetchAssistantQuota(businessId);
  return summary?.generation ?? summary;
}

export function getQuotaBlockMessage(quota, kind = 'generation') {
  if (!quota?.assistant_enabled) {
    return 'Les idées automatiques sont temporairement indisponibles. Réessayez plus tard.';
  }

  const section = kind === 'upload' ? quota.upload : quota.generation;
  if (section?.reason) {
    return section.reason
      .replace(/quota/gi, 'limite')
      .replace(/génération/gi, 'préparation d’idées');
  }

  if (kind === 'upload' && quota.upload && !quota.upload.allowed) {
    return 'Vous avez envoyé tous vos menus prévus ce mois-ci.';
  }
  if (kind === 'generation' && quota.generation && !quota.generation.allowed) {
    return 'Vous avez utilisé toutes vos idées automatiques ce mois-ci. Vous pouvez toujours créer vos offres manuellement.';
  }

  return null;
}

export function formatGenerationQuotaLine(quota) {
  const generation = quota?.generation ?? quota;
  if (!generation) return null;

  const remaining = Math.max(0, generation.monthly_limit - generation.monthly_used);
  return `Utilisations restantes ce mois-ci : ${remaining} préparation${remaining > 1 ? 's' : ''} d’idées`;
}

export function formatUploadQuotaLine(quota) {
  const upload = quota?.upload;
  if (!upload) return null;

  const remaining = Math.max(0, upload.monthly_limit - upload.monthly_used);
  return `Menus restants ce mois-ci : ${remaining}`;
}
