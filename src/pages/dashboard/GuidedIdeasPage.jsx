import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  CheckCircle2,
  Circle,
  History,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import IdeasSectionNav from '@/components/ai-assistant/IdeasSectionNav';
import GuidedLayout from '@/components/onboarding/GuidedLayout';
import AiQuotaBanner from '@/components/ai-assistant/AiQuotaBanner';
import AiReadySuggestionsBanner from '@/components/ai-assistant/AiReadySuggestionsBanner';
import SuggestionCard from '@/components/ai-assistant/SuggestionCard';
import SuggestionEditModal from '@/components/ai-assistant/SuggestionEditModal';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { useSuggestionActions } from '@/hooks/useSuggestionActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { fetchAiOnboardingStatus, ONBOARDING_STEPS } from '@/lib/ai-onboarding';
import { fetchAssistantQuota } from '@/lib/ai-quota';
import { fetchAiCustomerInsights } from '@/lib/ai-insights';
import { fetchSuggestions, generateFullPlanSuggestions } from '@/lib/ai-suggestions';
import { supabase } from '@/lib/supabase';

const TABS = [
  { id: 'offers', label: 'Offres', types: ['offer'] },
  { id: 'rewards', label: 'Récompenses', types: ['reward', 'threshold'] },
  { id: 'messages', label: 'Messages', types: ['notification'] },
];

function StepIcon({ done }) {
  if (done) return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  return <Circle className="h-5 w-5 shrink-0 text-slate-300" />;
}

function filterByTab(suggestions, tabId, showAll) {
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  return suggestions.filter((item) => {
    if (!tab.types.includes(item.suggestion_type)) return false;
    if (showAll) return item.status !== 'discarded';
    return item.status === 'pending';
  });
}

