import { supabase } from '@/lib/supabase';

const CAMPAIGN_BROADCAST_FUNCTION = 'wallet-campaign-broadcast';

const WALLET_NOTIFY_DISCLAIMER =
  'Le titre affiché = votre libellé d\'offre, le texte = votre message (emojis acceptés). Les notifications Wallet dépendent des règles Apple et Google — elles ne sont pas garanties sur tous les appareils (max. 3 notifs Google / jour / carte).';

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

function toLocalDatetimeValue(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetimeValue(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

export const CAMPAIGN_STATUS_LABELS = {
  draft: 'Brouillon',
  active: 'Active',
  ended: 'Terminée',
};

export { WALLET_NOTIFY_DISCLAIMER };

export function formatCampaignDates(campaign) {
  if (!campaign) return '';
  const start = new Date(campaign.starts_at).toLocaleString('fr-FR');
  const end = new Date(campaign.ends_at).toLocaleString('fr-FR');
  return `${start} → ${end}`;
}

export function buildCampaignFormFromSuggestion(suggestion, overrides = {}) {
  const defaults = buildCampaignFormDefaults();
  const message = overrides.message
    ?? suggestion.customer_message
    ?? suggestion.wallet_notification_body
    ?? '';
  const title = overrides.title ?? suggestion.title ?? '';
  const offerLabel = overrides.offer_label
    ?? suggestion.description
    ?? suggestion.wallet_notification_title
    ?? '';

  return {
    title,
    message,
    offer_label: offerLabel,
    notify_on_activate: Boolean(overrides.notify_on_activate),
    starts_at: overrides.starts_at ?? defaults.starts_at,
    ends_at: overrides.ends_at ?? defaults.ends_at,
  };
}

export async function fetchCampaignAiOrigins(businessId) {
  const [suggestionsResult, calendarResult] = await Promise.all([
    supabase
      .from('ai_suggestions')
      .select('id, applied_entity_id, suggestion_type, title, status')
      .eq('business_id', businessId)
      .eq('applied_entity_type', 'wallet_campaign')
      .not('applied_entity_id', 'is', null),
    supabase
      .from('ai_marketing_calendar_items')
      .select('id, wallet_campaign_id, title')
      .eq('business_id', businessId)
      .not('wallet_campaign_id', 'is', null),
  ]);

  if (suggestionsResult.error) throw suggestionsResult.error;
  if (calendarResult.error) throw calendarResult.error;

  const byCampaignId = {};

  for (const suggestion of suggestionsResult.data ?? []) {
    if (!suggestion.applied_entity_id) continue;
    byCampaignId[suggestion.applied_entity_id] = {
      kind: 'suggestion',
      suggestionId: suggestion.id,
      suggestionType: suggestion.suggestion_type,
      title: suggestion.title,
      status: suggestion.status,
    };
  }

  for (const item of calendarResult.data ?? []) {
    if (!item.wallet_campaign_id || byCampaignId[item.wallet_campaign_id]) continue;
    byCampaignId[item.wallet_campaign_id] = {
      kind: 'calendar',
      calendarItemId: item.id,
      title: item.title,
    };
  }

  return byCampaignId;
}

export function getCampaignAiOriginLabel(origin) {
  if (!origin) return null;
  if (origin.kind === 'calendar') return 'Calendrier IA';
  if (origin.suggestionType === 'notification') return 'Notification IA';
  if (origin.suggestionType === 'offer') return 'Offre IA';
  return 'Créée par IA';
}

export async function fetchCampaigns(businessId) {
  const { data, error } = await supabase
    .from('wallet_campaigns')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchCampaignBroadcastStats(campaignId) {
  const { data, error } = await supabase
    .from('wallet_campaign_broadcast_logs')
    .select('google_synced, apple_synced, google_error, apple_error, notification_sent')
    .eq('campaign_id', campaignId);

  if (error) throw error;
  const rows = data ?? [];
  return {
    total: rows.length,
    google_ok: rows.filter((r) => r.google_synced).length,
    apple_ok: rows.filter((r) => r.apple_synced).length,
    failed: rows.filter((r) => !r.google_synced && !r.apple_synced).length,
    notified: rows.some((r) => r.notification_sent),
  };
}

export async function fetchCampaignNotifyQuota(businessId) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${CAMPAIGN_BROADCAST_FUNCTION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'quota_status', business_id: businessId }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Quota indisponible');
  return data.quota;
}

export function buildCampaignFormDefaults(campaign = null) {
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (campaign) {
    return {
      title: campaign.title || '',
      message: campaign.message || '',
      offer_label: campaign.offer_label || '',
      notify_on_activate: Boolean(campaign.notify_on_activate),
      starts_at: toLocalDatetimeValue(campaign.starts_at),
      ends_at: toLocalDatetimeValue(campaign.ends_at),
    };
  }

  return {
    title: '',
    message: '',
    offer_label: '',
    notify_on_activate: false,
    starts_at: toLocalDatetimeValue(now.toISOString()),
    ends_at: toLocalDatetimeValue(weekLater.toISOString()),
  };
}

export function validateCampaignForm(form) {
  const title = form.title.trim();
  const message = form.message.trim();
  const startsAt = fromLocalDatetimeValue(form.starts_at);
  const endsAt = fromLocalDatetimeValue(form.ends_at);

  if (!title) return 'Le titre est requis';
  if (!message) return 'Le message est requis';
  if (!startsAt || !endsAt) return 'Les dates de début et de fin sont requises';
  if (new Date(endsAt) <= new Date(startsAt)) {
    return 'La date de fin doit être après la date de début';
  }
  return null;
}

export async function createCampaign(businessId, form) {
  const validationError = validateCampaignForm(form);
  if (validationError) throw new Error(validationError);

  const { data, error } = await supabase
    .from('wallet_campaigns')
    .insert({
      business_id: businessId,
      title: form.title.trim(),
      message: form.message.trim(),
      offer_label: form.offer_label.trim() || null,
      notify_on_activate: Boolean(form.notify_on_activate),
      starts_at: fromLocalDatetimeValue(form.starts_at),
      ends_at: fromLocalDatetimeValue(form.ends_at),
      status: 'draft',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createCampaignFromSuggestion(businessId, suggestion, formOverrides = {}) {
  const form = buildCampaignFormFromSuggestion(suggestion, formOverrides);
  return createCampaign(businessId, form);
}

export async function updateCampaign(campaignId, form, { status } = {}) {
  const validationError = validateCampaignForm(form);
  if (validationError) throw new Error(validationError);

  const payload = {
    title: form.title.trim(),
    message: form.message.trim(),
    offer_label: form.offer_label.trim() || '',
    notify_on_activate: Boolean(form.notify_on_activate),
    starts_at: fromLocalDatetimeValue(form.starts_at),
    ends_at: fromLocalDatetimeValue(form.ends_at),
  };

  if (status === 'active') {
    const data = await invokeCampaignAction('update', {
      campaign_id: campaignId,
      ...payload,
    });
    return data.campaign;
  }

  const { data, error } = await supabase
    .from('wallet_campaigns')
    .update({
      title: payload.title,
      message: payload.message,
      offer_label: payload.offer_label || null,
      notify_on_activate: payload.notify_on_activate,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
    })
    .eq('id', campaignId)
    .eq('status', 'draft')
    .select()
    .single();

  if (error) throw error;
  if (!data) throw new Error('Seules les campagnes brouillon peuvent être modifiées');
  return data;
}

export async function deleteCampaign(campaignId, { status } = {}) {
  if (status === 'draft') {
    const { error } = await supabase
      .from('wallet_campaigns')
      .delete()
      .eq('id', campaignId)
      .eq('status', 'draft');

    if (error) throw error;
    return;
  }

  return invokeCampaignAction('delete', { campaign_id: campaignId });
}

async function invokeCampaignAction(action, payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${CAMPAIGN_BROADCAST_FUNCTION}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Action campagne impossible');
  }
  return data;
}

export function activateCampaign(campaignId) {
  return invokeCampaignAction('activate', { campaign_id: campaignId });
}

export function endCampaign(campaignId) {
  return invokeCampaignAction('end', { campaign_id: campaignId });
}

export function notifyAllCampaign(campaignId) {
  return invokeCampaignAction('notify_all', { campaign_id: campaignId });
}

export function notifyTestCampaign(campaignId, membershipId) {
  return invokeCampaignAction('notify_test', {
    campaign_id: campaignId,
    membership_id: membershipId,
  });
}
