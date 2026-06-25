import { supabase } from '@/lib/supabase';

const MEMBERSHIP_LIST_SELECT = `
  id,
  card_number,
  points_balance,
  stamps_balance,
  rewards_available,
  status,
  google_object_id,
  apple_serial_number,
  created_at,
  updated_at,
  customers (
    id,
    first_name,
    last_name,
    phone,
    email
  ),
  loyalty_programs (
    type,
    reward_label
  )
`;

export async function fetchBusinessCustomers(businessId) {
  const { data, error } = await supabase
    .from('customer_memberships')
    .select(MEMBERSHIP_LIST_SELECT)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchMembershipDetail(membershipId) {
  const { data: membership, error } = await supabase
    .from('customer_memberships')
    .select(`
      *,
      customers (
        id,
        first_name,
        last_name,
        phone,
        email,
        created_at
      ),
      loyalty_programs (
        type,
        reward_label,
        reward_threshold,
        stamps_required,
        points_per_euro
      )
    `)
    .eq('id', membershipId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!membership) throw new Error('Client introuvable');

  const { data: transactions, error: txError } = await supabase
    .from('loyalty_transactions')
    .select('id, type, amount_spent, points_delta, stamps_delta, rewards_delta, note, created_at')
    .eq('membership_id', membershipId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (txError) throw txError;

  return {
    membership,
    customer: membership.customers,
    loyalty_program: membership.loyalty_programs,
    transactions: transactions ?? [],
  };
}

/** Format compatible avec le scanner (préchargement fiche). */
export async function fetchMembershipForScan(membershipId) {
  const detail = await fetchMembershipDetail(membershipId);
  return {
    membership: detail.membership,
    customer: detail.customer,
    loyalty_program: detail.loyalty_program,
    recent_transactions: detail.transactions.slice(0, 10),
  };
}

export function getCustomerDisplayName(customer) {
  if (!customer) return 'Client';
  const parts = [customer.first_name, customer.last_name].filter(Boolean);
  return parts.join(' ') || 'Client';
}

export function matchesCustomerSearch(row, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const customer = row.customers;
  const haystack = [
    customer?.first_name,
    customer?.last_name,
    customer?.phone,
    customer?.email,
    row.card_number,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
}

export function getWalletBadges(membership) {
  const badges = [];
  if (membership?.google_object_id) badges.push('Google');
  if (membership?.apple_serial_number) badges.push('Apple');
  return badges;
}
