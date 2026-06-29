import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiAssistantNav from '@/components/ai-assistant/AiAssistantNav';
import SuggestionCard from '@/components/ai-assistant/SuggestionCard';
import AiQuotaBanner from '@/components/ai-assistant/AiQuotaBanner';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchSuggestionBatches,
  fetchSuggestions,
  generateRewardSuggestions,
  updateSuggestionStatus,
} from '@/lib/ai-suggestions';
import { fetchAssistantQuota } from '@/lib/ai-quota';
import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile } from '@/lib/ai-restaurant-profile';

export default function AiAssistantRewardsPage() {
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();
  const queryClient = useQueryClient();
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const quotaQuery = useQuery({
    queryKey: ['ai-assistant-quota', business?.id],
    queryFn: () => fetchAssistantQuota(business.id),
    enabled: !!business?.id,
  });

  const menusQuery = useQuery({
    queryKey: ['ai-menu-uploads', business?.id],
    queryFn: () => fetchMenuUploads(business.id),
    enabled: !!business?.id,
  });

  const profileQuery = useQuery({
    queryKey: ['ai-restaurant-profile', business?.id],
    queryFn: () => fetchRestaurantProfile(business.id),
    enabled: !!business?.id,
  });

  const batchesQuery = useQuery({
    queryKey: ['ai-suggestion-batches', business?.id],
    queryFn: () => fetchSuggestionBatches(business.id),
    enabled: !!business?.id,
  });

  useEffect(() => {
    if (activeBatchId || !batchesQuery.data?.length) return;
    const latestRewardsBatch = batchesQuery.data.find(
      (batch) => batch.type === 'rewards_only' && batch.status === 'completed',
    );
    if (latestRewardsBatch) setActiveBatchId(latestRewardsBatch.id);
  }, [activeBatchId, batchesQuery.data]);

  const suggestionsQuery = useQuery({
    queryKey: ['ai-reward-suggestions', business?.id, activeBatchId],
    queryFn: () =>
      fetchSuggestions(business.id, {
        batchId: activeBatchId || undefined,
        types: ['reward', 'threshold'],
      }),
    enabled: !!business?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const extractedMenu = menusQuery.data?.find((row) => row.status === 'extracted');
      return generateRewardSuggestions(business.id, extractedMenu?.id);
    },
    onSuccess: async (result) => {
      if (result.batch?.id) setActiveBatchId(result.batch.id);
      await queryClient.invalidateQueries({ queryKey: ['ai-reward-suggestions', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-assistant-quota', business.id] });
      toast.success('Récompenses prêtes — choisissez-les dans Mes idées');
    },
    onError: (error) => {
      toast.error(error?.message || 'Génération impossible');
    },
  });

  const handleStatus = async (suggestion, status) => {
    setActionId(suggestion.id);
    try {
      await updateSuggestionStatus(suggestion.id, status);
      await queryClient.invalidateQueries({ queryKey: ['ai-reward-suggestions', business?.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business?.id] });
      toast.success(status === 'accepted' ? 'Suggestion retenue' : 'Suggestion ignorée');
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Récompenses IA" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Récompenses IA">
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

  const extractedMenus = (menusQuery.data ?? []).filter((row) => row.status === 'extracted');
  const hasProfile = Boolean(profileQuery.data);
  const canGenerate = extractedMenus.length > 0 && hasProfile;
  const quota = quotaQuery.data;
  const generationAllowed = quota?.assistant_enabled && quota?.generation?.allowed;
  const suggestions = suggestionsQuery.data ?? [];
  const rewards = suggestions.filter((s) => s.suggestion_type === 'reward');
  const thresholds = suggestions.filter((s) => s.suggestion_type === 'threshold');

  return (
    <DashboardLayout
      title="Idées de récompenses"
      description="Propositions basées sur votre menu — à choisir avant activation"
    >
      <div className="space-y-6">
        <AiAssistantNav />

        <Card>
          <CardHeader>
            <CardTitle>Générer des récompenses</CardTitle>
            <CardDescription>
              Des récompenses et seuils adaptés à votre carte — choisissez ensuite ceux à activer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canGenerate ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Prérequis manquants</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {!extractedMenus.length ? (
                    <li>
                      <Link className="underline" to="/dashboard/menu">
                        Menu extrait
                      </Link>
                    </li>
                  ) : null}
                  {!hasProfile ? (
                    <li>
                      <Link className="underline" to="/dashboard/restaurant">
                        Questionnaire profil
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            <AiQuotaBanner quota={quota} kind="generation" />

            <Button
              type="button"
              disabled={!canGenerate || !generationAllowed || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Générer les récompenses
            </Button>
          </CardContent>
        </Card>

        {generateMutation.isPending ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération en cours (jusqu&apos;à 2 min)…
            </CardContent>
          </Card>
        ) : null}

        {suggestionsQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Aucune suggestion pour l&apos;instant. Lancez une génération ci-dessus.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {rewards.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Récompenses proposées ({rewards.length})
                </h2>
                <div className="grid gap-4">
                  {rewards.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      mode="simple"
                      loading={actionId === suggestion.id}
                      onDiscard={(item) => handleStatus(item, 'discarded')}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {thresholds.length > 0 ? (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Options de seuil ({thresholds.length})
                </h2>
                <div className="grid gap-4">
                  {thresholds.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      mode="simple"
                      loading={actionId === suggestion.id}
                      onDiscard={(item) => handleStatus(item, 'discarded')}
                    />
                  ))}
                </div>
              </section>
            ) : null}

            <Button asChild>
              <Link to="/dashboard/ideas?tab=offers">Choisir mes idées →</Link>
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
