import { supabase } from '@/lib/supabase';

const AI_GENERATE_SUGGESTIONS_FUNCTION = 'ai-generate-suggestions';
const GENERATE_TIMEOUT_MS = 180_000;

export const CALENDAR_STATUS_LABELS = {
  draft: 'Brouillon',
  ready: 'Programmé',
  published: 'Publié',
  ignored: 'Ignoré',
};

function getSupabaseConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  return { url, anonKey };
}

async function invokeGenerateCalendar(payload = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Session expirée');

  const { url, anonKey } = getSupabaseConfig();
  const endpoint = `${url.replace(/\/$/, '')}/functions/v1/${AI_GENERATE_SUGGESTIONS_FUNCTION}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'calendar', ...payload }),
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

export function generateCalendarSuggestions(businessId, menuUploadId) {
  return invokeGenerateCalendar({
    business_id: businessId,
    menu_upload_id: menuUploadId,
  });
}

export async function fetchCalendarItems(businessId, { batchId } = {}) {
  let query = supabase
    .from('ai_marketing_calendar_items')
    .select('*')
    .eq('business_id', businessId)
    .order('scheduled_date', { ascending: true });

  if (batchId) query = query.eq('batch_id', batchId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function updateCalendarItemStatus(itemId, status) {
  const { data, error } = await supabase
    .from('ai_marketing_calendar_items')
    .update({ status })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getCalendarWeekRanges(startDate) {
  if (!startDate) return [];

  return [0, 1, 2, 3].map((weekIndex) => {
    const weekStart = addDays(startDate, weekIndex * 7);
    const weekEnd = addDays(startDate, weekIndex * 7 + 6);
    return {
      index: weekIndex,
      label: `Semaine ${weekIndex + 1}`,
      weekStart,
      weekEnd,
      dateRangeLabel: `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`,
    };
  });
}

export function filterItemsByWeek(items, weekStart, weekEnd) {
  return items.filter((item) => item.scheduled_date >= weekStart && item.scheduled_date <= weekEnd);
}

export function formatShortDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatCalendarForCopy(items) {
  const sorted = [...items].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  return sorted
    .map((item) => {
      const lines = [
        `${item.scheduled_date} — ${item.title}`,
        `Objectif : ${item.objective || '—'}`,
        `Message Wallet : ${item.wallet_message || '—'}`,
        `Cible : ${item.target_segment || 'all'}`,
      ];
      if (item.offer_message) lines.push(`Offre : ${item.offer_message}`);
      if (item.advice) lines.push(`Conseil : ${item.advice}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

export function getCalendarStartDate(items) {
  if (!items?.length) return null;
  return items.reduce((min, item) => (
    !min || item.scheduled_date < min ? item.scheduled_date : min
  ), null);
}
