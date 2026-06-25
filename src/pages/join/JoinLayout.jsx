import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, Gift, Stamp } from 'lucide-react';
import { fetchBusinessPublicBySlug } from '@/lib/join';
import { Skeleton } from '@/components/ui/skeleton';

export default function JoinLayout({ children }) {
  const { businessSlug } = useParams();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['business-public', businessSlug],
    queryFn: () => fetchBusinessPublicBySlug(businessSlug),
    enabled: !!businessSlug,
  });

  const business = data?.business;
  const program = data?.loyalty_program;
  const primaryColor = business?.primary_color || '#0B1E3F';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-md space-y-4 pt-8">
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-rc-navy">Commerce introuvable</h1>
          <p className="mt-2 text-muted-foreground">
            Ce lien d&apos;inscription n&apos;est pas valide ou le commerce n&apos;est plus actif.
          </p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-rc-navy">{business.name}</h1>
          <p className="mt-2 text-muted-foreground">
            Le programme de fidélité n&apos;est pas encore configuré. Revenez plus tard.
          </p>
        </div>
      </div>
    );
  }

  const programSummary = program.type === 'stamps'
    ? `${program.stamps_required} tampons = ${program.reward_label}`
    : `${program.reward_threshold ?? 100} points = ${program.reward_label}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header
        className="px-4 py-8 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          {business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="mb-4 h-20 w-20 rounded-2xl border-2 border-white/20 object-cover shadow-lg"
            />
          ) : (
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold">
              {business.name.charAt(0)}
            </div>
          )}
          <p className="text-sm font-medium text-white/80">Carte de fidélité</p>
          <h1 className="mt-1 text-2xl font-bold">{business.name}</h1>
          {(business.address || business.city) && (
            <p className="mt-1 text-sm text-white/70">
              {[business.address, business.city].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 -mt-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rc-teal/15 text-rc-teal">
              {program.type === 'stamps' ? (
                <Stamp className="h-5 w-5" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="font-medium text-rc-navy">
                {program.type === 'stamps' ? 'Programme à tampons' : 'Programme à points'}
              </p>
              <p className="text-sm text-muted-foreground">{programSummary}</p>
              {program.type === 'points' && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {program.points_per_euro} point{program.points_per_euro > 1 ? 's' : ''} par euro dépensé
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rc-orange/10 px-3 py-2 text-sm text-rc-navy">
            <Gift className="h-4 w-4 text-rc-orange shrink-0" />
            <span>Récompense : <strong>{program.reward_label}</strong></span>
          </div>
        </div>

        <div className="mt-6 pb-8">{children}</div>

        <p className="pb-8 text-center text-xs text-muted-foreground">
          Propulsé par{' '}
          <Link to="/auth" className="underline hover:text-rc-navy">
            RegalClic
          </Link>
        </p>
      </div>
    </div>
  );
}
