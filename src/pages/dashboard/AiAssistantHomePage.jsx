import { Link, useNavigate } from 'react-router-dom';
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
import AiAssistantNav from '@/components/ai-assistant/AiAssistantNav';
import AiQuotaBanner from '@/components/ai-assistant/AiQuotaBanner';
import AiActivitySummary from '@/components/ai-assistant/AiActivitySummary';
import AiCustomerInsightsPanel from '@/components/ai-assistant/AiCustomerInsightsPanel';
import AiReadySuggestionsBanner from '@/components/ai-assistant/AiReadySuggestionsBanner';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchAiOnboardingStatus, ONBOARDING_STEPS } from '@/lib/ai-onboarding';
import { fetchAssistantQuota } from '@/lib/ai-quota';
import { fetchAiCustomerInsights } from '@/lib/ai-insights';
import { generateFullPlanSuggestions } from '@/lib/ai-suggestions';

function StepIcon({ done }) {
  if (done) return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  return <Circle className="h-5 w-5 shrink-0 text-slate-300" />;
}

export default function AiAssistantHomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();

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
        queryClient.invalidateQueries({ queryKey: ['ai-suggestion-batches', business.id] }),
        queryClient.invalidateQueries({ queryKey: ['ai-suggestions', business.id] }),
      ]);
      navigate('/dashboard/ai-assistant/suggestions');
    },
    onError: (error) => {
      toast.error(error?.message || 'Impossible de préparer les idées pour le moment');
    },
  });

  const quota = quotaQuery.data;
  const onboarding = onboardingQuery.data;
  const generationAllowed = quota?.generation?.allowed ?? false;
  const canGenerate = onboarding?.readyForFullPlan && generationAllowed;

  if (businessLoading) {
    return (
      <DashboardLayout title="Mes idées" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Suggestions pour votre carte"
      description="Des idées d’offres, de récompenses et de messages — rien n’est publié sans votre accord"
    >
      <div className="space-y-6">
        <AiAssistantNav />

        <AiReadySuggestionsBanner insights={insightsQuery.data} />

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card className="border-rc-teal/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-5 w-5 text-rc-teal" />
                Obtenir mes idées
              </CardTitle>
              <CardDescription>
                Offres, récompenses, messages Wallet et planning du mois — en une seule étape
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AiQuotaBanner quota={quota} kind="generation" />
              <AiActivitySummary businessId={business?.id} />

              <p className="text-xs text-slate-500">
                Rien n&apos;est envoyé à vos clients tant que vous n&apos;avez pas validé chaque idée.
              </p>

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
                  Complétez les étapes de progression à droite avant de continuer.
                </p>
              ) : null}

              {onboarding?.pendingSuggestions ? (
                <p className="text-sm text-slate-600">
                  {onboarding.pendingSuggestions} idée
                  {onboarding.pendingSuggestions > 1 ? 's' : ''} en attente de votre choix.
                  {' '}
                  <Link className="font-medium text-rc-teal underline" to="/dashboard/ai-assistant/suggestions">
                    Choisir mes idées
                  </Link>
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

        <details className="rounded-lg border bg-white">
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

        <AiCustomerInsightsPanel businessId={business?.id} />
      </div>
    </DashboardLayout>
  );
}
