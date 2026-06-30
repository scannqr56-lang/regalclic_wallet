import { Users, Sparkles, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

function StatCard({ label, value, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rc-navy/10 text-rc-navy">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SimpleStatsRow({ stats, loyaltyProgram, loading }) {
  if (loading) return null;

  const customersCount = stats?.customers_count ?? 0;
  if (customersCount === 0) return null;

  const distributedLabel = loyaltyProgram?.type === 'stamps'
    ? 'Tampons distribués'
    : 'Points distribués';
  const distributedValue = loyaltyProgram?.type === 'stamps'
    ? stats?.total_stamps_distributed ?? 0
    : stats?.total_points_distributed ?? 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Clients inscrits" value={customersCount} icon={Users} />
      <StatCard label={distributedLabel} value={distributedValue} icon={Sparkles} />
      <StatCard label="Récompenses en attente" value={stats?.rewards_pending ?? 0} icon={Store} />
    </div>
  );
}
