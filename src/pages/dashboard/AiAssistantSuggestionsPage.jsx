import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Filter, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import SuggestionCard from '@/components/ai-assistant/SuggestionCard';
import SuggestionEditModal from '@/components/ai-assistant/SuggestionEditModal';
import CalendarItemCard from '@/components/ai-assistant/CalendarItemCard';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  applyCalendarItemToCampaign,
  applyProgramSuggestion,
  applySuggestionToCampaign,
  buildCalendarCampaignForm,
  buildSuggestionEditForm,
  filterSuggestions,
  formatSuggestionForCopy,
  sortSuggestionsByMarginRisk,
  updateSuggestionFields,
} from '@/lib/ai-apply-suggestion';
import { fetchCalendarItems, updateCalendarItemStatus } from '@/lib/ai-calendar';
import {
  fetchSuggestions,
  updateSuggestionStatus,
} from '@/lib/ai-suggestions';
import { supabase } from '@/lib/supabase';

const TYPE_FILTERS = [
  { value: 'all', label: 'Tous les types' },
  { value: 'reward', label: 'Récompenses' },
  { value: 'threshold', label: 'Seuils' },
  { value: 'offer', label: 'Offres' },
  { value: 'notification', label: 'Notifications' },
];

const STATUS_FILTERS = [
  { value: 'pending', label: 'À valider' },
  { value: 'accepted', label: 'Acceptées' },
  { value: 'applied', label: 'Appliquées' },
  { value: 'all', label: 'Toutes' },
];

const MARGIN_FILTERS = [
  { value: 'all', label: 'Tous risques' },
  { value: 'high', label: 'Marge élevée' },
  { value: 'medium', label: 'Marge moyenne' },
  { value: 'low', label: 'Marge faible' },
];

