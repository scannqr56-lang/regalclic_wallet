import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Loader2,
  Play,
  Square,
  Trash2,
  Pencil,
  Save,
  Bell,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import AiOriginBadge from '@/components/ai-assistant/AiOriginBadge';
import CampaignListCard from '@/components/campaigns/CampaignListCard';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { useDashboardNavMode } from '@/hooks/useDashboardNavMode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FormStickyFooter } from '@/components/ui/form-layout';
import { touchTextareaClassName } from '@/components/ui/form-layout';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import {
  activateCampaign,
  buildCampaignFormDefaults,
  createCampaign,
  deleteCampaign,
  endCampaign,
  fetchCampaignAiOrigins,
  fetchCampaignNotifyQuota,
  fetchCampaigns,
  getCampaignAiOriginLabel,
  notifyAllCampaign,
  notifyTestCampaign,
  updateCampaign,
  WALLET_NOTIFY_DISCLAIMER,
} from '@/lib/campaigns';

function CampaignForm({ form, onChange, onSubmit, onCancel, submitLabel, loading }) {
  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-title">Titre interne</Label>
          <Input
            id="campaign-title"
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
            placeholder="Ex. Happy hour été"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-offer-label">Libellé sur la carte (optionnel)</Label>
          <Input
            id="campaign-offer-label"
            value={form.offer_label}
            onChange={(e) => onChange({ ...form, offer_label: e.target.value })}
            placeholder="Ex. -10% aujourd'hui"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="campaign-message">Message affiché sur la carte</Label>
          <textarea
            id="campaign-message"
            className={touchTextareaClassName}
            value={form.message}
            onChange={(e) => onChange({ ...form, message: e.target.value })}
            placeholder="Ex. Profitez de -10% sur toute la carte ce midi"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="campaign-starts">Début</Label>
            <Input
              id="campaign-starts"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => onChange({ ...form, starts_at: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-ends">Fin</Label>
            <Input
              id="campaign-ends"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => onChange({ ...form, ends_at: e.target.value })}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0"
            checked={Boolean(form.notify_on_activate)}
            onChange={(e) => onChange({ ...form, notify_on_activate: e.target.checked })}
          />
          <span>
            <span className="font-medium text-amber-900">Notifier les clients à l&apos;activation</span>
            <span className="mt-1 block text-xs text-amber-800/90">
              Envoie une notification Wallet (lock screen) en plus de la mise à jour silencieuse de la carte.
              {' '}
              {WALLET_NOTIFY_DISCLAIMER}
            </span>
          </span>
        </label>
      </div>

      <FormStickyFooter>
        <ResponsiveActions className="sm:justify-end">
          <Button type="button" className="h-12 sm:h-10" disabled={loading} onClick={onSubmit}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitLabel}
          </Button>
          {onCancel ? (
            <Button type="button" variant="outline" className="h-12 sm:h-10" onClick={onCancel} disabled={loading}>
              Annuler
            </Button>
          ) : null}
        </ResponsiveActions>
      </FormStickyFooter>
    </>
  );
}

function CampaignSection({ title, description, children, defaultOpen = true }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50/50 open:bg-transparent" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-3 marker:content-none sm:px-0 sm:py-0 sm:[&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-2 sm:mb-3 sm:block">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <span className="shrink-0 text-xs font-medium text-rc-teal group-open:hidden sm:hidden">
            Afficher
          </span>
        </div>
      </summary>
      <ul className="space-y-3 border-t border-slate-200 px-2 pb-2 pt-3 sm:border-0 sm:p-0">
        {children}
      </ul>
    </details>
  );
}

