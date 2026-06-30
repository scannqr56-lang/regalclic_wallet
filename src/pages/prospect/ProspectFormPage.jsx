import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ProspectFormLayout from '@/pages/prospect/ProspectFormLayout';
import {
  FormField,
  FormGrid,
  FormInput,
  FormSelect,
  FormTextarea,
  ObjectionCheckboxes,
} from '@/components/prospects/ProspectFormFields';
import { FormSection, FormStickyFooter } from '@/components/ui/form-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { submitSalesProspect } from '@/lib/prospects';
import {
  BUSINESS_TYPE_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_ROLE_OPTIONS,
  createEmptyProspectForm,
  LOYALTY_INTEREST_OPTIONS,
  LOYALTY_SYSTEM_OPTIONS,
  MAIN_PROBLEM_OPTIONS,
  NEXT_ACTION_OPTIONS,
  OBJECTION_OPTIONS,
  OFFER_PRESENTED_OPTIONS,
  PREFERRED_CONTACT_OPTIONS,
  PROSPECT_INTEREST_OPTIONS,
  PROSPECT_STATUS_OPTIONS,
  validateProspectFormClient,
  WANTS_DEMO_OPTIONS,
  YES_NO_UNKNOWN_OPTIONS,
} from '@/lib/sales-prospect-constants';

