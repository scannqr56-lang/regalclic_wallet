import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IdeasSectionNav from '@/components/ai-assistant/IdeasSectionNav';
import GuidedLayout from '@/components/onboarding/GuidedLayout';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BUSINESS_TYPE_OPTIONS,
  buildProfileFormDefaults,
  fetchRestaurantProfile,
  GENEROSITY_OPTIONS,
  MAIN_OBJECTIVE_OPTIONS,
  saveEssentialRestaurantProfile,
  validateEssentialRestaurantProfilePayload,
  formToProfilePayload,
} from '@/lib/ai-restaurant-profile';

const selectClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export default function RestaurantPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { business, isLoading: businessLoading } = useMyBusiness();
  const [form, setForm] = useState({
    business_type: '',
    main_objective: '',
    generosity_level: '',
  });
  const [initialized, setInitialized] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['ai-restaurant-profile', business?.id],
    queryFn: () => fetchRestaurantProfile(business.id),
    enabled: !!business?.id,
  });

  useEffect(() => {
    if (initialized || profileQuery.isLoading) return;
    const defaults = buildProfileFormDefaults({ profile: profileQuery.data });
    setForm({
      business_type: defaults.business_type,
      main_objective: defaults.main_objective,
      generosity_level: defaults.generosity_level,
    });
    setInitialized(true);
  }, [initialized, profileQuery.data, profileQuery.isLoading]);

  const saveMutation = useMutation({
    mutationFn: () => saveEssentialRestaurantProfile(business.id, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ai-restaurant-profile', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['onboarding-progress', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-onboarding', business.id] });
      toast.success('Préférences enregistrées');
      navigate('/dashboard/ideas');
    },
    onError: (error) => {
      toast.error(error?.message || 'Enregistrement impossible');
    },
  });

  const validationError = validateEssentialRestaurantProfilePayload(
    formToProfilePayload({
      ...buildProfileFormDefaults(),
      ...form,
      preferred_rewards: ['produit_offert'],
      tone_of_voice: 'chaleureux',
    }),
  );

  if (businessLoading || profileQuery.isLoading) {
    return (
      <DashboardLayout title="Parlez-nous de votre restaurant" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Parlez-nous de votre restaurant">
        <Card>
          <CardContent className="pt-6">
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
      title="Parlez-nous de votre restaurant"
      description="Trois questions pour des idées adaptées à votre établissement"
    >
      <GuidedLayout>
        <IdeasSectionNav />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-rc-teal" />
              <CardTitle className="text-base">Vos préférences</CardTitle>
            </div>
            <CardDescription>
              Ces réponses nous aident à proposer des offres cohérentes avec votre carte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2 rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">Question 1</p>
              <Label htmlFor="business-type">Type de commerce</Label>
              <select
                id="business-type"
                className={selectClassName}
                value={form.business_type}
                onChange={(e) => setForm((prev) => ({ ...prev, business_type: e.target.value }))}
              >
                <option value="">Sélectionnez…</option>
                {BUSINESS_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">Question 2</p>
              <Label htmlFor="main-objective">Quel est votre objectif principal ?</Label>
              <select
                id="main-objective"
                className={selectClassName}
                value={form.main_objective}
                onChange={(e) => setForm((prev) => ({ ...prev, main_objective: e.target.value }))}
              >
                <option value="">Sélectionnez…</option>
                {MAIN_OBJECTIVE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-lg border bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">Question 3</p>
              <Label>Quel niveau de générosité souhaitez-vous ?</Label>
              <div className="grid gap-2 sm:grid-cols-3">
                {GENEROSITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, generosity_level: option.value }))}
                    className={cn(
                      'rounded-lg border px-3 py-3 text-left text-sm transition-colors',
                      form.generosity_level === option.value
                        ? 'border-rc-navy bg-rc-navy text-white'
                        : 'border-slate-200 bg-slate-50 hover:border-rc-navy/30',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {validationError ? (
              <p className="text-sm text-amber-800">{validationError}</p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/dashboard/ai-assistant/profile/advanced">Affinez vos préférences (optionnel)</Link>
              </Button>
              <Button
                type="button"
                disabled={Boolean(validationError) || saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Enregistrer et continuer
              </Button>
            </div>
          </CardContent>
        </Card>
      </GuidedLayout>
    </DashboardLayout>
  );
}
