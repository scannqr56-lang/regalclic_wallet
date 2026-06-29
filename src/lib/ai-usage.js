import { supabase } from '@/lib/supabase';

const ACTION_LABELS = {
  upload_menu: 'Upload menu',
  extract_menu: 'Extraction menu',
  generate_batch: 'Génération IA',
  apply_suggestion: 'Application suggestion',
};

function monthStartIso(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
}

/** Activité IA du commerce courant (mois en cours) — lecture via RLS membre. */
export async function fetchBusinessAiUsageMonth(businessId) {
  const from = monthStartIso();

  const { data, error } = await supabase
    .from('ai_usage_logs')
    .select('id, action, tokens_input, tokens_output, duration_ms, created_at')
    .eq('business_id', businessId)
    .gte('created_at', from)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const byAction = rows.reduce((acc, row) => {
    acc[row.action] = (acc[row.action] || 0) + 1;
    return acc;
  }, {});

  return {
    total_calls: rows.length,
    by_action: byAction,
    recent: rows.slice(0, 5),
  };
}

export function formatAiActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

export function formatBusinessAiActivityLine(summary) {
  if (!summary?.total_calls) return null;

  const parts = [`${summary.total_calls} appel${summary.total_calls > 1 ? 's' : ''} IA ce mois`];
  const extractions = summary.by_action?.extract_menu || 0;
  const generations = summary.by_action?.generate_batch || 0;

  if (extractions) parts.push(`${extractions} extraction${extractions > 1 ? 's' : ''}`);
  if (generations) parts.push(`${generations} génération${generations > 1 ? 's' : ''}`);

  return parts.join(' · ');
}
