import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase non configuré : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getAuthErrorMessage(error, mode = 'login') {
  const message = error?.message || '';
  if (message.includes('Invalid login credentials')) {
    return 'Email ou mot de passe incorrect.';
  }
  if (message.includes('User already registered')) {
    return 'Un compte existe déjà avec cet email.';
  }
  if (message.includes('Password')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  return message || (mode === 'signup' ? "Impossible de créer le compte." : 'Connexion impossible.');
}

export const supabaseAuth = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSessionUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  redirectToLogin(nextPath = '/dashboard') {
    const next = encodeURIComponent(nextPath);
    window.location.href = `/auth?next=${next}`;
  },
};

export async function fetchMyBusiness() {
  const { data, error } = await supabase.rpc('get_my_business');
  if (error) throw error;
  if (!data) return { business: null, loyaltyProgram: null, staffRole: null };
  return {
    business: data.business ?? null,
    loyaltyProgram: data.loyalty_program ?? null,
    staffRole: data.staff_role ?? null,
  };
}

export async function fetchBusinessStats(businessId) {
  const { data, error } = await supabase.rpc('get_business_stats', {
    p_business_id: businessId,
  });
  if (error) throw error;
  return data ?? {};
}

export async function uploadBusinessLogo(businessId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${businessId}/logo.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('business-assets')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('business-assets').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
