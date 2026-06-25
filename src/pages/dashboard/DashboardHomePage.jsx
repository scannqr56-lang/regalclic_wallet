import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Sparkles, QrCode, Store, ArrowRight, AlertCircle, ScanLine,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { fetchBusinessStats } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/query-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rc-navy/10 text-rc-navy">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardHomePage() {
  const { business, loyaltyProgram, isLoading } = useMyBusiness();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['business-stats', business?.id],
    queryFn: () => fetchBusinessStats(business.id),
    enabled: !!business?.id,
    staleTime: STALE_TIMES.stats,
  });

  if (isLoading) {
    return (
      <DashboardLayout title="Tableau de bord">
        <Skeleton className="h-40 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout
        title="Bienvenue sur RegalClic"
        description="Configurez votre commerce pour démarrer."
      >
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Aucun commerce configuré
            </CardTitle>
            <CardDescription>
              Créez votre restaurant ou commerce pour générer votre QR code d&apos;inscription.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/business">
                Configurer mon commerce
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const programLabel = loyaltyProgram?.type === 'stamps' ? 'Tampons' : 'Points';

  return (
    <DashboardLayout
      title={business.name}
      description="Vue d'ensemble de votre programme de fidélité."
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Clients inscrits"
            value={loadingStats ? '…' : stats?.customers_count ?? 0}
            icon={Users}
          />
          <StatCard
            label={loyaltyProgram?.type === 'stamps' ? 'Tampons distribués' : 'Points distribués'}
            value={
              loadingStats
                ? '…'
                : loyaltyProgram?.type === 'stamps'
                  ? stats?.total_stamps_distributed ?? 0
                  : stats?.total_points_distributed ?? 0
            }
            icon={Sparkles}
          />
          <StatCard
            label="Récompenses en attente"
            value={loadingStats ? '…' : stats?.rewards_pending ?? 0}
            icon={Store}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Commerce</CardTitle>
              <CardDescription>Nom, logo, couleurs, adresse</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard/business">Modifier</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Programme {programLabel}</CardTitle>
              <CardDescription>
                {loyaltyProgram
                  ? loyaltyProgram.reward_label || 'Configurer la récompense'
                  : 'Créer votre programme fidélité'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full">
                <Link to="/dashboard/program">
                  {loyaltyProgram ? 'Modifier' : 'Créer'}
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">QR inscription</CardTitle>
              <CardDescription>À afficher en boutique pour vos clients</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" disabled={!loyaltyProgram}>
                <Link to="/dashboard/qr">
                  <QrCode className="h-4 w-4" />
                  Voir le QR code
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow border-rc-teal/30">
            <CardHeader>
              <CardTitle className="text-base">Scanner client</CardTitle>
              <CardDescription>Créditer points ou tampons en caisse</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" disabled={!loyaltyProgram}>
                <Link to="/dashboard/scan">
                  <ScanLine className="h-4 w-4" />
                  Ouvrir le scanner
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-base">Clients</CardTitle>
              <CardDescription>Liste et fiches clients inscrits</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full" disabled={!loyaltyProgram}>
                <Link to="/dashboard/customers">
                  <Users className="h-4 w-4" />
                  Voir les clients
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
