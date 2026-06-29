import { AlertTriangle, BarChart3, Clock, Coins, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminAiUsageSummary } from '@/lib/admin-merchants';
import { formatAiActionLabel } from '@/lib/ai-usage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function formatUsd(value) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminAiUsagePanel() {
  const summaryQuery = useQuery({
    queryKey: ['admin-ai-usage-summary'],
    queryFn: fetchAdminAiUsageSummary,
    staleTime: 60_000,
  });

  const summary = summaryQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-rc-teal" />
            Observabilité IA
          </CardTitle>
          <CardDescription>
            Coûts et appels OpenAI agrégés — {summary?.month_label || 'mois en cours'}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={summaryQuery.isFetching}
          onClick={() => summaryQuery.refetch()}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${summaryQuery.isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {summaryQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : summary ? (
          <>
            {summary.alert_exceeded ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Seuil de coût mensuel dépassé</p>
                  <p className="mt-0.5">
                    {formatUsd(summary.total_cost_usd)} ce mois (seuil : {formatUsd(summary.alert_threshold_usd)}).
                    Vérifiez les usages par commerce ci-dessous.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-slate-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Coins className="h-3.5 w-3.5" />
                  Coût estimé
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {formatUsd(summary.total_cost_usd)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Seuil alerte : {formatUsd(summary.alert_threshold_usd)}
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 px-4 py-3">
                <p className="text-xs text-slate-500">Appels provider</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.total_calls}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {summary.total_tokens_input.toLocaleString('fr-FR')} tokens in ·{' '}
                  {summary.total_tokens_output.toLocaleString('fr-FR')} out
                </p>
              </div>
              <div className="rounded-lg border bg-slate-50 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Commerces actifs
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {summary.by_business.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">avec au moins 1 appel ce mois</p>
              </div>
            </div>

            {summary.by_business.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Par commerce</p>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Commerce</th>
                        <th className="px-3 py-2 font-medium">Appels</th>
                        <th className="px-3 py-2 font-medium">Coût est.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.by_business.map((row) => (
                        <tr key={row.business_id} className="border-t">
                          <td className="px-3 py-2">
                            <p className="font-medium text-slate-900">{row.business_name}</p>
                            {row.business_slug ? (
                              <p className="text-xs text-slate-500">{row.business_slug}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{row.calls}</td>
                          <td className="px-3 py-2 text-slate-700">{formatUsd(row.cost_usd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun appel IA enregistré ce mois.</p>
            )}

            {summary.by_action.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.by_action.map((row) => (
                  <span
                    key={row.action}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                  >
                    {formatAiActionLabel(row.action)} · {row.calls} · {formatUsd(row.cost_usd)}
                  </span>
                ))}
              </div>
            ) : null}

            {summary.recent.length > 0 ? (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-900">Derniers appels</p>
                <div className="space-y-2">
                  {summary.recent.slice(0, 8).map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs text-slate-600"
                    >
                      <span className="font-medium text-slate-800">{row.business_name}</span>
                      <span>{formatAiActionLabel(row.action)}</span>
                      <span>{formatUsd(row.cost_usd)}</span>
                      <span>{row.model_used || '—'}</span>
                      <span>{formatDateTime(row.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-slate-500">Impossible de charger les statistiques IA.</p>
        )}
      </CardContent>
    </Card>
  );
}
