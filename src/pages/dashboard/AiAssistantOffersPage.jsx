import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Megaphone, Sparkles, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SuggestionCard from '@/components/ai-assistant/SuggestionCard';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WALLET_NOTIFY_DISCLAIMER } from '@/lib/campaigns';
import {
  fetchGenerationQuota,
  fetchSuggestionBatches,
  fetchSuggestions,
  generateOfferSuggestions,
  updateSuggestionStatus,
} from '@/lib/ai-suggestions';
import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile } from '@/lib/ai-restaurant-profile';

export default function AiAssistantOffersPage() {
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();
  const queryClient = useQueryClient();
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const quotaQuery = useQuery({
    queryKey: ['ai-generation-quota', business?.id],
    queryFn: () => fetchGenerationQuota(business.id),
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
    const latestOffersBatch = batchesQuery.data.find(
      (batch) => batch.type === 'offers_only' && batch.status === 'completed',
    );
    if (latestOffersBatch) setActiveBatchId(latestOffersBatch.id);
  }, [activeBatchId, batchesQuery.data]);

  const suggestionsQuery = useQuery({
    queryKey: ['ai-offer-suggestions', business?.id, activeBatchId],
    queryFn: () =>
      fetchSuggestions(business.id, {
        batchId: activeBatchId || undefined,
        types: ['offer'],
      }),
    enabled: !!business?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const extractedMenu = menusQuery.data?.find((row) => row.status === 'extracted');
      return generateOfferSuggestions(business.id, extractedMenu?.id);
    },
    onSuccess: async (result) => {
      if (result.batch?.id) setActiveBatchId(result.batch.id);
      await queryClient.invalidateQueries({ queryKey: ['ai-offer-suggestions', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-suggestion-batches', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-generation-quota', business.id] });
      toast.success('Offres générées — validez avant de créer une campagne');
    },
    onError: (error) => {
      toast.error(error?.message || 'Génération impossible');
    },
  });

  const handleStatus = async (suggestion, status) => {
    setActionId(suggestion.id);
    try {
      await updateSuggestionStatus(suggestion.id, status);
      await queryClient.invalidateQueries({ queryKey: ['ai-offer-suggestions', business?.id] });
      toast.success(status === 'accepted' ? 'Offre retenue' : 'Offre ignorée');
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Offres IA" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Offres IA">
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
  const hasProgram = Boolean(loyaltyProgram);
  const canGenerate = extractedMenus.length > 0 && hasProfile && hasProgram;
  const quota = quotaQuery.data;
  const offers = suggestionsQuery.data ?? [];

  return (
    <DashboardLayout
      title="Assistant IA — Offres promo"
      description="Suggestions d'offres promotionnelles pour vos cartes Wallet"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/upload">Menu</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/profile">Profil</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/suggestions">Validation</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/rewards">Récompenses</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/notifications">Notifications</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/calendar">Calendrier</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-rc-teal" />
              <CardTitle>Générer des offres</CardTitle>
            </div>
            <CardDescription>
              L&apos;IA propose 5 offres contextualisées — compatibles avec un brouillon campagne Wallet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canGenerate ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p className="font-medium">Prérequis manquants</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {!extractedMenus.length ? (
                    <li>
                      <Link className="underline" to="/dashboard/ai-assistant/upload">
                        Menu extrait
                      </Link>
                    </li>
                  ) : null}
                  {!hasProfile ? (
                    <li>
                      <Link className="underline" to="/dashboard/ai-assistant/profile">
                        Questionnaire profil
                      </Link>
                    </li>
                  ) : null}
                  {!hasProgram ? (
                    <li>
                      <Link className="underline" to="/dashboard/program">
                        Programme fidélité
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}

            {quota && !quota.allowed ? (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{quota.reason}</p>
              </div>
            ) : null}

            {quota?.allowed ? (
              <p className="text-xs text-slate-500">
                Quota : {quota.monthly_used} / {quota.monthly_limit} génération(s) ce mois-ci
              </p>
            ) : null}

            <Button
              type="button"
              disabled={!canGenerate || !quota?.allowed || generateMutation.isPending}
              onClick={() => generateMutation.mutate()}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Générer les offres
            </Button>

            <p className="text-xs text-slate-500">
              Aucune promesse de chiffre d&apos;affaires. Les offres restent des suggestions à valider
              selon vos marges. {WALLET_NOTIFY_DISCLAIMER}
            </p>
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
        ) : offers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Aucune offre pour l&apos;instant. Lancez une génération ci-dessus.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Offres proposées ({offers.length})
            </h2>
            <div className="grid gap-4">
              {offers.map((suggestion) => (
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
        )}
      </div>
    </DashboardLayout>
  );
}
