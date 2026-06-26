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
import { useMyBusiness } from '@/hooks/useMyBusiness';
import {
  fetchMembershipDetail,
  fetchWalletSyncLogs,
  formatWalletSyncStatus,
  getCustomerDisplayName,
  getWalletBadges,
} from '@/lib/customers';
import { formatTransactionType, notifyWalletSyncResult, syncMembershipWallet } from '@/lib/scan';
import { STALE_TIMES } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function TransactionHistory({ transactions }) {
  if (!transactions?.length) {
    return <p className="text-sm text-muted-foreground">Aucun mouvement enregistré.</p>;
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="flex items-start justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{formatTransactionType(tx.type)}</p>
            {tx.note ? <p className="text-muted-foreground">{tx.note}</p> : null}
            {tx.amount_spent ? (
              <p className="text-xs text-muted-foreground">
                Montant :
                {' '}
                {Number(tx.amount_spent).toFixed(2)}
                {' '}
                €
              </p>
            ) : null}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{new Date(tx.created_at).toLocaleString('fr-FR')}</p>
            {tx.points_delta > 0 ? <p className="text-rc-navy">+{tx.points_delta} pts</p> : null}
            {tx.stamps_delta > 0 ? <p className="text-rc-navy">+{tx.stamps_delta} tampon</p> : null}
            {tx.rewards_delta !== 0 ? (
              <p className={tx.rewards_delta > 0 ? 'text-green-600' : 'text-rc-orange'}>
                {tx.rewards_delta > 0 ? '+' : ''}
                {tx.rewards_delta}
                {' '}
                récomp.
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

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

  return (
    <DashboardLayout
      title={getCustomerDisplayName(customer)}
      description={`Carte n° ${membership.card_number}`}
    >
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
          <Link to="/dashboard/customers">
            <ArrowLeft className="h-4 w-4" />
            Tous les clients
          </Link>
        </Button>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {isStamps ? 'Tampons' : 'Points'}
              </p>
              <p className="mt-1 text-3xl font-bold text-rc-navy">
                {isStamps ? membership.stamps_balance : membership.points_balance}
                {isStamps && program?.stamps_required ? (
                  <span className="text-lg font-normal text-muted-foreground">
                    {' '}
                    / {program.stamps_required}
                  </span>
                ) : null}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Récompenses
              </p>
              <p className="mt-1 text-3xl font-bold text-rc-orange">
                {membership.rewards_available}
              </p>
              <p className="text-xs text-muted-foreground">
                {program?.reward_label || 'Récompense'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Inscrit le
              </p>
              <p className="mt-1 text-lg font-semibold">
                {new Date(membership.created_at).toLocaleDateString('fr-FR')}
              </p>
              {walletBadges.length > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-xs text-rc-teal">
                  <Smartphone className="h-3 w-3" />
                  {walletBadges.join(' · ')}
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Pas encore de Wallet</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique</CardTitle>
              <CardDescription>50 derniers mouvements</CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionHistory transactions={data.transactions} />
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
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {customer.phone}
                  </p>
                ) : null}
                {customer?.email ? (
                  <p className="flex items-center gap-2 break-all">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {customer.email}
                  </p>
                ) : null}
                {!customer?.phone && !customer?.email ? (
                  <p className="text-muted-foreground">Aucune coordonnée renseignée.</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full gap-2">
                  <Link to={`/dashboard/scan?membership=${membership.id}`}>
                    <ScanLine className="h-4 w-4" />
                    Scanner / créditer
                  </Link>
                </Button>
                {hasWalletTarget ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={syncMutation.isPending}
                    onClick={() => syncMutation.mutate()}
                  >
                    {syncMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Mettre à jour la carte Wallet
                  </Button>
                ) : null}
                {membership.rewards_available > 0 ? (
                  <p className="flex items-center gap-2 text-xs text-rc-orange">
                    <Gift className="h-3 w-3" />
                    {membership.rewards_available}
                    {' '}
                    récompense(s) à utiliser
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {hasWalletTarget ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sync Wallet</CardTitle>
                  <CardDescription>
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
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {syncLogs.slice(0, 5).map((log) => {
                        const fmt = formatWalletSyncStatus(log);
                        return (
                          <li key={log.id} className="flex justify-between gap-2 border-b border-slate-100 pb-1.5">
                            <span>
                              {fmt.statusLabel}
                              {fmt.notificationLabel ? (
                                <span className="ml-1 text-rc-orange">· {fmt.notificationLabel}</span>
                              ) : null}
                            </span>
                            <span className="shrink-0 text-right">
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
    </DashboardLayout>
  );
}
