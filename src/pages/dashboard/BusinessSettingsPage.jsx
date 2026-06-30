import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import WalletDesignForm from '@/components/wallet/WalletDesignForm';
import WalletPreviewPanel from '@/components/wallet/WalletPreviewPanel';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { supabase, uploadBusinessHero, uploadBusinessLogo } from '@/lib/supabase';
import { slugify, isValidSlug } from '@/lib/slug';
import {
  DEFAULT_LABEL_COLOR,
  DEFAULT_PRIMARY_COLOR,
  isValidHexColor,
  normalizeHexColor,
} from '@/lib/wallet-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormSection, FormStickyFooter } from '@/components/ui/form-layout';
import { Skeleton } from '@/components/ui/skeleton';

function normalizeOptionalUrl(value) {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) return trimmed;
  return `https://${trimmed}`;
}

function buildBusinessPayload(form) {
  return {
    name: form.name.trim(),
    slug: form.slug,
    primary_color: normalizeHexColor(form.primary_color),
    wallet_label_color: form.wallet_label_color
      ? normalizeHexColor(form.wallet_label_color, DEFAULT_LABEL_COLOR)
      : null,
    address: form.address.trim() || null,
    city: form.city.trim() || null,
    postal_code: form.postal_code.trim() || null,
    phone: form.phone.trim() || null,
    website: normalizeOptionalUrl(form.website),
    order_url: normalizeOptionalUrl(form.order_url),
    instagram_url: normalizeOptionalUrl(form.instagram_url),
    logo_url: form.logo_url || null,
    wallet_hero_url: form.wallet_hero_url || null,
    wallet_promo_message: form.wallet_promo_message.trim() || null,
    wallet_terms: form.wallet_terms.trim() || null,
  };
}

