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
  ObjectionCheckboxes,
} from '@/components/prospects/ProspectFormFields';
import { FormSection, FormStickyFooter } from '@/components/ui/form-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { submitSalesProspect } from '@/lib/prospects';
import {
  BUSINESS_TYPE_OPTIONS,
  CONTACT_ROLE_OPTIONS,
  createEmptyProspectForm,
  LOYALTY_INTEREST_OPTIONS,
  LOYALTY_SYSTEM_OPTIONS,
  MAIN_PROBLEM_OPTIONS,
  NEXT_ACTION_OPTIONS,
  OBJECTION_OPTIONS,
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
    if (keepCommercial && form.commercial_code) {
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
        commercial_code: form.commercial_code.trim().toUpperCase(),
        contact_date: new Date().toISOString().slice(0, 10),
        demo_done: Boolean(form.demo_done),
        follow_up_date: form.follow_up_date || null,
        offer_presented: 'wallet',
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
        </p>
        {codeFromUrl ? (
          <p className="rounded-lg bg-rc-teal/10 px-3 py-2 text-xs text-rc-navy">
            Code commercial détecté : <strong>{codeFromUrl.toUpperCase()}</strong>
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pb-4">
        <FormSection title="1. Code commercial" description="Saisissez le code qui vous a été communiqué.">
          <FormField label="Code commercial" htmlFor="commercial_code" required>
            <FormInput
              id="commercial_code"
              value={form.commercial_code}
              onChange={(v) => update('commercial_code', v.toUpperCase())}
              placeholder="Ex. YASSIN"
            />
          </FormField>
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
            <FormField label="Téléphone mobile" htmlFor="phone_mobile">
              <FormInput id="phone_mobile" type="tel" value={form.phone_mobile} onChange={(v) => update('phone_mobile', v)} />
            </FormField>
            <FormField label="Email" htmlFor="email">
              <FormInput id="email" type="email" value={form.email} onChange={(v) => update('email', v)} />
            </FormField>
            <FormField label="Moyen préféré pour être recontacté" htmlFor="preferred_contact_method" className="sm:col-span-2">
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
            <FormField label="Intérêt pour la fidélité ?" htmlFor="loyalty_interest" className="sm:col-span-2">
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
