import { useQuery } from '@tanstack/react-query';
import { fetchOnboardingProgress } from '@/lib/onboarding-progress';
import { fetchBusinessStats } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/query-client';

export function useOnboardingProgress(business, loyaltyProgram) {
  const statsQuery = useQuery({
    queryKey: ['business-stats', business?.id],
    queryFn: () => fetchBusinessStats(business.id),
    enabled: !!business?.id,
    staleTime: STALE_TIMES.stats,
  });

  const progressQuery = useQuery({
    queryKey: ['onboarding-progress', business?.id, loyaltyProgram?.id, statsQuery.data?.customers_count],
    queryFn: () => fetchOnboardingProgress({
      businessId: business.id,
      business,
      loyaltyProgram,
      stats: statsQuery.data,
    }),
    enabled: !!business?.id,
    staleTime: 30_000,
  });

  return {
    stats: statsQuery.data,
    statsLoading: statsQuery.isLoading,
    progress: progressQuery.data,
    progressLoading: progressQuery.isLoading,
    isLoading: statsQuery.isLoading || progressQuery.isLoading,
    refetch: progressQuery.refetch,
  };
}