export default function ProspectFormPage() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code')?.trim() || '';

  const initialForm = useMemo(() => {
    const base = createEmptyProspectForm();
    if (codeFromUrl) base.commercial_code = codeFromUrl.toUpperCase();
    return base;
  }, [codeFromUrl]);

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lastId, setLastId] = useState(null);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = (keepCommercial = true) => {
    const fresh = createEmptyProspectForm();
    if (keepCommercial) {
      fresh.commercial_name = form.commercial_name;
      fresh.commercial_email = form.commercial_email;
      fresh.commercial_phone = form.commercial_phone;
      fresh.commercial_code = form.commercial_code;
    } else if (codeFromUrl) {
      fresh.commercial_code = codeFromUrl.toUpperCase();
    }
    setForm(fresh);
    setSuccess(false);
    setLastId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateProspectFormClient(form);
    if (errors.length) {
      toast.error(errors[0]);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        commercial_name: form.commercial_name.trim() || null,
        commercial_code: form.commercial_code.trim() || null,
        demo_done: Boolean(form.demo_done),
        launch_offer_presented: Boolean(form.launch_offer_presented),
        follow_up_date: form.follow_up_date || null,
        contact_date: form.contact_date || null,
      };
      const result = await submitSalesProspect(payload);
      setSuccess(true);
      setLastId(result.id);
      toast.success('Prospect enregistré avec succès.');
    } catch (error) {
      toast.error(error?.message || 'Enregistrement impossible.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ProspectFormLayout>
        <Card className="border-emerald-200 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-rc-navy">Prospect enregistré avec succès</CardTitle>
            <CardDescription>
              Les informations ont été centralisées. Merci pour votre remontée terrain.
              {lastId ? (
                <span className="mt-2 block font-mono text-xs text-slate-500">Réf. {lastId}</span>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button type="button" className="h-11" onClick={() => resetForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un autre prospect
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => resetForm(false)}>
              Retour au formulaire vide
            </Button>
          </CardContent>
        </Card>
      </ProspectFormLayout>
    );
  }

  return (
    <ProspectFormLayout>
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold text-rc-navy sm:text-3xl">Ajouter un prospect RegalClic</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Renseignez les informations du commerce approché afin de permettre le suivi commercial.
          Utilisez ce formulaire après chaque échange avec un commerce.
        </p>
        {codeFromUrl ? (
          <p className="rounded-lg bg-rc-teal/10 px-3 py-2 text-xs text-rc-navy">
            Code commercial détecté : <strong>{codeFromUrl.toUpperCase()}</strong>
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        <FormSection title="1. Informations du commercial" description="Qui a renseigné ce prospect ?">
          <FormGrid>
            <FormField label="Nom du commercial" htmlFor="commercial_name">
              <FormInput id="commercial_name" value={form.commercial_name} onChange={(v) => update('commercial_name', v)} />
            </FormField>
            <FormField label="Code commercial / apporteur" htmlFor="commercial_code" required>
              <FormInput id="commercial_code" value={form.commercial_code} onChange={(v) => update('commercial_code', v)} placeholder="Ex. YASSIN" />
            </FormField>
            <FormField label="Email du commercial" htmlFor="commercial_email">
              <FormInput id="commercial_email" type="email" value={form.commercial_email} onChange={(v) => update('commercial_email', v)} />
            </FormField>
            <FormField label="Téléphone du commercial" htmlFor="commercial_phone">
              <FormInput id="commercial_phone" type="tel" value={form.commercial_phone} onChange={(v) => update('commercial_phone', v)} />
            </FormField>
            <FormField label="Date du contact" htmlFor="contact_date">
              <FormInput id="contact_date" type="date" value={form.contact_date} onChange={(v) => update('contact_date', v)} />
            </FormField>
            <FormField label="Mode de contact" htmlFor="contact_channel">
              <FormSelect id="contact_channel" value={form.contact_channel} onChange={(v) => update('contact_channel', v)} options={CONTACT_CHANNEL_OPTIONS} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="2. Informations du commerce">
          <FormGrid>
            <FormField label="Nom du commerce" htmlFor="business_name" required>
              <FormInput id="business_name" value={form.business_name} onChange={(v) => update('business_name', v)} />
            </FormField>
            <FormField label="Type de commerce" htmlFor="business_type" required>
              <FormSelect id="business_type" value={form.business_type} onChange={(v) => update('business_type', v)} options={BUSINESS_TYPE_OPTIONS} />
            </FormField>
            <FormField label="Ville" htmlFor="city" required>
              <FormInput id="city" value={form.city} onChange={(v) => update('city', v)} />
            </FormField>
            <FormField label="Code postal" htmlFor="postal_code">
              <FormInput id="postal_code" value={form.postal_code} onChange={(v) => update('postal_code', v)} />
            </FormField>
            <FormField label="Adresse complète" htmlFor="address" className="sm:col-span-2">
              <FormInput id="address" value={form.address} onChange={(v) => update('address', v)} />
            </FormField>
            <FormField label="Zone / quartier" htmlFor="area">
              <FormInput id="area" value={form.area} onChange={(v) => update('area', v)} />
            </FormField>
            <FormField label="Lien Google Maps" htmlFor="google_maps_url">
              <FormInput id="google_maps_url" value={form.google_maps_url} onChange={(v) => update('google_maps_url', v)} placeholder="https://..." />
            </FormField>
            <FormField label="Site web" htmlFor="website_url">
              <FormInput id="website_url" value={form.website_url} onChange={(v) => update('website_url', v)} />
            </FormField>
            <FormField label="Instagram" htmlFor="instagram_url">
              <FormInput id="instagram_url" value={form.instagram_url} onChange={(v) => update('instagram_url', v)} />
            </FormField>
            <FormField label="Facebook" htmlFor="facebook_url">
              <FormInput id="facebook_url" value={form.facebook_url} onChange={(v) => update('facebook_url', v)} />
            </FormField>
            <FormField label="TikTok" htmlFor="tiktok_url">
              <FormInput id="tiktok_url" value={form.tiktok_url} onChange={(v) => update('tiktok_url', v)} />
            </FormField>
            <FormField label="Autre lien utile" htmlFor="other_url">
              <FormInput id="other_url" value={form.other_url} onChange={(v) => update('other_url', v)} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="3. Contact prospect">
          <FormGrid>
            <FormField label="Nom du contact" htmlFor="contact_name">
              <FormInput id="contact_name" value={form.contact_name} onChange={(v) => update('contact_name', v)} />
            </FormField>
            <FormField label="Rôle du contact" htmlFor="contact_role">
              <FormSelect id="contact_role" value={form.contact_role} onChange={(v) => update('contact_role', v)} options={CONTACT_ROLE_OPTIONS} />
            </FormField>
            <FormField label="Téléphone fixe" htmlFor="phone_landline">
              <FormInput id="phone_landline" type="tel" value={form.phone_landline} onChange={(v) => update('phone_landline', v)} />
            </FormField>
            <FormField label="Téléphone mobile" htmlFor="phone_mobile">
              <FormInput id="phone_mobile" type="tel" value={form.phone_mobile} onChange={(v) => update('phone_mobile', v)} />
            </FormField>
            <FormField label="Email" htmlFor="email">
              <FormInput id="email" type="email" value={form.email} onChange={(v) => update('email', v)} />
            </FormField>
            <FormField label="Moyen préféré pour être recontacté" htmlFor="preferred_contact_method">
              <FormSelect id="preferred_contact_method" value={form.preferred_contact_method} onChange={(v) => update('preferred_contact_method', v)} options={PREFERRED_CONTACT_OPTIONS} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="4. Situation actuelle">
          <FormGrid>
            <FormField label="Système de fidélité existant ?" htmlFor="has_loyalty_system">
              <FormSelect id="has_loyalty_system" value={form.has_loyalty_system} onChange={(v) => update('has_loyalty_system', v)} options={LOYALTY_SYSTEM_OPTIONS} />
            </FormField>
            <FormField label="Caisse ou borne ?" htmlFor="has_pos_or_kiosk">
              <FormSelect id="has_pos_or_kiosk" value={form.has_pos_or_kiosk} onChange={(v) => update('has_pos_or_kiosk', v)} options={YES_NO_UNKNOWN_OPTIONS} />
            </FormField>
            <FormField label="Description du système actuel" htmlFor="loyalty_system_details" className="sm:col-span-2">
              <FormTextarea id="loyalty_system_details" value={form.loyalty_system_details} onChange={(v) => update('loyalty_system_details', v)} />
            </FormField>
            <FormField label="Nom logiciel caisse / borne" htmlFor="pos_or_kiosk_name">
              <FormInput id="pos_or_kiosk_name" value={form.pos_or_kiosk_name} onChange={(v) => update('pos_or_kiosk_name', v)} />
            </FormField>
            <FormField label="Intérêt pour la fidélité ?" htmlFor="loyalty_interest">
              <FormSelect id="loyalty_interest" value={form.loyalty_interest} onChange={(v) => update('loyalty_interest', v)} options={LOYALTY_INTEREST_OPTIONS} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="5. Besoins et objections">
          <div className="space-y-4">
            <FormField label="Problème principal identifié" htmlFor="main_problem">
              <FormSelect id="main_problem" value={form.main_problem} onChange={(v) => update('main_problem', v)} options={MAIN_PROBLEM_OPTIONS} />
            </FormField>
            <FormField label="Objections entendues">
              <ObjectionCheckboxes
                options={OBJECTION_OPTIONS}
                selected={form.objections}
                onChange={(v) => update('objections', v)}
              />
            </FormField>
            <FormField label="Notes sur les objections" htmlFor="objection_notes">
              <FormTextarea id="objection_notes" value={form.objection_notes} onChange={(v) => update('objection_notes', v)} />
            </FormField>
            <FormField label="Besoin exprimé (libre)" htmlFor="expressed_need">
              <FormTextarea id="expressed_need" value={form.expressed_need} onChange={(v) => update('expressed_need', v)} />
            </FormField>
            <FormField label="Notes du commercial" htmlFor="commercial_notes">
              <FormTextarea id="commercial_notes" value={form.commercial_notes} onChange={(v) => update('commercial_notes', v)} rows={5} />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="6. Intérêt et suivi">
          <FormGrid>
            <FormField label="Niveau d'intérêt" htmlFor="interest_level" required>
              <FormSelect id="interest_level" value={form.interest_level} onChange={(v) => update('interest_level', v)} options={PROSPECT_INTEREST_OPTIONS} />
            </FormField>
            <FormField label="Statut" htmlFor="status" required>
              <FormSelect id="status" value={form.status} onChange={(v) => update('status', v)} options={PROSPECT_STATUS_OPTIONS} />
            </FormField>
            <FormField label="Souhaite une démo ?" htmlFor="wants_demo">
              <FormSelect id="wants_demo" value={form.wants_demo} onChange={(v) => update('wants_demo', v)} options={WANTS_DEMO_OPTIONS} />
            </FormField>
            <FormField label="Démo déjà faite ?" htmlFor="demo_done">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  id="demo_done"
                  type="checkbox"
                  checked={form.demo_done}
                  onChange={(e) => update('demo_done', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Oui, démo réalisée
              </label>
            </FormField>
            <FormField label="Date prévue de relance" htmlFor="follow_up_date">
              <FormInput id="follow_up_date" type="date" value={form.follow_up_date} onChange={(v) => update('follow_up_date', v)} />
            </FormField>
            <FormField label="Prochaine action" htmlFor="next_action">
              <FormSelect id="next_action" value={form.next_action} onChange={(v) => update('next_action', v)} options={NEXT_ACTION_OPTIONS} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="7. Offre présentée">
          <FormGrid>
            <FormField label="Offre présentée" htmlFor="offer_presented">
              <FormSelect id="offer_presented" value={form.offer_presented} onChange={(v) => update('offer_presented', v)} options={OFFER_PRESENTED_OPTIONS} />
            </FormField>
            <FormField label="Prix annoncé" htmlFor="price_announced">
              <FormInput id="price_announced" value={form.price_announced} onChange={(v) => update('price_announced', v)} />
            </FormField>
            <FormField label="Frais de mise en place annoncés" htmlFor="setup_fee_announced">
              <FormInput id="setup_fee_announced" value={form.setup_fee_announced} onChange={(v) => update('setup_fee_announced', v)} />
            </FormField>
            <FormField label="Offre de lancement proposée ?" htmlFor="launch_offer_presented">
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  id="launch_offer_presented"
                  type="checkbox"
                  checked={form.launch_offer_presented}
                  onChange={(e) => update('launch_offer_presented', e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Oui
              </label>
            </FormField>
            <FormField label="Commentaire sur l'offre" htmlFor="offer_comment" className="sm:col-span-2">
              <FormTextarea id="offer_comment" value={form.offer_comment} onChange={(v) => update('offer_comment', v)} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="8. Pièces ou liens utiles">
          <FormGrid>
            <FormField label="Lien photo commerce" htmlFor="photo_url">
              <FormInput id="photo_url" value={form.photo_url} onChange={(v) => update('photo_url', v)} placeholder="https://..." />
            </FormField>
            <FormField label="Lien capture Instagram" htmlFor="instagram_screenshot_url">
              <FormInput id="instagram_screenshot_url" value={form.instagram_screenshot_url} onChange={(v) => update('instagram_screenshot_url', v)} />
            </FormField>
            <FormField label="Lien menu" htmlFor="menu_url">
              <FormInput id="menu_url" value={form.menu_url} onChange={(v) => update('menu_url', v)} />
            </FormField>
            <FormField label="Lien autre document" htmlFor="document_url">
              <FormInput id="document_url" value={form.document_url} onChange={(v) => update('document_url', v)} />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormStickyFooter>
          <Button type="submit" className="h-11 w-full bg-rc-orange hover:bg-rc-orange/90" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Enregistrer le prospect
          </Button>
        </FormStickyFooter>
      </form>
    </ProspectFormLayout>
  );
}
