import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronRight, Search, Users } from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import CustomerListCard from '@/components/customers/CustomerListCard';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import {
  fetchBusinessCustomers,
  getCustomerDisplayName,
  getWalletBadges,
  matchesCustomerSearch,
} from '@/lib/customers';
import { STALE_TIMES } from '@/lib/query-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

function BalanceCell({ membership, programType }) {
  if (programType === 'stamps') {
    return (
      <span>
        {membership.stamps_balance}
        {' '}
        tampon{membership.stamps_balance > 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span>
      {membership.points_balance}
      {' '}
      pt{membership.points_balance > 1 ? 's' : ''}
    </span>
  );
}

export default function CustomersPage() {
  const { business, loyaltyProgram, isLoading: loadingBusiness } = useMyBusiness();
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['business-customers', business?.id],
    queryFn: () => fetchBusinessCustomers(business.id),
    enabled: !!business?.id,
    staleTime: STALE_TIMES.customers,
  });

  const filtered = useMemo(
    () => customers.filter((row) => matchesCustomerSearch(row, search)),
    [customers, search],
  );

  const programType = loyaltyProgram?.type === 'stamps' ? 'stamps' : 'points';

  if (loadingBusiness) {
    return (
      <DashboardLayout title="Clients">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Clients">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Commerce requis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/business">Configurer mon commerce</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Clients"
      description={`${customers.length} client${customers.length > 1 ? 's' : ''} inscrit${customers.length > 1 ? 's' : ''}`}
    >
      <div className="space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, téléphone, email ou n° carte…"
            className="h-11 pl-9"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">
                {search ? 'Aucun client ne correspond à votre recherche.' : 'Aucun client inscrit pour le moment.'}
              </p>
              {!search ? (
                <Button asChild variant="outline">
                  <Link to="/dashboard/qr">Afficher le QR d&apos;inscription</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Mobile : cartes avec actions */}
            <ul className="space-y-3 md:hidden">
              {filtered.map((row) => (
                <CustomerListCard key={row.id} row={row} programType={programType} />
              ))}
            </ul>

            {/* Tablette / desktop : liste compacte */}
            <Card className="hidden md:block">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Liste des clients</CardTitle>
                <CardDescription>Cliquez sur une fiche pour voir l&apos;historique.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {filtered.map((row) => {
                    const walletBadges = getWalletBadges(row);
                    return (
                      <li key={row.id}>
                        <Link
                          to={`/dashboard/customers/${row.id}`}
                          className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rc-navy/10 text-sm font-semibold text-rc-navy">
                            {(row.customers?.first_name?.[0] || 'C').toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">
                              {getCustomerDisplayName(row.customers)}
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {row.customers?.phone || row.customers?.email || `Carte ${row.card_number}`}
                            </p>
                            {walletBadges.length > 0 ? (
                              <p className="mt-1 text-xs text-rc-teal">
                                Wallet :
                                {' '}
                                {walletBadges.join(' · ')}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-rc-navy">
                              <BalanceCell membership={row} programType={programType} />
                            </p>
                            {row.rewards_available > 0 ? (
                              <p className="text-xs text-rc-orange">
                                {row.rewards_available}
                                {' '}
                                récomp.
                              </p>
                            ) : null}
                          </div>
                          <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
