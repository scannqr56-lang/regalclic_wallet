import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Gift,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ScanLine,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import TransactionHistoryList from '@/components/customers/TransactionHistoryList';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import {
  fetchMembershipDetail,
  fetchWalletSyncLogs,
  formatWalletSyncStatus,
  getCustomerDisplayName,
  getWalletBadges,
} from '@/lib/customers';
import { notifyWalletSyncResult, syncMembershipWallet } from '@/lib/scan';
import { STALE_TIMES } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CustomerDetailPage() {
  const { membershipId } = useParams();
  const queryClient = useQueryClient();
  const { business, loyaltyProgram, isLoading: loadingBusiness } = useMyBusiness();

  const { data, isLoading, error } = useQuery({
    queryKey: ['membership-detail', membershipId],
    queryFn: () => fetchMembershipDetail(membershipId),
    enabled: !!membershipId,
    staleTime: STALE_TIMES.customers,
  });

  const { data: syncLogs = [] } = useQuery({
    queryKey: ['wallet-sync-logs', membershipId],
    queryFn: () => fetchWalletSyncLogs(membershipId),
    enabled: !!membershipId,
    staleTime: 30_000,
  });

  const syncMutation = useMutation({
    mutationFn: () => syncMembershipWallet(membershipId, { source: 'manual' }),
    onSuccess: (result) => {
      notifyWalletSyncResult(result);
      queryClient.invalidateQueries({ queryKey: ['wallet-sync-logs', membershipId] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Synchronisation impossible');
    },
  });

  const program = data?.loyalty_program || loyaltyProgram;
  const isStamps = program?.type === 'stamps';
  const membership = data?.membership;
  const customer = data?.customer;
  const walletBadges = getWalletBadges(membership);
  const lastSync = syncLogs[0] ? formatWalletSyncStatus(syncLogs[0]) : null;
  const hasWalletTarget = Boolean(membership?.google_object_id || membership?.apple_serial_number);

  if (loadingBusiness || isLoading) {
    return (
      <DashboardLayout title="Fiche client">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Fiche client">
        <Card className="max-w-lg">
          <CardContent className="pt-6">
            <Button asChild>
              <Link to="/dashboard/business">Configurer mon commerce</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (error || !data) {
    return (
      <DashboardLayout title="Fiche client">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Client introuvable
            </CardTitle>
            <CardDescription>
              Cette carte n&apos;existe pas ou n&apos;appartient pas à votre commerce.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link to="/dashboard/customers">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const actionsCard = (
    <Card className="border-rc-teal/20 lg:order-none">
      <CardHeader>
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ResponsiveActions>
          <Button asChild className="gap-2">
            <Link to={`/dashboard/scan?membership=${membership.id}`}>
              <ScanLine className="h-4 w-4" />
              Scanner / créditer
            </Link>
          </Button>
          {hasWalletTarget ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Mettre à jour Wallet
            </Button>
          ) : null}
        </ResponsiveActions>
        {membership.rewards_available > 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-rc-orange/10 px-3 py-2 text-sm font-medium text-rc-orange">
            <Gift className="h-4 w-4 shrink-0" />
            {membership.rewards_available}
            {' '}
            récompense(s) à utiliser
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout
      title={getCustomerDisplayName(customer)}
      description={`Carte n° ${membership.card_number}`}
    >
      <div className="space-y-4 pb-24 lg:pb-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link to="/dashboard/customers">
            <ArrowLeft className="h-4 w-4" />
            Tous les clients
          </Link>
        </Button>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className={membership.rewards_available > 0 ? 'col-span-2 border-rc-orange/30 sm:col-span-1' : ''}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isStamps ? 'Tampons' : 'Points'}
              </p>
              <p className="mt-1 text-2xl font-bold text-rc-navy sm:text-3xl">
                {isStamps ? membership.stamps_balance : membership.points_balance}
                {isStamps && program?.stamps_required ? (
                  <span className="text-base font-normal text-muted-foreground sm:text-lg">
                    {' '}
                    / {program.stamps_required}
                  </span>
                ) : null}
              </p>
            </CardContent>
          </Card>
          <Card className={membership.rewards_available > 0 ? 'border-rc-orange/40 bg-rc-orange/5' : ''}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Récompenses
              </p>
              <p className="mt-1 text-2xl font-bold text-rc-orange sm:text-3xl">
                {membership.rewards_available}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {program?.reward_label || 'Récompense'}
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Inscrit le
              </p>
              <p className="mt-1 text-lg font-semibold">
                {new Date(membership.created_at).toLocaleDateString('fr-FR')}
              </p>
              {walletBadges.length > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-rc-teal">
                  <Smartphone className="h-3 w-3 shrink-0" />
                  {walletBadges.join(' · ')}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Pas encore de Wallet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions visibles tôt sur mobile */}
        <div className="lg:hidden">{actionsCard}</div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-base">Historique</CardTitle>
              <CardDescription>50 derniers mouvements</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionHistoryList transactions={data.transactions} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coordonnées</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {customer?.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a href={`tel:${customer.phone}`} className="break-all hover:underline">
                      {customer.phone}
                    </a>
                  </p>
                ) : null}
                {customer?.email ? (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <a href={`mailto:${customer.email}`} className="break-all hover:underline">
                      {customer.email}
                    </a>
                  </p>
                ) : null}
                {!customer?.phone && !customer?.email ? (
                  <p className="text-muted-foreground">Aucune coordonnée renseignée.</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="hidden lg:block">{actionsCard}</div>

            {hasWalletTarget ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sync Wallet</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {lastSync
                      ? `Dernière sync : ${lastSync.statusLabel} (${lastSync.sourceLabel}) — ${lastSync.at}`
                      : 'Aucune synchronisation enregistrée'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lastSync?.detail ? (
                    <p className="mb-3 text-xs text-muted-foreground">{lastSync.detail}</p>
                  ) : null}
                  {syncLogs.length > 0 ? (
                    <ul className="space-y-2 text-xs text-muted-foreground">
                      {syncLogs.slice(0, 5).map((log) => {
                        const fmt = formatWalletSyncStatus(log);
                        return (
                          <li
                            key={log.id}
                            className="flex flex-col gap-0.5 border-b border-slate-100 pb-2 sm:flex-row sm:justify-between sm:gap-2"
                          >
                            <span>
                              {fmt.statusLabel}
                              {fmt.notificationLabel ? (
                                <span className="ml-1 text-rc-orange">· {fmt.notificationLabel}</span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-slate-500">
                              {fmt.sourceLabel}
                              {' · '}
                              {new Date(log.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Les syncs apparaîtront ici après un scan ou une mise à jour manuelle.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      {/* Barre d'action sticky mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 p-3 shadow-lg backdrop-blur lg:hidden">
        <Button asChild className="h-12 w-full gap-2 text-base">
          <Link to={`/dashboard/scan?membership=${membership.id}`}>
            <ScanLine className="h-5 w-5" />
            Scanner / ajouter points
          </Link>
        </Button>
      </div>
    </DashboardLayout>
  );
}