export default function AiAssistantSuggestionsPage() {
  const navigate = useNavigate();
  const { business, loyaltyProgram, isLoading: businessLoading } = useMyBusiness();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [marginFilter, setMarginFilter] = useState('all');
  const [sortDirection, setSortDirection] = useState('high_first');
  const [actionId, setActionId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('use');
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [activeCalendarItem, setActiveCalendarItem] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const suggestionsQuery = useQuery({
    queryKey: ['ai-all-suggestions', business?.id],
    queryFn: () => fetchSuggestions(business.id),
    enabled: !!business?.id,
  });

  const calendarQuery = useQuery({
    queryKey: ['ai-calendar-hub-items', business?.id],
    queryFn: () => fetchCalendarItems(business.id),
    enabled: !!business?.id,
  });

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

  const applyMutation = useMutation({
    mutationFn: async ({ suggestion, form, calendarItem }) => {
      if (calendarItem) {
        return applyCalendarItemToCampaign(business.id, calendarItem, form);
      }

      if (suggestion.suggestion_type === 'offer' || suggestion.suggestion_type === 'notification') {
        return applySuggestionToCampaign(business.id, suggestion, form);
      }

      if (suggestion.suggestion_type === 'reward' || suggestion.suggestion_type === 'threshold') {
        return applyProgramSuggestion({
          businessId: business.id,
          loyaltyProgram,
          reward: rewardQuery.data,
          suggestion,
          formOverrides: form,
        });
      }

      throw new Error('Type de suggestion non pris en charge');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['ai-calendar-hub-items', business?.id] });
      queryClient.invalidateQueries({ queryKey: ['campaign-ai-origins', business?.id] });
      setModalOpen(false);
      setActiveSuggestion(null);
      setActiveCalendarItem(null);
      setEditForm(null);

      if (result.redirectPath?.includes('/dashboard/offers')) {
        toast.success('Brouillon campagne créé — activez-le manuellement quand vous êtes prêt', {
          action: {
            label: 'Ouvrir',
            onClick: () => navigate(result.redirectPath),
          },
        });
      } else if (result.redirectPath === '/dashboard/program') {
        queryClient.invalidateQueries({ queryKey: ['reward', business?.id] });
        queryClient.invalidateQueries({ queryKey: ['my-business'] });
        toast.success('Programme fidélité mis à jour depuis la suggestion IA', {
          action: {
            label: 'Voir le programme',
            onClick: () => navigate('/dashboard/program'),
          },
        });
      } else if (result.redirectPath) {
        toast.success('Suggestion appliquée', {
          action: {
            label: 'Ouvrir',
            onClick: () => navigate(result.redirectPath),
          },
        });
        navigate(result.redirectPath);
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Application impossible');
    },
    onSettled: () => setActionId(null),
  });

  const filteredSuggestions = useMemo(() => {
    const filtered = filterSuggestions(suggestionsQuery.data ?? [], {
      type: typeFilter,
      status: statusFilter,
      marginRisk: marginFilter,
    });
    return sortSuggestionsByMarginRisk(filtered, sortDirection);
  }, [suggestionsQuery.data, typeFilter, statusFilter, marginFilter, sortDirection]);

  const calendarItems = useMemo(() => {
    const items = (calendarQuery.data ?? []).filter(
      (item) => item.status === 'draft' || item.status === 'ready',
    );
    if (statusFilter === 'applied') return items.filter((item) => item.wallet_campaign_id);
    if (statusFilter === 'pending') return items.filter((item) => item.status === 'draft');
    if (statusFilter === 'accepted') return items.filter((item) => item.status === 'ready');
    return items;
  }, [calendarQuery.data, statusFilter]);

  const openModalForSuggestion = (suggestion, mode) => {
    setActiveCalendarItem(null);
    setActiveSuggestion(suggestion);
    setModalMode(mode);
    setEditForm(buildSuggestionEditForm(suggestion));
    setModalOpen(true);
  };

  const openModalForCalendar = (item) => {
    setActiveSuggestion(null);
    setActiveCalendarItem(item);
    setModalMode('use');
    setEditForm(buildCalendarCampaignForm(item));
    setModalOpen(true);
  };

  const handleDiscard = async (suggestion) => {
    setActionId(suggestion.id);
    try {
      await updateSuggestionStatus(suggestion.id, 'discarded');
      await queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business?.id] });
      toast.success('Suggestion ignorée');
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  const handleCopy = async (suggestion) => {
    try {
      await navigator.clipboard.writeText(formatSuggestionForCopy(suggestion));
      toast.success('Suggestion copiée');
    } catch {
      toast.error('Copie impossible');
    }
  };

  const handleModalSubmit = async () => {
    if (modalMode === 'edit' && activeSuggestion) {
      setActionId(activeSuggestion.id);
      try {
        const patch = {
          status: 'modified',
          title: editForm.title?.trim() || activeSuggestion.title,
          description: editForm.description?.trim() || activeSuggestion.description,
        };

        if (activeSuggestion.suggestion_type === 'offer' || activeSuggestion.suggestion_type === 'notification') {
          patch.customer_message = editForm.message?.trim() || activeSuggestion.customer_message;
          patch.description = editForm.offer_label?.trim() || activeSuggestion.description;
          if (activeSuggestion.suggestion_type === 'notification') {
            patch.wallet_notification_title = editForm.title?.trim() || activeSuggestion.wallet_notification_title;
            patch.wallet_notification_body = editForm.message?.trim() || activeSuggestion.wallet_notification_body;
          }
        }

        if (activeSuggestion.suggestion_type === 'threshold') {
          patch.recommended_threshold = Number(editForm.recommended_threshold) || activeSuggestion.recommended_threshold;
          patch.description = editForm.description?.trim() || activeSuggestion.description;
        }

        await updateSuggestionFields(activeSuggestion.id, patch);
        await queryClient.invalidateQueries({ queryKey: ['ai-all-suggestions', business?.id] });
        toast.success('Suggestion modifiée');
        setModalOpen(false);
      } catch (error) {
        toast.error(error?.message || 'Modification impossible');
      } finally {
        setActionId(null);
      }
      return;
    }

    setActionId(activeSuggestion?.id || activeCalendarItem?.id);
    applyMutation.mutate({
      suggestion: activeSuggestion,
      calendarItem: activeCalendarItem,
      form: editForm,
    });
  };

  if (businessLoading) {
    return (
      <DashboardLayout title="Validation IA" description="Chargement…">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Validation IA">
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

  const grouped = TYPE_FILTERS.filter((f) => f.value !== 'all').map((filter) => ({
    ...filter,
    items: filteredSuggestions.filter((item) => item.suggestion_type === filter.value),
  })).filter((group) => group.items.length > 0);

  const showGrouped = typeFilter === 'all' && grouped.length > 0;

  return (
    <DashboardLayout
      title="Assistant IA — Validation"
      description="Hub de décision : utilisez, modifiez ou ignorez chaque suggestion"
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 text-sm">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/rewards">Récompenses</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/ai-assistant/offers">Offres promo</Link>
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
              <Filter className="h-5 w-5 text-rc-teal" />
              <CardTitle>Filtres</CardTitle>
            </div>
            <CardDescription>
              Triez par risque marge et filtrez par type ou statut.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {TYPE_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={typeFilter === filter.value ? 'default' : 'outline'}
                  onClick={() => setTypeFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {MARGIN_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={marginFilter === filter.value ? 'default' : 'outline'}
                  onClick={() => setMarginFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSortDirection((prev) => (
                  prev === 'high_first' ? 'low_first' : 'high_first'
                ))}
              >
                Tri marge : {sortDirection === 'high_first' ? 'élevée d’abord' : 'faible d’abord'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {suggestionsQuery.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : filteredSuggestions.length === 0 && calendarItems.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 py-8 text-center text-sm text-slate-500">
              <p>Aucune suggestion pour ces filtres.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/ai-assistant/rewards">Générer des récompenses</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/dashboard/ai-assistant/offers">Générer des offres</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {showGrouped ? (
              grouped.map((group) => (
                <section key={group.value} className="space-y-3">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {group.label} ({group.items.length})
                  </h2>
                  <div className="grid gap-4">
                    {group.items.map((suggestion) => (
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
                </section>
              ))
            ) : (
              <section className="space-y-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Suggestions ({filteredSuggestions.length})
                </h2>
                <div className="grid gap-4">
                  {filteredSuggestions.map((suggestion) => (
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
              </section>
            )}

            {calendarItems.length > 0 && (typeFilter === 'all' || typeFilter === 'offer') ? (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-rc-teal" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Calendrier marketing ({calendarItems.length})
                  </h2>
                </div>
                <div className="grid gap-4">
                  {calendarItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <CalendarItemCard
                        item={item}
                        mode="hub"
                        loading={actionId === item.id}
                      />
                      {item.status === 'draft' ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionId === item.id}
                            onClick={() => openModalForCalendar(item)}
                          >
                            <Sparkles className="h-4 w-4" />
                            Utiliser
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={actionId === item.id}
                            onClick={async () => {
                              setActionId(item.id);
                              try {
                                await updateCalendarItemStatus(item.id, 'ignored');
                                await queryClient.invalidateQueries({ queryKey: ['ai-calendar-hub-items'] });
                                toast.success('Entrée ignorée');
                              } catch (error) {
                                toast.error(error?.message || 'Action impossible');
                              } finally {
                                setActionId(null);
                              }
                            }}
                          >
                            Ignorer
                          </Button>
                        </div>
                      ) : null}
                      {item.wallet_campaign_id ? (
                        <Button type="button" size="sm" variant="outline" asChild>
                          <Link to={`/dashboard/offers?draft=${item.wallet_campaign_id}`}>
                            Voir le brouillon campagne
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <SuggestionEditModal
        open={modalOpen}
        suggestion={activeSuggestion}
        calendarItem={activeCalendarItem}
        form={editForm}
        onChange={setEditForm}
        onClose={() => {
          if (applyMutation.isPending) return;
          setModalOpen(false);
          setActiveSuggestion(null);
          setActiveCalendarItem(null);
          setEditForm(null);
        }}
        onSubmit={handleModalSubmit}
        loading={applyMutation.isPending || Boolean(actionId)}
        submitLabel={modalMode === 'edit' ? 'Enregistrer' : 'Utiliser'}
      />
    </DashboardLayout>
  );
}
