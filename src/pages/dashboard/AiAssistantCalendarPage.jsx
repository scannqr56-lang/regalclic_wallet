import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Copy, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiAssistantNav from '@/components/ai-assistant/AiAssistantNav';
import CalendarItemCard from '@/components/ai-assistant/CalendarItemCard';
import AiQuotaBanner from '@/components/ai-assistant/AiQuotaBanner';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { WALLET_NOTIFY_DISCLAIMER } from '@/lib/campaigns';
import {
  fetchCalendarItems,
  filterItemsByWeek,
  formatCalendarForCopy,
  generateCalendarSuggestions,
  getCalendarStartDate,
  getCalendarWeekRanges,
  updateCalendarItemStatus,
} from '@/lib/ai-calendar';
import { fetchSuggestionBatches } from '@/lib/ai-suggestions';
import { fetchAssistantQuota } from '@/lib/ai-quota';
import { fetchMenuUploads } from '@/lib/ai-assistant';
import { fetchRestaurantProfile } from '@/lib/ai-restaurant-profile';

export default function AiAssistantCalendarPage() {
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();
  const queryClient = useQueryClient();
  const [activeBatchId, setActiveBatchId] = useState(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0);
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
      (batch) => batch.type === 'calendar_only' && batch.status === 'completed',
    );
    if (latestBatch) setActiveBatchId(latestBatch.id);
  }, [activeBatchId, batchesQuery.data]);

  const calendarQuery = useQuery({
    queryKey: ['ai-calendar-items', business?.id, activeBatchId],
    queryFn: () =>
      fetchCalendarItems(business.id, {
        batchId: activeBatchId || undefined,
      }),
    enabled: !!business?.id,
  });

  const generateMutation = useMutation({
    mutationFn: () => {
      const extractedMenu = menusQuery.data?.find((row) => row.status === 'extracted');
      return generateCalendarSuggestions(business.id, extractedMenu?.id);
    },
    onSuccess: async (result) => {
      if (result.batch?.id) setActiveBatchId(result.batch.id);
      setSelectedWeekIndex(0);
      await queryClient.invalidateQueries({ queryKey: ['ai-calendar-items', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-suggestion-batches', business.id] });
      await queryClient.invalidateQueries({ queryKey: ['ai-assistant-quota', business.id] });
      toast.success('Planning du mois généré — choisissez les entrées à activer');
    },
    onError: (error) => {
      toast.error(error?.message || 'Génération impossible');
    },
  });

  const allItems = calendarQuery.data ?? [];
  const startDate = useMemo(() => getCalendarStartDate(allItems), [allItems]);
  const weekRanges = useMemo(() => getCalendarWeekRanges(startDate), [startDate]);
  const selectedWeek = weekRanges[selectedWeekIndex];
  const weekItems = useMemo(() => {
    if (!selectedWeek) return allItems;
    return filterItemsByWeek(allItems, selectedWeek.weekStart, selectedWeek.weekEnd);
  }, [allItems, selectedWeek]);

  const handleStatus = async (item, status) => {
    setActionId(item.id);
    try {
      await updateCalendarItemStatus(item.id, status);
      await queryClient.invalidateQueries({ queryKey: ['ai-calendar-items', business?.id] });
      toast.success(
        status === 'ready' ? 'Entrée marquée à programmer' : 'Entrée ignorée',
      );
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  const handleCopyItem = async (item) => {
    const text = formatCalendarForCopy([item]);
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Entrée copiée');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleCopyWeek = async () => {
    if (!weekItems.length) return;
    try {
      await navigator.clipboard.writeText(formatCalendarForCopy(weekItems));
      toast.success('Semaine copiée dans le presse-papiers');
    } catch {
      toast.error('Copie impossible');
    }
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Planning du mois" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Planning du mois">
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

  return (
    <DashboardLayout
      title="Planning du mois"
      description="Idées d’actions sur 30 jours — aucun envoi automatique"
    >
      <div className="space-y-6">
        <AiAssistantNav />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-rc-teal" />
              <CardTitle>Générer le calendrier 30 jours</CardTitle>
            </div>
            <CardDescription>
              Une idée par jour pour vos campagnes — rien n’est publié sans votre accord.
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
              Générer le calendrier
            </Button>

            <p className="text-xs text-slate-500">
              Aucun envoi automatique. {WALLET_NOTIFY_DISCLAIMER}
            </p>
          </CardContent>
        </Card>

        {generateMutation.isPending ? (
          <Card>
            <CardContent className="flex items-center gap-3 py-8 text-sm text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" />
              Génération en cours (jusqu&apos;à 3 min)…
            </CardContent>
          </Card>
        ) : null}

        {calendarQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : allItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Aucun calendrier pour l&apos;instant. Lancez une génération ci-dessus.
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Planning ({allItems.length} jours)
              </h2>
              {weekItems.length > 0 ? (
                <Button type="button" size="sm" variant="outline" onClick={handleCopyWeek}>
                  <Copy className="h-4 w-4" />
                  Copier la semaine
                </Button>
              ) : null}
            </div>

            {weekRanges.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {weekRanges.map((week) => (
                  <Button
                    key={week.index}
                    type="button"
                    size="sm"
                    variant={selectedWeekIndex === week.index ? 'default' : 'outline'}
                    onClick={() => setSelectedWeekIndex(week.index)}
                  >
                    {week.label}
                    <span className="ml-1 text-xs opacity-80">({week.dateRangeLabel})</span>
                  </Button>
                ))}
              </div>
            ) : null}

            {weekItems.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center text-sm text-slate-500">
                  Aucune entrée pour cette semaine.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {weekItems.map((item) => (
                  <CalendarItemCard
                    key={item.id}
                    item={item}
                    loading={actionId === item.id}
                    onScheduleLater={(row) => handleStatus(row, 'ready')}
                    onIgnore={(row) => handleStatus(row, 'ignored')}
                    onCopy={handleCopyItem}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
