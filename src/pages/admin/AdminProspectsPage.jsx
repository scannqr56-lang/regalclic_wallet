import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Search, Target } from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import ProspectListCard from '@/components/prospects/ProspectListCard';
import { ProspectInterestBadge, ProspectStatusBadge } from '@/components/prospects/ProspectBadges';
import { fetchAdminProspects, quickUpdateProspectStatus } from '@/lib/admin-prospects';
import {
  BUSINESS_TYPE_OPTIONS,
  getBusinessTypeLabel,
  PROSPECT_INTEREST_OPTIONS,
  PROSPECT_STATUS_OPTIONS,
} from '@/lib/sales-prospect-constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { touchSelectClassName } from '@/components/ui/form-layout';
import { Skeleton } from '@/components/ui/skeleton';

function StatCard({ label, value, accent }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`mt-1 text-2xl font-bold ${accent || 'text-rc-navy'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value));
}

export default function AdminProspectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [interestLevel, setInterestLevel] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [city, setCity] = useState('');
  const [commercialCode, setCommercialCode] = useState('');

  const filters = useMemo(() => ({
    search: search.trim() || undefined,
    status: status || undefined,
    interest_level: interestLevel || undefined,
    business_type: businessType || undefined,
    city: city.trim() || undefined,
    commercial_code: commercialCode.trim() || undefined,
    limit: 50,
  }), [search, status, interestLevel, businessType, city, commercialCode]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-prospects', filters],
    queryFn: () => fetchAdminProspects(filters),
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, nextStatus }) => quickUpdateProspectStatus(id, nextStatus),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast.success('Statut mis à jour');
    },
    onError: (err) => toast.error(err?.message || 'Erreur'),
  });

  const prospects = data?.prospects ?? [];
  const stats = data?.stats ?? { total: 0, hot: 0, to_follow_up: 0, demo_requested: 0, signed: 0 };

  return (
    <AdminLayout
      title="Prospects commerciaux"
      description="Suivi des commerces approchés par l'équipe terrain."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/merchants">Marchands</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <a href="/prospect-form" target="_blank" rel="noreferrer">Ouvrir le formulaire commercial</a>
        </Button>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total prospects" value={stats.total} />
        <StatCard label="Chauds" value={stats.hot} accent="text-rc-orange" />
        <StatCard label="À relancer" value={stats.to_follow_up} accent="text-amber-600" />
        <StatCard label="Démos demandées" value={stats.demo_requested} accent="text-rc-teal" />
        <StatCard label="Signés" value={stats.signed} accent="text-emerald-600" />
      </div>

      <div className="mb-4 space-y-3 rounded-xl border bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher commerce, ville, contact, commercial…"
            className="h-11 pl-9"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={touchSelectClassName}>
            <option value="">Tous les statuts</option>
            {PROSPECT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={interestLevel} onChange={(e) => setInterestLevel(e.target.value)} className={touchSelectClassName}>
            <option value="">Tous les intérêts</option>
            {PROSPECT_INTEREST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={touchSelectClassName}>
            <option value="">Tous les types</option>
            {BUSINESS_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville" className="h-11" />
          <Input value={commercialCode} onChange={(e) => setCommercialCode(e.target.value)} placeholder="Code commercial" className="h-11" />
        </div>
      </div>

      {isLoading ? <Skeleton className="h-64 w-full" /> : null}
      {error ? <p className="text-sm text-red-600">{error.message}</p> : null}

      {!isLoading && !error && prospects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Aucun prospect pour ces filtres.</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && prospects.length > 0 ? (
        <>
          <ul className="space-y-3 lg:hidden">
            {prospects.map((p) => <ProspectListCard key={p.id} prospect={p} />)}
          </ul>

          <Card className="hidden lg:block">
            <CardContent className="overflow-x-auto p-0">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Commerce</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Ville</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">Commercial</th>
                    <th className="px-3 py-2">Intérêt</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Relance</th>
                    <th className="px-3 py-2">Créé</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p) => (
                    <tr key={p.id} className="border-t hover:bg-slate-50/80">
                      <td className="px-3 py-2 font-medium">
                        <Link to={`/admin/prospects/${p.id}`} className="text-rc-navy hover:underline">
                          {p.business_name}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{getBusinessTypeLabel(p.business_type)}</td>
                      <td className="px-3 py-2">{p.city}</td>
                      <td className="px-3 py-2">
                        <div className="max-w-[140px] truncate">{p.contact_name || '—'}</div>
                        <div className="text-xs text-slate-500">{p.phone_mobile || p.email || '—'}</div>
                      </td>
                      <td className="px-3 py-2">{p.commercial_code || p.commercial_name || '—'}</td>
                      <td className="px-3 py-2"><ProspectInterestBadge level={p.interest_level} /></td>
                      <td className="px-3 py-2"><ProspectStatusBadge status={p.status} /></td>
                      <td className="px-3 py-2">{formatDate(p.follow_up_date)}</td>
                      <td className="px-3 py-2">{formatDate(p.created_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/admin/prospects/${p.id}`}>Voir</Link>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => quickStatusMutation.mutate({ id: p.id, nextStatus: 'to_follow_up' })}
                          >
                            Relancer
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </AdminLayout>
  );
}
