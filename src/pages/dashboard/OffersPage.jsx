import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Megaphone,
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
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  activateCampaign,
  buildCampaignFormDefaults,
  CAMPAIGN_STATUS_LABELS,
  createCampaign,
  deleteCampaign,
  endCampaign,
  fetchCampaignAiOrigins,
  fetchCampaignBroadcastStats,
  fetchCampaignNotifyQuota,
  fetchCampaigns,
  formatCampaignDates,
  getCampaignAiOriginLabel,
  notifyAllCampaign,
  notifyTestCampaign,
  updateCampaign,
  WALLET_NOTIFY_DISCLAIMER,
} from '@/lib/campaigns';

const textareaClassName =
  'flex min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-800',
    ended: 'bg-slate-200 text-slate-600',
  };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status] || styles.draft)}>
      {CAMPAIGN_STATUS_LABELS[status] || status}
    </span>
  );
}

function CampaignForm({ form, onChange, onSubmit, onCancel, submitLabel, loading }) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
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
          className={textareaClassName}
          value={form.message}
          onChange={(e) => onChange({ ...form, message: e.target.value })}
          placeholder="Ex. Profitez de -10% sur toute la carte ce midi"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
          className="mt-1"
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CampaignStats({ campaignId }) {
  const { data, isLoading } = useQuery({
    queryKey: ['campaign-broadcast-stats', campaignId],
    queryFn: () => fetchCampaignBroadcastStats(campaignId),
    enabled: Boolean(campaignId),
  });

  if (isLoading) return <p className="text-xs text-muted-foreground">Chargement des stats…</p>;
  if (!data?.total) {
    return <p className="text-xs text-muted-foreground">Aucune carte synchronisée pour l’instant.</p>;
  }

  return (
    <p className="text-xs text-muted-foreground">
      Diffusion :
      {' '}
      {data.total}
      {' '}
      carte(s) —
      Google
      {' '}
      {data.google_ok}
      ,
      {' '}
      Apple
      {' '}
      {data.apple_ok}
      {data.notified ? ' — avec notification' : ''}
      {data.failed > 0 ? ` — ${data.failed} échec(s)` : ''}
    </p>
  );
}

export default function OffersPage() {
  const { business, isLoading } = useMyBusiness();
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
      toast.success(data.message || 'Campagne activée');
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

  if (isLoading) {
    return (
      <DashboardLayout title="Offres promo" description="Campagnes affichées sur les cartes Wallet">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Offres promo"
      description="Publiez une offre visible sur toutes les cartes Wallet actives"
    >
      <div className="space-y-6">
        <Card className="border-amber-200 bg-amber-50/40">
          <CardContent className="flex gap-3 pt-6 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Notifications Wallet promo</p>
              <p className="mt-1 text-xs text-amber-800/90">{WALLET_NOTIFY_DISCLAIMER}</p>
              {notifyQuota ? (
                <p className="mt-2 text-xs font-medium text-amber-900">
                  Quota aujourd&apos;hui :
                  {' '}
                  {notifyQuota.used}
                  /
                  {notifyQuota.quota}
                  {' '}
                  diffusion(s) notifiante(s)
                  {notifyQuota.blocked ? ' — quota atteint' : ''}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {activeCampaign && !(mode === 'edit' && editingId === activeCampaign.id) ? (
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-emerald-900">
                <Megaphone className="h-4 w-4" />
                Campagne en cours
              </CardTitle>
              <CardDescription className="text-emerald-800/80">
                {activeCampaign.title}
                {' — '}
                {formatCampaignDates(activeCampaign)}
              </CardDescription>
              {campaignAiOrigins[activeCampaign.id] ? (
                <AiOriginBadge label={getCampaignAiOriginLabel(campaignAiOrigins[activeCampaign.id])} />
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-emerald-900">{activeCampaign.message}</p>
              {activeCampaign.notify_on_activate ? (
                <p className="text-xs text-emerald-800">Notification à l&apos;activation activée</p>
              ) : null}
              <CampaignStats campaignId={activeCampaign.id} />
              <div className="flex flex-wrap gap-2">
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
                  disabled={actionLoading || notifyQuota?.blocked}
                  onClick={() => notifyAllMutation.mutate(activeCampaign.id)}
                  title={notifyQuota?.blocked ? 'Quota journalier atteint' : undefined}
                >
                  {notifyAllMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  Notifier toutes les cartes
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
                Terminer la campagne
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
              </div>
              <div className="flex flex-wrap items-end gap-2 border-t border-emerald-200/60 pt-3">
                <div className="min-w-[200px] flex-1 space-y-1">
                  <Label htmlFor="test-membership-id" className="text-xs text-emerald-900">
                    Test sur 1 carte (ID membership)
                  </Label>
                  <Input
                    id="test-membership-id"
                    value={testMembershipId}
                    onChange={(e) => setTestMembershipId(e.target.value)}
                    placeholder="UUID fiche client"
                    className="h-9 bg-white text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
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
            </CardContent>
          </Card>
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
            <CardContent>
              {editingAiOrigin ? (
                <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">
                  <AiOriginBadge label={getCampaignAiOriginLabel(editingAiOrigin)} />
                  <span>
                    Brouillon issu de l&apos;assistant IA — vérifiez le message avant activation.
                  </span>
                  {editingAiOrigin.suggestionId ? (
                    <Link
                      className="text-xs font-medium underline"
                      to="/dashboard/ai-assistant/suggestions"
                    >
                      Retour validation
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
        ) : (
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setMode('create');
                setEditingId(null);
                setForm(buildCampaignFormDefaults());
              }}
            >
              <Plus className="h-4 w-4" />
              Nouvelle offre
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historique des campagnes</CardTitle>
            <CardDescription>
              Une seule campagne active à la fois. L’activation met à jour toutes les cartes installées.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : campaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune campagne. Créez un brouillon puis activez-le pour diffuser l’offre.
              </p>
            ) : (
              <ul className="space-y-3">
                {campaigns.map((campaign) => (
                  <li
                    key={campaign.id}
                    className="rounded-lg border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{campaign.title}</p>
                          <StatusBadge status={campaign.status} />
                          {campaignAiOrigins[campaign.id] ? (
                            <AiOriginBadge label={getCampaignAiOriginLabel(campaignAiOrigins[campaign.id])} />
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">{campaign.message}</p>
                        <p className="text-xs text-muted-foreground">{formatCampaignDates(campaign)}</p>
                        {campaign.status !== 'draft' ? (
                          <CampaignStats campaignId={campaign.id} />
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {campaign.status === 'draft' ? (
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
                              Activer
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              disabled={actionLoading}
                              onClick={() => confirmDelete(campaign)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                        {campaign.status === 'active' && campaign.id !== activeCampaign?.id ? (
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
                            </Button>
                          </>
                        ) : null}
                        {campaign.status === 'ended' ? (
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
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
