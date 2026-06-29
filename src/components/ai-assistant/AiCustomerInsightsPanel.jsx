import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAiCustomerInsights, SEGMENT_LABELS } from '@/lib/ai-insights';

function SegmentStat({ label, value, hint }) {
  return (
    <div className="rounded-lg border bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export default function AiCustomerInsightsPanel({ businessId }) {
  const insightsQuery = useQuery({
    queryKey: ['ai-customer-insights', businessId],
    queryFn: () => fetchAiCustomerInsights(businessId),
    enabled: !!businessId,
    staleTime: 120_000,
  });

  const insights = insightsQuery.data;
  const segments = insights?.segments;
  const thresholds = insights?.thresholds;

  if (!insightsQuery.isLoading && segments?.all === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5 text-rc-teal" />
          Vos clients réguliers
        </CardTitle>
        <CardDescription>
          Aperçu de votre clientèle — pour affiner vos idées d’offres (données anonymes).
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insightsQuery.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : !segments ? (
          <p className="text-sm text-slate-500">Insights indisponibles pour le moment.</p>
        ) : segments.all === 0 ? (
          <p className="text-sm text-slate-600">
            Aucun client inscrit encore — les suggestions restent génériques jusqu&apos;à vos premiers scans.
            {' '}
            <Link className="font-medium text-rc-teal underline" to="/dashboard/qr">
              Afficher le QR inscription
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <SegmentStat
                label={SEGMENT_LABELS.loyal}
                value={segments.loyal}
                hint={`≥ ${thresholds?.loyal_min_visits} visites / ${thresholds?.loyal_window_days} j`}
              />
              <SegmentStat
                label={SEGMENT_LABELS.inactive}
                value={segments.inactive}
                hint={`> ${thresholds?.inactive_days} j sans visite`}
              />
              <SegmentStat
                label={SEGMENT_LABELS.new}
                value={segments.new}
                hint={`≤ ${thresholds?.new_days} j`}
              />
              <SegmentStat
                label="Scans (30 j)"
                value={insights.activity?.earn_transactions_30d ?? 0}
              />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Users className="h-3.5 w-3.5" />
              {segments.all} client{segments.all > 1 ? 's' : ''} actif{segments.all > 1 ? 's' : ''} au total
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
