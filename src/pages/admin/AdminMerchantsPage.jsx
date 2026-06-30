import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Check,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createMerchantAccount,
  deleteMerchantAccount,
  disableMerchantAccount,
  enableMerchantAccount,
  fetchAdminMerchants,
  updateMerchantAccount,
} from '@/lib/admin-merchants';
import AdminAiUsagePanel from '@/components/admin/AdminAiUsagePanel';
import ResponsiveModal from '@/components/ui/responsive-modal';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import { touchSelectClassName, touchTextareaClassName } from '@/components/ui/form-layout';

const AI_PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter (1 essai IA)' },
  { value: 'pro_ia', label: 'Pro IA (5 gen. / 2 uploads / mois)' },
  { value: 'business', label: 'Business (20 gen. / 10 uploads / mois)' },
];

function AiPlanBadge({ business }) {
  if (!business?.plan) return null;
  const option = AI_PLAN_OPTIONS.find((row) => row.value === business.plan);
  const styles = {
    starter: 'bg-slate-100 text-slate-700',
    pro_ia: 'bg-violet-100 text-violet-800',
    business: 'bg-indigo-100 text-indigo-800',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[business.plan] || styles.starter}`}>
      {option?.label.split(' (')[0] || business.plan}
      {business.plan === 'starter' && business.ai_trial_used ? ' · essai consommé' : ''}
    </span>
  );
}

function StatusBadge({ merchant }) {
  if (merchant.is_disabled) {
    return <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Désactivé</span>;
  }
  if (merchant.business) {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">Commerce configuré</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">En attente de configuration</span>;
}

function CreateMerchantForm({ onCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [notes, setNotes] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createMerchantAccount({
      email,
      password,
      displayName,
      notes,
    }),
    onSuccess: (result) => {
      toast.success('Commerçant créé — communiquez les identifiants au client');
      onCreated?.(result);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setNotes('');
    },
    onError: (error) => toast.error(error?.message || 'Création impossible'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-rc-teal" />
          Nouveau commerçant
        </CardTitle>
        <CardDescription>
          Créez un compte login/mot de passe. Le commerçant complètera ensuite son commerce dans l&apos;app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="merchant-email">Email de connexion</Label>
            <Input
              id="merchant-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-password">Mot de passe initial</Label>
            <Input
              id="merchant-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="merchant-display">Nom affiché (optionnel)</Label>
            <Input
              id="merchant-display"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex. Restaurant Le Central"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="merchant-notes">Notes internes</Label>
            <textarea
              id="merchant-notes"
              className={touchTextareaClassName}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contact, pack souscrit, etc."
            />
          </div>
          <div className="md:col-span-2">
            <ResponsiveActions>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Créer le compte
              </Button>
            </ResponsiveActions>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MerchantEditModal({ merchant, open, onClose, onSaved }) {
  const [displayName, setDisplayName] = useState(merchant.display_name || '');
  const [notes, setNotes] = useState(merchant.notes || '');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState(merchant.business?.name || '');
  const [businessSlug, setBusinessSlug] = useState(merchant.business?.slug || '');
  const [businessPhone, setBusinessPhone] = useState(merchant.business?.phone || '');
  const [businessCity, setBusinessCity] = useState(merchant.business?.city || '');
  const [businessPlan, setBusinessPlan] = useState(merchant.business?.plan || 'starter');
  const [resetAiTrial, setResetAiTrial] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => updateMerchantAccount({
      userId: merchant.user_id,
      displayName,
      notes,
      password: password || undefined,
      business: merchant.business ? {
        id: merchant.business.id,
        name: businessName,
        slug: businessSlug,
        phone: businessPhone || null,
        city: businessCity || null,
        plan: businessPlan,
        ai_trial_used: resetAiTrial ? false : merchant.business.ai_trial_used,
      } : undefined,
    }),
    onSuccess: (result) => {
      toast.success('Commerçant mis à jour');
      onSaved?.(result.merchant);
      onClose?.();
    },
    onError: (error) => toast.error(error?.message || 'Mise à jour impossible'),
  });

  return (
    <ResponsiveModal
      open={open}
      onClose={onClose}
      title={`Modifier ${merchant.email}`}
      description="Compte commerçant et paramètres du commerce associé."
      footer={(
        <ResponsiveActions className="sm:justify-end">
          <Button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Enregistrer
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
        </ResponsiveActions>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-display-name">Nom affiché</Label>
            <Input
              id="edit-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-password">Nouveau mot de passe (optionnel)</Label>
            <Input
              id="edit-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Laisser vide pour ne pas changer"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-notes">Notes internes</Label>
          <textarea
            id="edit-notes"
            className={touchTextareaClassName}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {merchant.business ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium text-slate-900">Commerce</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-business-name">Nom</Label>
                <Input
                  id="edit-business-name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-business-slug">Slug</Label>
                <Input
                  id="edit-business-slug"
                  value={businessSlug}
                  onChange={(e) => setBusinessSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-business-phone">Téléphone</Label>
                <Input
                  id="edit-business-phone"
                  type="tel"
                  inputMode="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-business-city">Ville</Label>
                <Input
                  id="edit-business-city"
                  value={businessCity}
                  onChange={(e) => setBusinessCity(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-business-plan">Plan Assistant IA</Label>
                <select
                  id="edit-business-plan"
                  className={touchSelectClassName}
                  value={businessPlan}
                  onChange={(e) => setBusinessPlan(e.target.value)}
                >
                  {AI_PLAN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              {merchant.business.plan === 'starter' && merchant.business.ai_trial_used ? (
                <label className="flex items-start gap-3 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0"
                    checked={resetAiTrial}
                    onChange={(e) => setResetAiTrial(e.target.checked)}
                  />
                  Réinitialiser l&apos;essai IA gratuit
                </label>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Le commerce n&apos;a pas encore été configuré par le restaurateur.
          </p>
        )}
      </div>
    </ResponsiveModal>
  );
}

export default function AdminMerchantsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [lastCredentials, setLastCredentials] = useState(null);
  const [actionId, setActionId] = useState(null);

  const merchantsQuery = useQuery({
    queryKey: ['admin-merchants'],
    queryFn: fetchAdminMerchants,
  });

  const filteredMerchants = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return merchantsQuery.data ?? [];
    return (merchantsQuery.data ?? []).filter((merchant) => {
      const haystack = [
        merchant.email,
        merchant.display_name,
        merchant.business?.name,
        merchant.business?.slug,
        merchant.business?.city,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [merchantsQuery.data, search]);

  const editingMerchant = filteredMerchants.find((m) => m.user_id === editingId)
    || (merchantsQuery.data ?? []).find((m) => m.user_id === editingId);

  const handleToggle = async (merchant) => {
    setActionId(merchant.user_id);
    try {
      if (merchant.is_disabled) {
        await enableMerchantAccount(merchant.user_id);
        toast.success('Compte réactivé');
      } else {
        const reason = window.prompt('Raison de la désactivation (optionnel)') || '';
        await disableMerchantAccount(merchant.user_id, reason);
        toast.success('Compte désactivé');
      }
      await queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    } catch (error) {
      toast.error(error?.message || 'Action impossible');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (merchant) => {
    const label = merchant.business?.name || merchant.email;
    if (!window.confirm(`Supprimer définitivement « ${label} » ?\n\nCette action supprime le commerce et le compte.`)) {
      return;
    }
    setActionId(merchant.user_id);
    try {
      await deleteMerchantAccount(merchant.user_id);
      toast.success('Commerçant supprimé');
      if (editingId === merchant.user_id) setEditingId(null);
      await queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
    } catch (error) {
      toast.error(error?.message || 'Suppression impossible');
    } finally {
      setActionId(null);
    }
  };

  return (
    <AdminLayout
      title="Gestion des commerçants"
      description="Créez les comptes restaurateur et gérez leurs accès."
    >
      <div className="space-y-6">
        <AdminAiUsagePanel />

        <CreateMerchantForm
          onCreated={(result) => {
            setLastCredentials(result.credentials);
            queryClient.invalidateQueries({ queryKey: ['admin-merchants'] });
          }}
        />

        {lastCredentials ? (
          <Card className="border-emerald-200 bg-emerald-50/60">
            <CardContent className="space-y-2 pt-6 text-sm text-emerald-900">
              <p className="font-medium">Identifiants à transmettre au commerçant</p>
              <p>Email : <strong>{lastCredentials.email}</strong></p>
              <p>Mot de passe : <strong>{lastCredentials.password}</strong></p>
              <p className="text-xs text-emerald-800">
                Le commerçant pourra se connecter et configurer son commerce sur /dashboard/business.
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Commerçants ({filteredMerchants.length})</CardTitle>
              <CardDescription>Liste de tous les comptes provisionnés.</CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Input
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 w-full sm:w-48"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full sm:w-auto"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-merchants'] })}
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {merchantsQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : filteredMerchants.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun commerçant pour l&apos;instant.</p>
            ) : (
              <ul className="space-y-3">
                {filteredMerchants.map((merchant) => (
                  <li key={merchant.user_id} className="rounded-xl border bg-white p-4">
                    <div className="flex flex-col gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all font-medium text-slate-900">{merchant.email}</p>
                          <StatusBadge merchant={merchant} />
                          {merchant.business ? <AiPlanBadge business={merchant.business} /> : null}
                        </div>
                        {merchant.display_name ? (
                          <p className="text-sm text-slate-600">{merchant.display_name}</p>
                        ) : null}
                        {merchant.business ? (
                          <p className="text-sm text-slate-600">
                            {merchant.business.name}
                            {' · '}
                            /join/{merchant.business.slug}
                            {merchant.business.city ? ` · ${merchant.business.city}` : ''}
                          </p>
                        ) : (
                          <p className="text-sm text-amber-700">Commerce non configuré</p>
                        )}
                        {merchant.notes ? (
                          <p className="text-xs text-slate-500">Note : {merchant.notes}</p>
                        ) : null}
                      </div>
                      <ResponsiveActions className="border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === merchant.user_id}
                          onClick={() => setEditingId(merchant.user_id)}
                        >
                          <Pencil className="h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={actionId === merchant.user_id}
                          onClick={() => handleToggle(merchant)}
                        >
                          {merchant.is_disabled ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Ban className="h-4 w-4" />
                          )}
                          {merchant.is_disabled ? 'Réactiver' : 'Désactiver'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          disabled={actionId === merchant.user_id}
                          onClick={() => handleDelete(merchant)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </ResponsiveActions>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {editingMerchant ? (
          <MerchantEditModal
            key={editingMerchant.user_id}
            merchant={editingMerchant}
            open={Boolean(editingMerchant)}
            onClose={() => setEditingId(null)}
            onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-merchants'] })}
          />
        ) : null}
      </div>
    </AdminLayout>
  );
}