export default function BusinessSettingsPage() {
  const { user, business, loyaltyProgram, isLoading, refetch } = useMyBusiness();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const walletSectionRef = useRef(null);
  const logoRef = useRef(null);
  const heroRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    primary_color: DEFAULT_PRIMARY_COLOR,
    wallet_label_color: DEFAULT_LABEL_COLOR,
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    website: '',
    order_url: '',
    instagram_url: '',
    logo_url: '',
    wallet_hero_url: '',
    wallet_promo_message: '',
    wallet_terms: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);

  const focusWallet = searchParams.get('section') === 'wallet';

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        slug: business.slug || '',
        primary_color: business.primary_color || DEFAULT_PRIMARY_COLOR,
        wallet_label_color: business.wallet_label_color || DEFAULT_LABEL_COLOR,
        address: business.address || '',
        city: business.city || '',
        postal_code: business.postal_code || '',
        phone: business.phone || '',
        website: business.website || '',
        order_url: business.order_url || '',
        instagram_url: business.instagram_url || '',
        logo_url: business.logo_url || '',
        wallet_hero_url: business.wallet_hero_url || '',
        wallet_promo_message: business.wallet_promo_message || '',
        wallet_terms: business.wallet_terms || '',
      });
      setSlugTouched(true);
    }
  }, [business]);

  useEffect(() => {
    if (!focusWallet || isLoading) return undefined;
    const timer = window.setTimeout(() => {
      walletSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [focusWallet, isLoading]);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !slugTouched && !business) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (!user?.id) throw new Error('Non authentifié');
      if (!isValidSlug(payload.slug)) {
        throw new Error('Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets.');
      }
      if (!isValidHexColor(payload.primary_color)) {
        throw new Error('Couleur principale invalide (format #RRGGBB).');
      }
      if (payload.wallet_label_color && !isValidHexColor(payload.wallet_label_color)) {
        throw new Error('Couleur des libellés invalide (format #RRGGBB).');
      }

      const row = buildBusinessPayload(payload);

      if (business?.id) {
        const { data, error } = await supabase
          .from('businesses')
          .update(row)
          .eq('id', business.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('businesses')
        .insert({ owner_id: user.id, ...row })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['my-business'] });
      toast.success(business ? 'Commerce mis à jour' : 'Commerce créé');
    },
    onError: (error) => {
      const msg = error?.message || 'Erreur lors de la sauvegarde';
      if (msg.includes('businesses_slug_unique') || msg.includes('slug')) {
        toast.error('Ce slug est déjà utilisé. Choisissez-en un autre.');
      } else {
        toast.error(msg);
      }
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;
    setUploadingLogo(true);
    try {
      const url = await uploadBusinessLogo(business.id, file);
      setForm((prev) => ({ ...prev, logo_url: url }));
      const { error } = await supabase
        .from('businesses')
        .update({ logo_url: url })
        .eq('id', business.id);
      if (error) throw error;
      await refetch();
      toast.success('Logo mis à jour');
    } catch (error) {
      toast.error(error?.message || 'Upload impossible');
    } finally {
      setUploadingLogo(false);
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !business?.id) return;
    setUploadingHero(true);
    try {
      const url = await uploadBusinessHero(business.id, file);
      setForm((prev) => ({ ...prev, wallet_hero_url: url }));
      const { error } = await supabase
        .from('businesses')
        .update({ wallet_hero_url: url })
        .eq('id', business.id);
      if (error) throw error;
      await refetch();
      toast.success('Bannière Wallet mise à jour');
    } catch (error) {
      toast.error(error?.message || 'Upload impossible');
    } finally {
      setUploadingHero(false);
      if (heroRef.current) heroRef.current.value = '';
    }
  };

  const handleRemoveHero = async () => {
    if (!business?.id) return;
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ wallet_hero_url: null })
        .eq('id', business.id);
      if (error) throw error;
      setForm((prev) => ({ ...prev, wallet_hero_url: '' }));
      await refetch();
      toast.success('Bannière supprimée');
    } catch (error) {
      toast.error(error?.message || 'Suppression impossible');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Le nom du commerce est requis.');
      return;
    }
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Commerce">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={focusWallet ? 'Design Wallet' : 'Mon commerce'}
      description={
        focusWallet
          ? 'Personnalisez la carte affichée sur Apple Wallet et Google Wallet.'
          : (business ? 'Modifiez les informations affichées à vos clients.' : 'Créez votre commerce pour commencer.')
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 pb-4">
        {!focusWallet ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{business ? business.name : 'Nouveau commerce'}</CardTitle>
              <CardDescription>
                Informations générales et page d&apos;inscription client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormSection className="border-0 p-0 shadow-none">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du commerce *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Pizza du Marché"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Lien public (slug) *</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      updateField('slug', slugify(e.target.value));
                    }}
                    placeholder="pizza-du-marche"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Page client : /join/{form.slug || 'votre-slug'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input id="city" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input
                      id="postal_code"
                      value={form.postal_code}
                      onChange={(e) => updateField('postal_code', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input id="phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Site web</Label>
                  <Input
                    id="website"
                    type="url"
                    inputMode="url"
                    value={form.website}
                    onChange={(e) => updateField('website', e.target.value)}
                    placeholder="https://mon-restaurant.fr"
                  />
                </div>
              </FormSection>
            </CardContent>
          </Card>
        ) : null}

        <Card
          ref={walletSectionRef}
          id="wallet-design"
          className="scroll-mt-24 border-rc-teal/20"
        >
          <CardHeader>
            <CardTitle>Design de la carte Wallet</CardTitle>
            <CardDescription>
              Aperçu en direct — les sections ci-dessous correspondent à ce que vos clients voient sur leur téléphone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:gap-8">
              <div className="order-2 min-w-0 lg:order-1">
                <WalletDesignForm
                  form={form}
                  onFieldChange={updateField}
                  businessId={business?.id}
                  logoRef={logoRef}
                  heroRef={heroRef}
                  uploadingLogo={uploadingLogo}
                  uploadingHero={uploadingHero}
                  onLogoUpload={handleLogoUpload}
                  onHeroUpload={handleHeroUpload}
                  onRemoveHero={handleRemoveHero}
                />
              </div>

              <div className="order-1 lg:order-2 lg:sticky lg:top-20 lg:self-start">
                <WalletPreviewPanel form={form} loyaltyProgram={loyaltyProgram} />
              </div>
            </div>
          </CardContent>
        </Card>

        <FormStickyFooter>
          <Button type="submit" className="h-12 w-full text-base sm:h-10 sm:w-auto sm:text-sm" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {business ? 'Enregistrer' : 'Créer mon commerce'}
          </Button>
        </FormStickyFooter>
      </form>
    </DashboardLayout>
  );
}
