import { supabase } from '@/lib/supabase';
import {
  buildCampaignFormDefaults,
  buildCampaignFormFromSuggestion,
  createCampaign,
  createCampaignFromSuggestion,
  validateCampaignForm,
} from '@/lib/campaigns';

const MARGIN_RISK_ORDER = { high: 0, medium: 1, low: 2 };

export { buildCampaignFormFromSuggestion };

export function buildSuggestionEditForm(suggestion) {
  if (suggestion.suggestion_type === 'offer' || suggestion.suggestion_type === 'notification') {
    const campaignForm = buildCampaignFormFromSuggestion(suggestion);
    return {
      title: campaignForm.title,
      message: campaignForm.message,
      offer_label: campaignForm.offer_label,
      notify_on_activate: campaignForm.notify_on_activate,
      starts_at: campaignForm.starts_at,
      ends_at: campaignForm.ends_at,
    };
  }

  if (suggestion.suggestion_type === 'reward') {
    return {
      title: suggestion.title || '',
      description: suggestion.description || '',
      recommended_threshold: suggestion.recommended_threshold ?? '',
    };
  }

  if (suggestion.suggestion_type === 'threshold') {
    return {
      recommended_threshold: suggestion.recommended_threshold ?? '',
      description: suggestion.description || '',
    };
  }

  return {
    title: suggestion.title || '',
    description: suggestion.description || '',
  };
}

export function buildCalendarCampaignForm(item, overrides = {}) {
  const defaults = buildCampaignFormDefaults();
  return {
    title: overrides.title ?? item.title ?? '',
    message: overrides.message ?? item.wallet_message ?? '',
    offer_label: overrides.offer_label ?? item.offer_message?.slice(0, 40) ?? item.title ?? '',
    notify_on_activate: false,
    starts_at: overrides.starts_at ?? defaults.starts_at,
    ends_at: overrides.ends_at ?? defaults.ends_at,
  };
}

