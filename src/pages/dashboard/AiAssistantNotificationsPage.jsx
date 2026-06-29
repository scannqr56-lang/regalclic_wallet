import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SuggestionCard from '@/components/ai-assistant/SuggestionCard';
import AiQuotaBanner from '@/components/ai-assistant/AiQuotaBanner';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WALLET_NOTIFY_DISCLAIMER } from '@/lib/campaigns';
import {
  fetchSuggestionBatches,
  fetchSuggestions,
  generateNotificationSuggestions,
  updateSuggestionStatus,
} from '@/lib/ai-suggestions';
import { fetchAssistantQuota } from '@/lib/ai-quota';
import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile } from '@/lib/ai-restaurant-profile';

export default function AiAssistantNotificationsPage() {
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
    const latestBatch = batchesQuery.data.find(
      (batch) => batch.type === 'notifications_only' && batch.status === 'completed',
    );
    if (latestBatch) setActiveBatchId(latestBatch.id);
  }, [activeBatchId, batchesQuery.data]);

  const suggestionsQuery = useQuery({
    queryKey: ['ai-notification-suggestions', business?.id, activeBatchId],
    queryFn: () =>
      fetchSuggestions(business.id, {
        batchId: activeBatchId || undefined,
        types: ['notification'],
      }),
    enabled: !!business?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const extractedMenu = menusQuery.data?.find((row) => row.status === 'extracted');
      return generateNotificationSuggestions(business.id, extractedMenu?.id);
    },
    onSuccess: async (result) => {
      if (result.batch?.id) setActiveBatchId(result.batch.id);
      await queryClient.invalidateQueries({ queryKey: ['ai-notification-suggestions', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-suggestion-batches', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-assistant-quota', business.id] });
      toast.success('Notifications générées — validez avant une campagne Wallet');
    },
    onError: (error) => {
      toast.error(error?.message || 'Génération impossible');
    },
  });

  const handleStatus = async (suggestion, status) => {
    setActionId(suggestion.id);
    try {
      await updateSuggestionStatus(suggestion.id, status);
      await queryClient.invalidateQueries({ queryKey: ['ai-notification-suggestions', business?.id] });
      toast.success(status === 'accepted' ? 'Notification retenue' : 'Notification ignorée');
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Notifications IA" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Notifications IA">
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
  const generationAllowed = quota?.assistant_enabled && quota?.generation?.allowed;
  const notifications = suggestionsQuery.data ?? [];

  return (
    <DashboardLayout
      title="Assistant IA — Notifications Wallet"
      description="Messages courts pour mettre à jour les cartes Wallet (promo uniquement)"
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
            <Link to="/dashboard/ai-assistant/offers">Offres promo</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/calendar">Calendrier</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-rc-teal" />
              <CardTitle>Générer des notifications</CardTitle>
            </div>
            <CardDescription>
              L&apos;IA propose 10 messages courts — titre ≤ 40 car., corps ≤ 120 car., alignés sur votre ton.
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
              Générer les notifications
            </Button>

            <p className="text-xs text-slate-500">
              Notifications promo uniquement — les scans fidélité restent silencieux. {WALLET_NOTIFY_DISCLAIMER}
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
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Aucune notification pour l&apos;instant. Lancez une génération ci-dessus.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Notifications proposées ({notifications.length})
            </h2>
            <div className="grid gap-4">
              {notifications.map((suggestion) => (
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
