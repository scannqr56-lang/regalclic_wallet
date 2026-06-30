import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IdeasSectionNav from '@/components/ai-assistant/IdeasSectionNav';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormStickyFooter, touchSelectClassName, touchTextareaClassName } from '@/components/ui/form-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BUSINESS_TYPE_OPTIONS,
  buildProfileFormDefaults,
  fetchRestaurantProfile,
  formToProfilePayload,
  GENEROSITY_OPTIONS,
  getLoyaltyProgramSummary,
  MAIN_OBJECTIVE_OPTIONS,
  MARGIN_SENSITIVITY_OPTIONS,
  PREFERRED_REWARD_OPTIONS,
  QUIET_DAY_OPTIONS,
  saveRestaurantProfile,
  TONE_OPTIONS,
  toggleArrayValue,
  validateRestaurantProfilePayload,
} from '@/lib/ai-restaurant-profile';

function ChipGroup({ options, value, onChange, disabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(toggleArrayValue(value, option.value))}
            className={cn(
              'min-h-10 rounded-full border px-3 py-2 text-sm transition-colors sm:min-h-0 sm:py-1.5',
              active
                ? 'border-rc-navy bg-rc-navy text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:border-rc-navy/30',
              disabled && 'opacity-60',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function QuestionBlock({ number, title, description, children }) {
  return (
    <div className="space-y-3 rounded-lg border bg-white p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">
          Question {number}
        </p>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

export default function AiAssistantProfilePage() {
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(buildProfileFormDefaults());
  const [initialized, setInitialized] = useState(false);
  const [dirty, setDirty] = useState(false);
  const autoSaveTimer = useRef(null);

  const profileQuery = useQuery({
    queryKey: ['ai-restaurant-profile', business?.id],
    queryFn: () => fetchRestaurantProfile(business.id),
    enabled: !!business?.id,
  });

  useEffect(() => {
    if (initialized || profileQuery.isLoading) return;
    setForm(buildProfileFormDefaults({
      profile: profileQuery.data,
      loyaltyProgram,
    }));
    setInitialized(true);
  }, [initialized, profileQuery.data, profileQuery.isLoading, loyaltyProgram]);

  const saveMutation = useMutation({
    mutationFn: () => saveRestaurantProfile(business.id, form),
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ['ai-restaurant-profile', business.id] });
      toast.success('Profil enregistré');
    },
    onError: (error) => {
      toast.error(error?.message || 'Enregistrement impossible');
    },
  });

  const updateForm = (patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setDirty(true);
  };

  useEffect(() => {
    if (!dirty || !business?.id || saveMutation.isPending) return undefined;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(() => {
      const payload = formToProfilePayload(form);
      const validationError = validateRestaurantProfilePayload(payload);
      if (!validationError) {
        saveMutation.mutate();
      }
    }, 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [form, dirty, business?.id, saveMutation.isPending]);

  const loyaltySummary = getLoyaltyProgramSummary(loyaltyProgram);

  if (businessLoading || profileQuery.isLoading) {
    return (
      <DashboardLayout title="Profil commerce" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Profil commerce">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">Configurez d&apos;abord votre commerce.</p>
            <Button asChild className="mt-4">
              <Link to="/dashboard/business">Configurer mon commerce</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Préférences détaillées"
      description="Affinez vos idées — optionnel après les 3 questions essentielles"
    >
      <div className="space-y-6">
        <IdeasSectionNav />

        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4 text-sm text-slate-700">
            <p>Les questions essentielles sont sur la page Mon restaurant.</p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/restaurant">Retour — 3 questions</Link>
            </Button>
          </CardContent>
        </Card>

        {loyaltySummary ? (
          <Card className="border-rc-teal/30 bg-rc-teal/5">
            <CardContent className="pt-4 text-sm text-slate-700">
              <strong>Programme actuel :</strong> {loyaltySummary}
              {' — '}
              <Link to="/dashboard/program" className="text-rc-navy underline">
                Modifier le programme
              </Link>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-rc-teal" />
              <CardTitle>Questions complémentaires</CardTitle>
            </div>
            <CardDescription>
              Jours creux, produits à mettre en avant, ton de communication… pour affiner vos idées.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <QuestionBlock
              number={1}
              title="Quels sont vos jours / heures creuses ?"
              description="Jours calmes et plage horaire (ex. 14h-18h)"
            >
              <ChipGroup
                options={QUIET_DAY_OPTIONS}
                value={form.quiet_days}
                onChange={(quiet_days) => updateForm({ quiet_days })}
              />
              <Input
                value={form.quiet_hours}
                placeholder="Ex. mardi-mercredi 14h-18h"
                onChange={(e) => updateForm({ quiet_hours: e.target.value })}
              />
            </QuestionBlock>

            <QuestionBlock
              number={2}
              title="Quels produits voulez-vous pousser ?"
              description="Un produit par ligne"
            >
              <textarea
                className={touchTextareaClassName}
                value={form.products_to_push_text}
                placeholder={'Ex. Menu midi\nPizza signature\nDessert maison'}
                onChange={(e) => updateForm({ products_to_push_text: e.target.value })}
              />
            </QuestionBlock>

            <QuestionBlock
              number={3}
              title="Quelles récompenses êtes-vous prêt à offrir ?"
            >
              <ChipGroup
                options={PREFERRED_REWARD_OPTIONS}
                value={form.preferred_rewards}
                onChange={(preferred_rewards) => updateForm({ preferred_rewards })}
              />
            </QuestionBlock>

            <QuestionBlock
              number={4}
              title="Quel est votre ticket moyen ?"
              description="En euros — optionnel mais utile pour calibrer les offres"
            >
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex. 18.50"
                value={form.average_ticket}
                onChange={(e) => updateForm({ average_ticket: e.target.value })}
              />
            </QuestionBlock>

            <QuestionBlock
              number={5}
              title="Quel ton voulez-vous utiliser ?"
            >
              <div className="flex flex-wrap gap-2">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm({ tone_of_voice: option.value })}
                    className={cn(
                      'min-h-10 rounded-full border px-3 py-2 text-sm transition-colors sm:min-h-0 sm:py-1.5',
                      form.tone_of_voice === option.value
                        ? 'border-rc-navy bg-rc-navy text-white'
                        : 'border-slate-200 bg-white hover:border-rc-navy/30',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </QuestionBlock>

            <QuestionBlock
              number={6}
              title="Y a-t-il des offres à éviter ?"
              description="Ex. pas de -50%, pas de happy hour le week-end…"
            >
              <textarea
                className={touchTextareaClassName}
                value={form.offers_to_avoid}
                placeholder="Décrivez les limites ou offres que vous ne voulez pas proposer"
                onChange={(e) => updateForm({ offers_to_avoid: e.target.value })}
              />
            </QuestionBlock>

            <div className="space-y-2 rounded-lg border bg-slate-50 p-4">
              <Label>Sensibilité aux coûts (optionnel)</Label>
              <select
                className={touchSelectClassName}
                value={form.margin_sensitivity}
                onChange={(e) => updateForm({ margin_sensitivity: e.target.value })}
              >
                <option value="">Non précisé</option>
                {MARGIN_SENSITIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <textarea
                className={touchTextareaClassName}
                value={form.notes}
                placeholder="Notes libres (optionnel)"
                onChange={(e) => updateForm({ notes: e.target.value })}
              />
            </div>

            <FormStickyFooter>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-xs text-slate-500 sm:text-left">
                  {dirty ? 'Modifications non enregistrées' : 'Profil à jour'}
                  {saveMutation.isPending ? ' · Enregistrement…' : ''}
                </p>
                <Button
                  type="button"
                  className="h-12 w-full sm:h-10 sm:w-auto"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </FormStickyFooter>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
