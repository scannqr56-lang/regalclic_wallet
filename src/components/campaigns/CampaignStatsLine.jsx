import { useQuery } from '@tanstack/react-query';
import { fetchCampaignBroadcastStats } from '@/lib/campaigns';
import { cn } from '@/lib/utils';

export default function CampaignStatsLine({ campaignId, className }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-broadcast-stats', campaignId],
    queryFn: () => fetchCampaignBroadcastStats(campaignId),
    enabled: Boolean(campaignId),
  });

  if (isLoading) {
    return <p className={cn('text-xs text-muted-foreground', className)}>Chargement des stats…</p>;
  }

  if (!data?.total) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        Aucune carte synchronisée pour l&apos;instant.
      </p>
    );
  }

  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      Diffusion :
      {' '}
      {data.total}
      {' '}
      carte(s) — Google
      {' '}
      {data.google_ok}
      , Apple
      {' '}
      {data.apple_ok}
      {data.notified ? ' — avec notification' : ''}
      {data.failed > 0 ? ` — ${data.failed} échec(s)` : ''}
    </p>
  );
}
