import { AlertTriangle, BarChart3, Clock, Coins, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminAiUsageSummary } from '@/lib/admin-merchants';
import { formatAiActionLabel } from '@/lib/ai-usage';
import ResponsiveDataTable from '@/components/ui/responsive-data-table';
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
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 shrink-0 text-rc-teal" />
            Observabilité IA
          </CardTitle>
          <CardDescription>
            Coûts et appels OpenAI agrégés — {summary?.month_label || 'mois en cours'}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          className="h-11 w-full shrink-0 sm:w-auto"
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <ResponsiveDataTable
                  rows={summary.by_business}
                  rowKey={(row) => row.business_id}
                  columns={[
                    {
                      key: 'business',
                      header: 'Commerce',
                      render: (row) => (
                        <>
                          <p className="font-medium text-slate-900">{row.business_name}</p>
                          {row.business_slug ? (
                            <p className="text-xs text-slate-500">{row.business_slug}</p>
                          ) : null}
                        </>
                      ),
                    },
                    {
                      key: 'calls',
                      header: 'Appels',
                      render: (row) => row.calls,
                    },
                    {
                      key: 'cost',
                      header: 'Coût est.',
                      render: (row) => formatUsd(row.cost_usd),
                    },
                  ]}
                />
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
                      className="rounded-md border px-3 py-3 text-xs text-slate-600 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-2 sm:py-2"
                    >
                      <span className="block font-medium text-slate-800 sm:inline">{row.business_name}</span>
                      <span className="mt-1 block sm:mt-0">{formatAiActionLabel(row.action)}</span>
                      <span className="font-medium">{formatUsd(row.cost_usd)}</span>
                      <span className="hidden text-slate-500 sm:inline">{row.model_used || '—'}</span>
                      <span className="text-slate-500">{formatDateTime(row.created_at)}</span>
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
