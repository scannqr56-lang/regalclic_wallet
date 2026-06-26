import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type ActiveWalletCampaign = {
  id: string;
  message: string;
  offer_label: string | null;
};

export async function fetchActiveWalletCampaign(
  supabase: SupabaseClient,
  businessId: string,
): Promise<ActiveWalletCampaign | null> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("wallet_campaigns")
    .select("id, message, offer_label")
    .eq("business_id", businessId)
    .eq("status", "active")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    message: data.message,
    offer_label: data.offer_label,
  };
}
