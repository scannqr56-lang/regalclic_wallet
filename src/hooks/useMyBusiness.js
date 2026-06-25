import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { fetchMyBusiness } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/query-client';

export function useMyBusiness() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['my-business', user?.id],
    queryFn: fetchMyBusiness,
    enabled: !!user?.id,
    staleTime: STALE_TIMES.business,
  });

  return {
    user,
    business: data?.business ?? null,
    loyaltyProgram: data?.loyaltyProgram ?? null,
    staffRole: data?.staffRole ?? null,
    isLoading,
    refetch,
  };
}
