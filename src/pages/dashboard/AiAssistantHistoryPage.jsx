import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, History, Loader2 } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiAssistantNav from '@/components/ai-assistant/AiAssistantNav';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BATCH_STATUS_LABELS,
  BATCH_TYPE_LABELS,
  fetchSuggestionBatches,
  fetchSuggestionBatchSummary,
} from '@/lib/ai-suggestions';

function formatDate(value) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }) {
  const styles = {
    processing: 'bg-amber-100 text-amber-800',
    completed: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] || 'bg-slate-100 text-slate-700'}`}>
      {BATCH_STATUS_LABELS[status] || status}
    </span>
  );
}

function BatchRow({ batch, businessId }) {
  const summaryQuery = useQuery({
    queryKey: ['ai-batch-summary', businessId, batch.id],
    queryFn: () => fetchSuggestionBatchSummary(businessId, batch.id),
    enabled: batch.status === 'completed',
  });

  return (
    <div className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-slate-900">
            {BATCH_TYPE_LABELS[batch.type] || batch.type}
          </p>
          <StatusBadge status={batch.status} />
        </div>
        <p className="text-xs text-slate-500">{formatDate(batch.created_at)}</p>
        {batch.status === 'completed' && summaryQuery.data ? (
          <p className="text-xs text-slate-600">
            {summaryQuery.data.suggestions_count} idée
            {summaryQuery.data.suggestions_count > 1 ? 's' : ''}
            {summaryQuery.data.calendar_count
              ? ` · ${summaryQuery.data.calendar_count} jour${summaryQuery.data.calendar_count > 1 ? 's' : ''} de planning`
              : ''}
          </p>
        ) : null}
        {batch.status === 'failed' && batch.error_message ? (
          <p className="flex items-start gap-1.5 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {batch.error_message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {batch.status === 'completed' ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ideas?tab=offers">Choisir</Link>
          </Button>
        ) : batch.status === 'processing' ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            En cours…
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function AiAssistantHistoryPage() {
  const { business, isLoading: businessLoading } = useMyBusiness();

  const batchesQuery = useQuery({
    queryKey: ['ai-suggestion-batches', business?.id],
    queryFn: () => fetchSuggestionBatches(business.id),
    enabled: !!business?.id,
    refetchInterval: (query) => {
      const hasProcessing = (query.state.data ?? []).some((row) => row.status === 'processing');
      return hasProcessing ? 5000 : false;
    },
  });

  if (businessLoading) {
    return (
      <DashboardLayout title="Historique" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  const batches = batchesQuery.data ?? [];

  return (
    <DashboardLayout
      title="Historique"
      description="Suivi de vos préparations d’idées"
    >
      <div className="space-y-6">
        <AiAssistantNav />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-rc-teal" />
              Préparations récentes
            </CardTitle>
            <CardDescription>
              Toutes vos idées, générations ciblées et planning du mois.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {batchesQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : batches.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-slate-500">
                Aucune préparation pour l&apos;instant.
                {' '}
                <Link className="font-medium text-rc-teal underline" to="/dashboard/ideas">
                  Obtenir mes idées
                </Link>
              </div>
            ) : (
              batches.map((batch) => (
                <BatchRow key={batch.id} batch={batch} businessId={business.id} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