export function sortSuggestionsByMarginRisk(suggestions, direction = 'high_first') {
  const sorted = [...suggestions].sort((a, b) => {
    const aOrder = MARGIN_RISK_ORDER[a.margin_risk] ?? 1;
    const bOrder = MARGIN_RISK_ORDER[b.margin_risk] ?? 1;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (direction === 'low_first') return sorted.reverse();
  return sorted;
}

export function filterSuggestions(suggestions, { type, status, marginRisk } = {}) {
  return suggestions.filter((item) => {
    if (type && type !== 'all' && item.suggestion_type !== type) return false;
    if (status && status !== 'all' && item.status !== status) return false;
    if (marginRisk && marginRisk !== 'all' && item.margin_risk !== marginRisk) return false;
    return true;
  });
}

export function formatSuggestionForCopy(suggestion) {
  const lines = [
    `[${suggestion.suggestion_type}] ${suggestion.title}`,
  ];
  if (suggestion.description) lines.push(`Description : ${suggestion.description}`);
  if (suggestion.customer_message) lines.push(`Message : ${suggestion.customer_message}`);
  if (suggestion.wallet_notification_title) {
    lines.push(`Titre Wallet : ${suggestion.wallet_notification_title}`);
  }
  if (suggestion.wallet_notification_body) {
    lines.push(`Corps Wallet : ${suggestion.wallet_notification_body}`);
  }
  if (suggestion.recommended_threshold != null) {
    lines.push(`Seuil : ${suggestion.recommended_threshold}`);
  }
  if (suggestion.explanation) lines.push(`Conseil : ${suggestion.explanation}`);
  return lines.join('\n');
}

export async function updateSuggestionFields(suggestionId, fields) {
  const { data, error } = await supabase
    .from('ai_suggestions')
    .update(fields)
    .eq('id', suggestionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function applySuggestionToCampaign(businessId, suggestion, formOverrides = {}) {
  const campaign = await createCampaignFromSuggestion(businessId, suggestion, formOverrides);

  const suggestionPatch = {
    status: 'applied',
    applied_entity_type: 'wallet_campaign',
    applied_entity_id: campaign.id,
    title: formOverrides.title?.trim() || suggestion.title,
    customer_message: formOverrides.message?.trim() || suggestion.customer_message,
    description: formOverrides.offer_label?.trim() || suggestion.description,
  };

  if (suggestion.suggestion_type === 'notification') {
    suggestionPatch.wallet_notification_title = formOverrides.title?.trim()
      || suggestion.wallet_notification_title
      || suggestion.title;
    suggestionPatch.wallet_notification_body = formOverrides.message?.trim()
      || suggestion.wallet_notification_body
      || suggestion.customer_message;
  }

  await updateSuggestionFields(suggestion.id, suggestionPatch);

  return {
    campaign,
    redirectPath: `/dashboard/offers?draft=${campaign.id}`,
  };
}

export function buildProgramRedirectPath(suggestion, formOverrides = {}, loyaltyProgram) {
  const params = new URLSearchParams();
  params.set('ai_suggestion_id', suggestion.id);

  if (suggestion.suggestion_type === 'reward') {
    params.set('ai_reward_label', formOverrides.title?.trim() || suggestion.title || '');
    if (formOverrides.description?.trim() || suggestion.description) {
      params.set('ai_reward_description', formOverrides.description?.trim() || suggestion.description || '');
    }
    const threshold = formOverrides.recommended_threshold ?? suggestion.recommended_threshold;
    if (threshold != null && threshold !== '') {
      params.set('ai_threshold', String(threshold));
    }
    if (loyaltyProgram?.type === 'stamps') {
      params.set('ai_stamps', '1');
    }
  }

  if (suggestion.suggestion_type === 'threshold') {
    const threshold = formOverrides.recommended_threshold ?? suggestion.recommended_threshold;
    if (threshold != null && threshold !== '') {
      params.set('ai_threshold', String(threshold));
    }
    if (loyaltyProgram?.type === 'stamps') {
      params.set('ai_stamps', '1');
    }
  }

  return `/dashboard/program?${params.toString()}`;
}

export function applyThresholdToProgramPayload(payload, programType, thresholdValue) {
  const threshold = Number(thresholdValue);
  if (Number.isNaN(threshold) || threshold <= 0) return null;

  if (programType === 'points') {
    payload.reward_threshold = threshold;
  } else {
    payload.stamps_required = threshold;
  }

  return threshold;
}

async function persistLoyaltyProgram({
  businessId,
  loyaltyProgram,
  reward,
  payload,
}) {
  const programPayload = {
    business_id: businessId,
    name: payload.name,
    type: payload.type,
    points_per_euro: payload.points_per_euro,
    stamps_required: payload.stamps_required,
    reward_label: payload.reward_label,
    reward_threshold: payload.type === 'points' ? payload.reward_threshold : payload.stamps_required,
    is_active: true,
  };

  let programId = loyaltyProgram?.id;

  if (programId) {
    const { error } = await supabase
      .from('loyalty_programs')
      .update(programPayload)
      .eq('id', programId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('loyalty_programs')
      .insert(programPayload)
      .select()
      .single();
    if (error) throw error;
    programId = data.id;
  }

  const thresholdValue = payload.type === 'points'
    ? payload.reward_threshold
    : payload.stamps_required;

  const rewardPayload = {
    loyalty_program_id: programId,
    business_id: businessId,
    name: payload.reward_label,
    description: payload.reward_description || null,
    threshold_value: thresholdValue,
    type: payload.type,
    is_active: true,
  };

  if (reward?.id) {
    const { error } = await supabase.from('rewards').update(rewardPayload).eq('id', reward.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('rewards').insert(rewardPayload);
    if (error) throw error;
  }

  return programId;
}

export async function applyProgramSuggestion({
  businessId,
  loyaltyProgram,
  reward,
  suggestion,
  formOverrides = {},
}) {
  if (!businessId) throw new Error('Commerce requis');
  if (!loyaltyProgram?.id && !businessId) throw new Error('Programme fidélité requis');

  const programType = loyaltyProgram?.type || 'points';
  const payload = {
    name: loyaltyProgram?.name || 'Programme fidélité',
    type: programType,
    points_per_euro: Number(loyaltyProgram?.points_per_euro) || 1,
    stamps_required: loyaltyProgram?.stamps_required || 10,
    reward_label: loyaltyProgram?.reward_label || 'Récompense offerte',
    reward_threshold: loyaltyProgram?.reward_threshold || 100,
    reward_description: reward?.description || '',
  };

  const suggestionPatch = {
    status: 'applied',
    applied_entity_type: 'loyalty_program',
  };

  if (suggestion.suggestion_type === 'reward') {
    payload.reward_label = formOverrides.title?.trim() || suggestion.title || payload.reward_label;
    payload.reward_description = formOverrides.description?.trim()
      || suggestion.description
      || payload.reward_description;

    const threshold = applyThresholdToProgramPayload(
      payload,
      programType,
      formOverrides.recommended_threshold ?? suggestion.recommended_threshold,
    );
    if (threshold != null) {
      suggestionPatch.recommended_threshold = threshold;
    }

    suggestionPatch.title = payload.reward_label;
    suggestionPatch.description = payload.reward_description;
  }

  if (suggestion.suggestion_type === 'threshold') {
    const threshold = applyThresholdToProgramPayload(
      payload,
      programType,
      formOverrides.recommended_threshold ?? suggestion.recommended_threshold,
    );
    if (threshold == null) {
      throw new Error('Seuil invalide');
    }
    suggestionPatch.recommended_threshold = threshold;
    suggestionPatch.description = formOverrides.description?.trim() || suggestion.description;
  }

  const programId = await persistLoyaltyProgram({
    businessId,
    loyaltyProgram,
    reward,
    payload,
  });

  suggestionPatch.applied_entity_id = programId;
  await updateSuggestionFields(suggestion.id, suggestionPatch);

  return {
    programId,
    redirectPath: '/dashboard/program',
  };
}

export async function markProgramSuggestionApplied(suggestionId, programId) {
  if (!suggestionId || !programId) return null;
  return updateSuggestionFields(suggestionId, {
    status: 'applied',
    applied_entity_type: 'loyalty_program',
    applied_entity_id: programId,
  });
}

export async function applyCalendarItemToCampaign(businessId, item, formOverrides = {}) {
  const form = buildCalendarCampaignForm(item, formOverrides);
  const validationError = validateCampaignForm(form);
  if (validationError) throw new Error(validationError);

  const campaign = await createCampaign(businessId, form);

  const { data, error } = await supabase
    .from('ai_marketing_calendar_items')
    .update({
      status: 'ready',
      wallet_campaign_id: campaign.id,
    })
    .eq('id', item.id)
    .select()
    .single();

  if (error) throw error;

  return {
    campaign,
    calendarItem: data,
    redirectPath: `/dashboard/offers?draft=${campaign.id}`,
  };
}
