import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
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
import { Skeleton } from '@/components/ui/skeleton';

const inputClassName =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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
  const { user, business, isLoading, refetch } = useMyBusiness();
  const queryClient = useQueryClient();
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
      title="Mon commerce"
      description={business ? 'Modifiez les informations affichées à vos clients.' : 'Créez votre commerce pour commencer.'}
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
        <Card>
          <CardHeader>
            <CardTitle>{business ? business.name : 'Nouveau commerce'}</CardTitle>
            <CardDescription>
              Informations générales et page d&apos;inscription client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
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

            <div className="grid gap-4 sm:grid-cols-2">
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
              <Input id="phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://mon-restaurant.fr"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Apparence Wallet</CardTitle>
            <CardDescription>
              Personnalisation affichée sur Apple Wallet et Google Wallet (nouvelles cartes).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Couleur principale</Label>
              <div className="flex gap-3">
                <Input
                  id="primary_color"
                  type="color"
                  className="h-10 w-16 p-1"
                  value={form.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                />
                <Input
                  value={form.primary_color}
                  onChange={(e) => updateField('primary_color', e.target.value)}
                  placeholder="#0B1E3F"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet_label_color">Couleur des libellés (Apple)</Label>
              <div className="flex gap-3">
                <Input
                  id="wallet_label_color"
                  type="color"
                  className="h-10 w-16 p-1"
                  value={form.wallet_label_color}
                  onChange={(e) => updateField('wallet_label_color', e.target.value)}
                />
                <Input
                  value={form.wallet_label_color}
                  onChange={(e) => updateField('wallet_label_color', e.target.value)}
                  placeholder="#44C4A1"
                />
              </div>
            </div>

            {business?.id ? (
              <>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <p className="text-xs text-muted-foreground">
                    PNG, JPEG ou WebP — redimensionné automatiquement (max 800×800).
                  </p>
                  <div className="flex items-center gap-4">
                    {form.logo_url ? (
                      <img
                        src={form.logo_url}
                        alt="Logo"
                        className="h-16 w-16 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                        Aucun
                      </div>
                    )}
                    <input
                      ref={logoRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadingLogo}
                      onClick={() => logoRef.current?.click()}
                    >
                      {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {uploadingLogo ? 'Envoi…' : 'Changer le logo'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Bannière Wallet (optionnel)</Label>
                  <p className="text-xs text-muted-foreground">
                    Format recommandé 1032×336 — recadrage automatique pour Google / Apple strip.
                  </p>
                  <div className="space-y-3">
                    {form.wallet_hero_url ? (
                      <img
                        src={form.wallet_hero_url}
                        alt="Bannière Wallet"
                        className="h-24 w-full max-w-md rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="flex h-24 w-full max-w-md items-center justify-center rounded-lg border bg-muted text-xs text-muted-foreground">
                        Aucune bannière
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={heroRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleHeroUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingHero}
                        onClick={() => heroRef.current?.click()}
                      >
                        {uploadingHero ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploadingHero ? 'Envoi…' : 'Ajouter une bannière'}
                      </Button>
                      {form.wallet_hero_url ? (
                        <Button type="button" variant="ghost" onClick={handleRemoveHero}>
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vous pourrez ajouter logo et bannière après la création du commerce.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="wallet_promo_message">Message court sur la carte</Label>
              <Input
                id="wallet_promo_message"
                value={form.wallet_promo_message}
                onChange={(e) => updateField('wallet_promo_message', e.target.value)}
                placeholder="Votre fidélité récompensée"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wallet_terms">Conditions de fidélité</Label>
              <textarea
                id="wallet_terms"
                className={`${inputClassName} min-h-[88px] resize-y`}
                value={form.wallet_terms}
                onChange={(e) => updateField('wallet_terms', e.target.value)}
                placeholder="Ex. : la récompense est valable 30 jours, non cumulable avec d'autres offres…"
                maxLength={800}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order_url">Lien de commande</Label>
              <Input
                id="order_url"
                value={form.order_url}
                onChange={(e) => updateField('order_url', e.target.value)}
                placeholder="https://commander.mon-restaurant.fr"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram_url">Instagram</Label>
              <Input
                id="instagram_url"
                value={form.instagram_url}
                onChange={(e) => updateField('instagram_url', e.target.value)}
                placeholder="https://instagram.com/monrestaurant"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {business ? 'Enregistrer' : 'Créer mon commerce'}
        </Button>
      </form>
    </DashboardLayout>
  );
}
