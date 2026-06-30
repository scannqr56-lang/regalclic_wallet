import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/AdminLayout';
import { ProspectInterestBadge, ProspectStatusBadge } from '@/components/prospects/ProspectBadges';
import { fetchAdminProspect, patchAdminProspect } from '@/lib/admin-prospects';
import {
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_ROLE_OPTIONS,
  getBusinessTypeLabel,
  LOYALTY_INTEREST_OPTIONS,
  LOYALTY_SYSTEM_OPTIONS,
  MAIN_PROBLEM_OPTIONS,
  NEXT_ACTION_OPTIONS,
  OBJECTION_OPTIONS,
  OFFER_PRESENTED_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
  PROSPECT_INTEREST_OPTIONS,
  PROSPECT_STATUS_OPTIONS,
  WANTS_DEMO_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
} from '@/lib/sales-prospect-constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSection, touchSelectClassName, touchTextareaClassName } from '@/components/ui/form-layout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value}</p>
    </div>
  );
}

function optionLabel(options, value) {
  return options.find((o) => o.value === value)?.label ?? value;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function copyText(text, label) {
  if (!text) return;
  await navigator.clipboard.writeText(text);
  toast.success(`${label} copié`);
}

export default function AdminProspectDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [edit, setEdit] = useState({
    status: '',
    interest_level: '',
    next_action: '',
    follow_up_date: '',
    internal_notes: '',
  });

  const { data: prospect, isLoading, error } = useQuery({
    queryKey: ['admin-prospect', id],
    queryFn: () => fetchAdminProspect(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!prospect) return;
    setEdit({
      status: prospect.status || '',
      interest_level: prospect.interest_level || '',
      next_action: prospect.next_action || '',
      follow_up_date: prospect.follow_up_date || '',
      internal_notes: prospect.internal_notes || '',
    });
  }, [prospect]);

  const saveMutation = useMutation({
    mutationFn: () => patchAdminProspect(id, edit),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-prospect', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-prospects'] });
      toast.success('Prospect mis à jour');
    },
    onError: (err) => toast.error(err?.message || 'Erreur'),
  });

  if (isLoading) {
    return (
      <AdminLayout title="Prospect">
        <Skeleton className="h-64 w-full" />
      </AdminLayout>
    );
  }

  if (error || !prospect) {
    return (
      <AdminLayout title="Prospect">
        <p className="text-sm text-red-600">{error?.message || 'Prospect introuvable'}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/prospects">Retour à la liste</Link>
        </Button>
      </AdminLayout>
    );
  }

  const objections = (prospect.objections || [])
    .map((v) => optionLabel(OBJECTION_OPTIONS, v))
    .join(', ');

  return (
    <AdminLayout title={prospect.business_name} description={`${prospect.city} · ${getBusinessTypeLabel(prospect.business_type)}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/prospects"><ArrowLeft className="mr-1 h-4 w-4" />Retour</Link>
        </Button>
        <ProspectInterestBadge level={prospect.interest_level} />
        <ProspectStatusBadge status={prospect.status} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {prospect.phone_mobile ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => copyText(prospect.phone_mobile, 'Téléphone')}>
            <Phone className="mr-1 h-4 w-4" />Copier mobile
          </Button>
        ) : null}
        {prospect.email ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => copyText(prospect.email, 'Email')}>
            <Copy className="mr-1 h-4 w-4" />Copier email
          </Button>
        ) : null}
        {prospect.instagram_url ? (
          <Button asChild variant="secondary" size="sm">
            <a href={prospect.instagram_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Instagram</a>
          </Button>
        ) : null}
        {prospect.google_maps_url ? (
          <Button asChild variant="secondary" size="sm">
            <a href={prospect.google_maps_url} target="_blank" rel="noreferrer"><MapPin className="mr-1 h-4 w-4" />Maps</a>
          </Button>
        ) : null}
        {prospect.website_url ? (
          <Button asChild variant="secondary" size="sm">
            <a href={prospect.website_url} target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Site web</a>
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <FormSection title="Commerce">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Nom" value={prospect.business_name} />
              <DetailRow label="Type" value={getBusinessTypeLabel(prospect.business_type)} />
              <DetailRow label="Ville" value={`${prospect.city}${prospect.postal_code ? ` (${prospect.postal_code})` : ''}`} />
              <DetailRow label="Zone" value={prospect.area} />
              <DetailRow label="Adresse" value={prospect.address} />
            </div>
          </FormSection>

          <FormSection title="Contact prospect">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Nom" value={prospect.contact_name} />
              <DetailRow label="Rôle" value={optionLabel(CONTACT_ROLE_OPTIONS, prospect.contact_role)} />
              <DetailRow label="Mobile" value={prospect.phone_mobile} />
              <DetailRow label="Fixe" value={prospect.phone_landline} />
              <DetailRow label="Email" value={prospect.email} />
              <DetailRow label="Préférence contact" value={optionLabel(PREFERRED_CONTACT_OPTIONS, prospect.preferred_contact_method)} />
            </div>
          </FormSection>

          <FormSection title="Situation actuelle">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Fidélité existante" value={optionLabel(LOYALTY_SYSTEM_OPTIONS, prospect.has_loyalty_system)} />
              <DetailRow label="Détails fidélité" value={prospect.loyalty_system_details} />
              <DetailRow label="Caisse / borne" value={optionLabel(YES_NO_UNKNOWN_OPTIONS, prospect.has_pos_or_kiosk)} />
              <DetailRow label="Logiciel" value={prospect.pos_or_kiosk_name} />
              <DetailRow label="Intérêt fidélité" value={optionLabel(LOYALTY_INTEREST_OPTIONS, prospect.loyalty_interest)} />
            </div>
          </FormSection>

          <FormSection title="Besoins et objections">
            <div className="space-y-3">
              <DetailRow label="Problème principal" value={optionLabel(MAIN_PROBLEM_OPTIONS, prospect.main_problem)} />
              <DetailRow label="Objections" value={objections || '—'} />
              <DetailRow label="Notes objections" value={prospect.objection_notes} />
              <DetailRow label="Besoin exprimé" value={prospect.expressed_need} />
              <DetailRow label="Notes commercial" value={prospect.commercial_notes} />
            </div>
          </FormSection>

          <FormSection title="Offre présentée">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Offre" value={optionLabel(OFFER_PRESENTED_OPTIONS, prospect.offer_presented)} />
              <DetailRow label="Prix annoncé" value={prospect.price_announced} />
              <DetailRow label="Frais mise en place" value={prospect.setup_fee_announced} />
              <DetailRow label="Offre lancement" value={prospect.launch_offer_presented ? 'Oui' : 'Non'} />
              <DetailRow label="Commentaire" value={prospect.offer_comment} />
            </div>
          </FormSection>

          <FormSection title="Liens utiles">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailRow label="Photo" value={prospect.photo_url} />
              <DetailRow label="Capture Instagram" value={prospect.instagram_screenshot_url} />
              <DetailRow label="Menu" value={prospect.menu_url} />
              <DetailRow label="Document" value={prospect.document_url} />
            </div>
          </FormSection>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commercial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Nom" value={prospect.commercial_name} />
              <DetailRow label="Code" value={prospect.commercial_code} />
              <DetailRow label="Email" value={prospect.commercial_email} />
              <DetailRow label="Téléphone" value={prospect.commercial_phone} />
              <DetailRow label="Date contact" value={prospect.contact_date} />
              <DetailRow label="Mode contact" value={optionLabel(CONTACT_CHANNEL_OPTIONS, prospect.contact_channel)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Suivi — édition rapide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <select
                  value={edit.status}
                  onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value }))}
                  className={touchSelectClassName}
                >
                  {PROSPECT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Intérêt</Label>
                <select
                  value={edit.interest_level}
                  onChange={(e) => setEdit((s) => ({ ...s, interest_level: e.target.value }))}
                  className={touchSelectClassName}
                >
                  {PROSPECT_INTEREST_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Prochaine action</Label>
                <select
                  value={edit.next_action}
                  onChange={(e) => setEdit((s) => ({ ...s, next_action: e.target.value }))}
                  className={touchSelectClassName}
                >
                  <option value="">—</option>
                  {NEXT_ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de relance</Label>
                <Input
                  type="date"
                  value={edit.follow_up_date || ''}
                  onChange={(e) => setEdit((s) => ({ ...s, follow_up_date: e.target.value }))}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes internes admin</Label>
                <textarea
                  value={edit.internal_notes}
                  onChange={(e) => setEdit((s) => ({ ...s, internal_notes: e.target.value }))}
                  className={touchTextareaClassName}
                  rows={4}
                />
              </div>
              <DetailRow label="Démo souhaitée" value={optionLabel(WANTS_DEMO_OPTIONS, prospect.wants_demo)} />
              <DetailRow label="Démo faite" value={prospect.demo_done ? 'Oui' : 'Non'} />
              <Button
                type="button"
                className="h-11 w-full"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
              >
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enregistrer le suivi
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 pt-6 text-xs text-slate-500">
              <p>Créé le {formatDateTime(prospect.created_at)}</p>
              <p>Mis à jour le {formatDateTime(prospect.updated_at)}</p>
              <p className="font-mono">ID {prospect.id}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