export default function GuidedIdeasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();

  const activeTab = searchParams.get('tab') || 'offers';
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  const quotaQuery = useQuery({
    queryKey: ['ai-assistant-quota', business?.id],
    queryFn: () => fetchAssistantQuota(business.id),
    enabled: !!business?.id,
  });

  const onboardingQuery = useQuery({
    queryKey: ['ai-onboarding', business?.id, loyaltyProgram?.id],
    queryFn: () => fetchAiOnboardingStatus({
      businessId: business.id,
      loyaltyProgram,
    }),
    enabled: !!business?.id,
  });

  const suggestionsQuery = useQuery({
    queryKey: ['ai-all-suggestions', business?.id],
    queryFn: () => fetchSuggestions(business.id),
    enabled: !!business?.id,
  });

  const suggestions = suggestionsQuery.data ?? [];
  const hasIdeas = suggestions.length > 0;

  const rewardQuery = useQuery({
    queryKey: ['reward', business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('business_id', business.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id,
  });

  const {
    actionId,
    modalOpen,
    modalMode,
    activeSuggestion,
    activeCalendarItem,
    editForm,
    setEditForm,
    applyMutation,
    openModalForSuggestion,
    openModalForCalendar,
    closeModal,
    handleDiscard,
    handleCopy,
    handleModalSubmit,
  } = useSuggestionActions({
    businessId: business?.id,
    loyaltyProgram,
    reward: rewardQuery.data,
  });

  const insightsQuery = useQuery({
    queryKey: ['ai-customer-insights', business?.id],
    queryFn: () => fetchAiCustomerInsights(business.id),
    enabled: !!business?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateFullPlanSuggestions(
      business.id,
      onboardingQuery.data?.extractedMenuId,
    ),
    onSuccess: async () => {
      toast.success('Vos idées sont prêtes — choisissez celles à activer');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ai-assistant-quota', business.id] }),
        queryClient.invalidateQueries({ queryKey: ['ai-onboarding', business.id] }),
        queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business.id] }),
        queryClient.invalidateQueries({ queryKey: ['onboarding-progress', business.id] }),
      ]);
      navigate('/dashboard/ideas?tab=offers');
    },
    onError: (error) => {
      toast.error(error?.message || 'Nous n’avons pas pu préparer les idées pour le moment. Réessayez dans quelques instants ou contactez le support RegalClic.');
    },
  });

  const quota = quotaQuery.data;
  const onboarding = onboardingQuery.data;
  const generationAllowed = quota?.generation?.allowed ?? false;
  const canGenerate = onboarding?.readyForFullPlan && generationAllowed;

  const tabSuggestions = useMemo(
    () => filterByTab(suggestions, activeTab, showAllStatuses),
    [suggestions, activeTab, showAllStatuses],
  );

  const setTab = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Mes idées" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Mes idées">
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
      title="Suggestions pour votre carte"
      description="Des idées d’offres, de récompenses et de messages — rien n’est publié sans votre accord"
    >
      <GuidedLayout>
        <IdeasSectionNav />

        <AiReadySuggestionsBanner insights={insightsQuery.data} />

        {!hasIdeas ? (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="border-rc-teal/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-rc-teal" />
                  Obtenir mes idées
                </CardTitle>
                <CardDescription>
                  Nous préparons des idées d’offres, de récompenses et de messages pour vos clients.
                  Cela prend environ 2 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <AiQuotaBanner quota={quota} kind="generation" />

                <Button
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={!canGenerate || generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Préparation en cours (2–4 min)…
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Obtenir mes idées
                    </>
                  )}
                </Button>

                {!onboarding?.readyForFullPlan ? (
                  <p className="text-sm text-amber-800">
                    Ajoutez votre menu et parlez-nous de votre restaurant avant de continuer.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Votre progression</CardTitle>
                <CardDescription>
                  {onboarding
                    ? `${onboarding.completedCount} / ${onboarding.totalSteps} étapes`
                    : 'Chargement…'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {onboardingQuery.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : (
                  ONBOARDING_STEPS.map((step) => {
                    const done = onboarding?.steps?.[step.id];
                    return (
                      <Link
                        key={step.id}
                        to={step.href}
                        className="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-slate-50"
                      >
                        <StepIcon done={done} />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{step.title}</p>
                          <p className="text-xs text-slate-500">{step.description}</p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Voici des idées basées sur votre carte. Choisissez celles que vous souhaitez proposer à vos clients.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {TABS.map((tab) => {
                  const count = filterByTab(suggestions, tab.id, false).length;
                  return (
                    <Button
                      key={tab.id}
                      type="button"
                      size="sm"
                      variant={activeTab === tab.id ? 'default' : 'outline'}
                      onClick={() => setTab(tab.id)}
                    >
                      {tab.label}
                      {count > 0 ? ` (${count})` : ''}
                    </Button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAllStatuses((prev) => !prev)}
                >
                  {showAllStatuses ? 'À choisir seulement' : 'Voir toutes'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!canGenerate || generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Regénérer'
                  )}
                </Button>
              </div>
            </div>

            {suggestionsQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : tabSuggestions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-slate-500">
                  {showAllStatuses
                    ? 'Aucune idée dans cette catégorie.'
                    : 'Toutes les idées de cette catégorie ont été traitées.'}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tabSuggestions.map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    mode="hub"
                    loading={actionId === suggestion.id}
                    onUse={(item) => openModalForSuggestion(item, 'use')}
                    onEdit={(item) => openModalForSuggestion(item, 'edit')}
                    onDiscard={handleDiscard}
                    onCopy={handleCopy}
                  />
                ))}
              </div>
            )}

          </>
        )}

        <details className={cn('rounded-lg border bg-white', !hasIdeas && 'hidden')}>
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
            Options avancées — générer une seule catégorie
          </summary>
          <div className="flex flex-wrap gap-2 border-t px-4 pb-4 pt-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/ai-assistant/rewards">Récompenses seules</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/ai-assistant/offers">Offres seules</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/ai-assistant/notifications">Messages seuls</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/ai-assistant/calendar">Planning du mois</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/dashboard/ai-assistant/history">
                <History className="mr-1.5 h-3.5 w-3.5" />
                Historique
              </Link>
            </Button>
          </div>
        </details>
      </GuidedLayout>

      <SuggestionEditModal
        open={modalOpen}
        suggestion={activeSuggestion}
        calendarItem={activeCalendarItem}
        form={editForm}
        onChange={setEditForm}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        loading={applyMutation.isPending || Boolean(actionId)}
        submitLabel={modalMode === 'edit' ? 'Enregistrer' : 'Choisir cette idée'}
      />
    </DashboardLayout>
  );
}