export default function OffersPage() {
  const { business, isLoading, loyaltyProgram } = useMyBusiness();
  const { progress } = useOnboardingProgress(business, loyaltyProgram);
  const { isAdvancedMode } = useDashboardNavMode(progress?.onboardingComplete);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(buildCampaignFormDefaults());
  const [testMembershipId, setTestMembershipId] = useState('');

  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ['wallet-campaigns', business?.id],
    queryFn: () => fetchCampaigns(business.id),
    enabled: !!business?.id,
  });

  const { data: campaignAiOrigins = {} } = useQuery({
    queryKey: ['campaign-ai-origins', business?.id],
    queryFn: () => fetchCampaignAiOrigins(business.id),
    enabled: !!business?.id,
  });

  const activeCampaign = campaigns.find((c) => c.status === 'active');

  const { data: notifyQuota } = useQuery({
    queryKey: ['campaign-notify-quota', business?.id],
    queryFn: () => fetchCampaignNotifyQuota(business.id),
    enabled: !!business?.id,
  });

  useEffect(() => {
    if (editingId) {
      const campaign = campaigns.find((c) => c.id === editingId);
      if (campaign) setForm(buildCampaignFormDefaults(campaign));
    }
  }, [editingId, campaigns]);

  useEffect(() => {
    const draftId = searchParams.get('draft');
    if (!draftId || !campaigns.length) return;

    const campaign = campaigns.find((c) => c.id === draftId);
    if (!campaign) return;

    setEditingId(campaign.id);
    setMode('edit');
    setForm(buildCampaignFormDefaults(campaign));

    const next = new URLSearchParams(searchParams);
    next.delete('draft');
    setSearchParams(next, { replace: true });
  }, [campaigns, searchParams, setSearchParams]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['wallet-campaigns', business?.id] });
    queryClient.invalidateQueries({ queryKey: ['campaign-ai-origins', business?.id] });
    if (editingId) {
      queryClient.invalidateQueries({ queryKey: ['campaign-broadcast-stats', editingId] });
    }
  };

  const editingCampaign = editingId ? campaigns.find((c) => c.id === editingId) : null;
  const editingAiOrigin = editingId ? campaignAiOrigins[editingId] : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!business?.id) throw new Error('Commerce requis');
      if (editingId) {
        await updateCampaign(editingId, form, { status: editingCampaign?.status });
        return { kind: editingCampaign?.status === 'active' ? 'active_update' : 'draft_update' };
      }
      await createCampaign(business.id, form);
      return { kind: 'create' };
    },
    onSuccess: ({ kind }) => {
      invalidate();
      setMode('list');
      setEditingId(null);
      setForm(buildCampaignFormDefaults());
      if (kind === 'active_update') {
        toast.success('Offre mise à jour — cartes Wallet synchronisées');
      } else if (kind === 'draft_update') {
        toast.success('Campagne mise à jour');
      } else {
        toast.success('Brouillon créé');
      }
    },
    onError: (error) => toast.error(error?.message || 'Erreur'),
  });

  const activateMutation = useMutation({
    mutationFn: activateCampaign,
    onSuccess: (data) => {
      invalidate();
      toast.success(data.message || 'Votre offre est active sur les cartes Wallet de vos clients.');
    },
    onError: (error) => toast.error(error?.message || 'Activation impossible'),
  });

  const endMutation = useMutation({
    mutationFn: endCampaign,
    onSuccess: (data) => {
      invalidate();
      toast.success(data.message || 'Campagne terminée');
    },
    onError: (error) => toast.error(error?.message || 'Fin de campagne impossible'),
  });

  const notifyAllMutation = useMutation({
    mutationFn: notifyAllCampaign,
    onSuccess: (data) => {
      invalidate();
      toast.success(data.message || 'Notification envoyée');
    },
    onError: (error) => toast.error(error?.message || 'Notification impossible'),
  });

  const notifyTestMutation = useMutation({
    mutationFn: ({ campaignId, membershipId }) => notifyTestCampaign(campaignId, membershipId),
    onSuccess: (data) => {
      invalidate();
      toast.success(data.message || 'Test envoyé');
    },
    onError: (error) => toast.error(error?.message || 'Test impossible'),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ campaignId, status }) => deleteCampaign(campaignId, { status }),
    onSuccess: (data, { status }) => {
      invalidate();
      if (status === 'active') {
        toast.success(data?.message || 'Offre supprimée — cartes Wallet mises à jour');
      } else if (status === 'ended') {
        toast.success('Campagne retirée de l’historique');
      } else {
        toast.success('Brouillon supprimé');
      }
    },
    onError: (error) => toast.error(error?.message || 'Suppression impossible'),
  });

  const startEdit = (campaign) => {
    setEditingId(campaign.id);
    setMode('edit');
    setForm(buildCampaignFormDefaults(campaign));
  };

  const confirmDelete = (campaign) => {
    const labels = {
      active: 'Supprimer cette offre en cours ?\n\nL’offre sera retirée de toutes les cartes Wallet.',
      ended: 'Retirer cette campagne de l’historique ?',
      draft: 'Supprimer ce brouillon ?',
    };
    const message = labels[campaign.status] || labels.draft;
    if (!window.confirm(message)) return;
    deleteMutation.mutate({ campaignId: campaign.id, status: campaign.status });
  };

  const actionLoading = activateMutation.isPending || endMutation.isPending
    || deleteMutation.isPending || notifyAllMutation.isPending || notifyTestMutation.isPending;

  const listCampaigns = campaigns.filter((c) => c.id !== activeCampaign?.id);
  const draftCampaigns = listCampaigns.filter((c) => c.status === 'draft');
  const endedCampaigns = listCampaigns.filter((c) => c.status === 'ended');
  const otherActiveCampaigns = listCampaigns.filter((c) => c.status === 'active');

  const renderDraftActions = (campaign) => (
    <>
      <Button
        size="sm"
        className="order-first sm:order-none"
        disabled={actionLoading || Boolean(activeCampaign)
          || (campaign.notify_on_activate && notifyQuota?.blocked)}
        onClick={() => activateMutation.mutate(campaign.id)}
        title={
          activeCampaign
            ? 'Terminez la campagne active avant d’en lancer une autre'
            : (campaign.notify_on_activate && notifyQuota?.blocked
              ? 'Quota de notifications promo atteint pour aujourd’hui'
              : undefined)
        }
      >
        {activateMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Activer l&apos;offre
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={actionLoading}
        onClick={() => startEdit(campaign)}
      >
        <Pencil className="h-4 w-4" />
        Modifier
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600 hover:text-red-700"
        disabled={actionLoading}
        onClick={() => confirmDelete(campaign)}
      >
        <Trash2 className="h-4 w-4" />
        Supprimer
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <DashboardLayout title="Offres promo" description="Campagnes affichées sur les cartes Wallet">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={isAdvancedMode ? 'Offres promo' : 'Mes offres'}
      description={
        isAdvancedMode
          ? 'Publiez une offre visible sur toutes les cartes Wallet actives'
          : 'Activez les offres choisies depuis Mes idées'
      }
    >
      <div className="space-y-6 pb-4">
        {!isAdvancedMode && campaigns.length === 0 && mode === 'list' ? (
          <Card className="border-rc-teal/20 bg-rc-teal/5">
            <CardContent className="space-y-3 pt-6 text-sm text-slate-700">
              <p>
                Choisissez d&apos;abord une offre dans Mes idées — elle apparaîtra ici en brouillon à activer.
              </p>
              <Button asChild size="sm" className="w-full sm:w-auto">
                <Link to="/dashboard/ideas?tab=offers">Voir mes idées</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isAdvancedMode ? (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardContent className="flex flex-col gap-3 pt-6 text-sm text-amber-900 sm:flex-row">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium">Notifications Wallet promo</p>
                <p className="mt-1 text-xs text-amber-800/90">{WALLET_NOTIFY_DISCLAIMER}</p>
                {notifyQuota ? (
                  <p className="mt-2 text-xs font-medium text-amber-900">
                    Diffusions notifiantes aujourd&apos;hui :
                    {' '}
                    {notifyQuota.used}
                    /
                    {notifyQuota.quota}
                    {notifyQuota.blocked ? ' — limite atteinte' : ''}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

        {activeCampaign && !(mode === 'edit' && editingId === activeCampaign.id) ? (
          <div className="space-y-3">
            <ul className="m-0 list-none space-y-0 p-0">
              <CampaignListCard
              campaign={activeCampaign}
              aiOriginLabel={
                campaignAiOrigins[activeCampaign.id]
                  ? getCampaignAiOriginLabel(campaignAiOrigins[activeCampaign.id])
                  : null
              }
              featured
              actions={(
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => startEdit(activeCampaign)}
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => endMutation.mutate(activeCampaign.id)}
                  >
                    {endMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    Terminer l&apos;offre
                  </Button>
                  {isAdvancedMode ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading || notifyQuota?.blocked}
                        onClick={() => notifyAllMutation.mutate(activeCampaign.id)}
                        title={notifyQuota?.blocked ? 'Limite journalière atteinte' : undefined}
                      >
                        {notifyAllMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                        Notifier toutes les cartes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={actionLoading}
                        onClick={() => confirmDelete(activeCampaign)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Supprimer
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            />
            </ul>

            {isAdvancedMode ? (
              <details className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 px-4 py-3">
                <summary className="cursor-pointer text-xs font-medium text-emerald-900">
                  Mode avancé — test sur une carte
                </summary>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <div className="w-full flex-1 space-y-1 sm:min-w-[200px]">
                    <Label htmlFor="test-membership-id" className="text-xs text-emerald-900">
                      Identifiant fiche client
                    </Label>
                    <Input
                      id="test-membership-id"
                      value={testMembershipId}
                      onChange={(e) => setTestMembershipId(e.target.value)}
                      placeholder="UUID fiche client"
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={actionLoading || !testMembershipId.trim()}
                    onClick={() => notifyTestMutation.mutate({
                      campaignId: activeCampaign.id,
                      membershipId: testMembershipId.trim(),
                    })}
                  >
                    {notifyTestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                    Tester notification
                  </Button>
                </div>
              </details>
            ) : null}
          </div>
        ) : null}

        {mode === 'create' || mode === 'edit' ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {mode === 'edit' && editingCampaign?.status === 'active'
                  ? 'Modifier l’offre en cours'
                  : (mode === 'edit' ? 'Modifier le brouillon' : 'Nouvelle offre')}
              </CardTitle>
              <CardDescription>
                {editingCampaign?.status === 'active'
                  ? 'Les changements seront appliqués sur toutes les cartes Wallet (sans notification push).'
                  : 'Le message apparaît sur les cartes Wallet. La notification push est optionnelle (voir case à cocher).'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              {editingAiOrigin ? (
                <div className="mb-4 flex flex-col gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 sm:flex-row sm:flex-wrap sm:items-center">
                  <AiOriginBadge label={getCampaignAiOriginLabel(editingAiOrigin)} />
                  <span className="min-w-0 flex-1">
                    Brouillon issu de vos idées — vérifiez le message avant activation.
                  </span>
                  {editingAiOrigin.suggestionId ? (
                    <Link
                      className="text-xs font-medium underline"
                      to="/dashboard/ideas?tab=offers"
                    >
                      Retour aux idées
                    </Link>
                  ) : null}
                </div>
              ) : null}
              <CampaignForm
                form={form}
                onChange={setForm}
                submitLabel={
                  mode === 'edit' && editingCampaign?.status === 'active'
                    ? 'Enregistrer et mettre à jour les cartes'
                    : (mode === 'edit' ? 'Enregistrer' : 'Créer le brouillon')
                }
                loading={saveMutation.isPending}
                onSubmit={() => saveMutation.mutate()}
                onCancel={() => {
                  setMode('list');
                  setEditingId(null);
                  setForm(buildCampaignFormDefaults());
                }}
              />
            </CardContent>
          </Card>
        ) : isAdvancedMode ? (
          <Button
            className="h-12 w-full sm:h-10 sm:w-auto"
            onClick={() => {
              setMode('create');
              setEditingId(null);
              setForm(buildCampaignFormDefaults());
            }}
          >
            <Plus className="h-4 w-4" />
            Nouvelle offre
          </Button>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isAdvancedMode ? 'Historique des campagnes' : 'Vos offres'}
            </CardTitle>
            <CardDescription>
              {isAdvancedMode
                ? 'Une seule offre active à la fois. L’activation met à jour toutes les cartes installées.'
                : 'Activez un brouillon pour le rendre visible sur les cartes Wallet.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {campaignsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : listCampaigns.length === 0 && !activeCampaign ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne. Créez un brouillon puis activez-le pour diffuser l’offre.
              </p>
            ) : listCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun autre brouillon ou historique pour le moment.
              </p>
            ) : (
              <>
                {draftCampaigns.length > 0 ? (
                  <CampaignSection
                    title={isAdvancedMode ? 'Brouillons' : 'À activer'}
                    description="Prêtes à être publiées sur les cartes Wallet"
                    defaultOpen
                  >
                    {draftCampaigns.map((campaign) => (
                      <CampaignListCard
                        key={campaign.id}
                        campaign={campaign}
                        aiOriginLabel={
                          campaignAiOrigins[campaign.id]
                            ? getCampaignAiOriginLabel(campaignAiOrigins[campaign.id])
                            : null
                        }
                        showStats={false}
                        actions={renderDraftActions(campaign)}
                      />
                    ))}
                  </CampaignSection>
                ) : null}

                {otherActiveCampaigns.length > 0 ? (
                  <CampaignSection title="Autres campagnes actives" defaultOpen>
                    {otherActiveCampaigns.map((campaign) => (
                      <CampaignListCard
                        key={campaign.id}
                        campaign={campaign}
                        aiOriginLabel={
                          campaignAiOrigins[campaign.id]
                            ? getCampaignAiOriginLabel(campaignAiOrigins[campaign.id])
                            : null
                        }
                        actions={(
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => startEdit(campaign)}
                            >
                              <Pencil className="h-4 w-4" />
                              Modifier
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionLoading}
                              onClick={() => endMutation.mutate(campaign.id)}
                            >
                              Terminer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              disabled={actionLoading}
                              onClick={() => confirmDelete(campaign)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Supprimer
                            </Button>
                          </>
                        )}
                      />
                    ))}
                  </CampaignSection>
                ) : null}

                {endedCampaigns.length > 0 ? (
                  <CampaignSection
                    title="Terminées"
                    description={`${endedCampaigns.length} campagne${endedCampaigns.length > 1 ? 's' : ''}`}
                    defaultOpen={endedCampaigns.length <= 3}
                  >
                    {endedCampaigns.map((campaign) => (
                      <CampaignListCard
                        key={campaign.id}
                        campaign={campaign}
                        aiOriginLabel={
                          campaignAiOrigins[campaign.id]
                            ? getCampaignAiOriginLabel(campaignAiOrigins[campaign.id])
                            : null
                        }
                        actions={(
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700"
                            disabled={actionLoading}
                            onClick={() => confirmDelete(campaign)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </Button>
                        )}
                      />
                    ))}
                  </CampaignSection>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
