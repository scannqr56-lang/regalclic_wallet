import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { supabase, uploadBusinessLogo } from '@/lib/supabase';
import { slugify, isValidSlug } from '@/lib/slug';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const DEFAULT_COLOR = '#0B1E3F';

export default function BusinessSettingsPage() {
  const { user, business, isLoading, refetch } = useMyBusiness();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    primary_color: DEFAULT_COLOR,
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    website: '',
    logo_url: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || '',
        slug: business.slug || '',
        primary_color: business.primary_color || DEFAULT_COLOR,
        address: business.address || '',
        city: business.city || '',
        postal_code: business.postal_code || '',
        phone: business.phone || '',
        website: business.website || '',
        logo_url: business.logo_url || '',
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

      if (business?.id) {
        const { data, error } = await supabase
          .from('businesses')
          .update({
            name: payload.name,
            slug: payload.slug,
            primary_color: payload.primary_color,
            address: payload.address || null,
            city: payload.city || null,
            postal_code: payload.postal_code || null,
            phone: payload.phone || null,
            website: payload.website || null,
            logo_url: payload.logo_url || null,
          })
          .eq('id', business.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: payload.name,
          slug: payload.slug,
          primary_color: payload.primary_color,
          address: payload.address || null,
          city: payload.city || null,
          postal_code: payload.postal_code || null,
          phone: payload.phone || null,
          website: payload.website || null,
          logo_url: payload.logo_url || null,
        })
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
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image.');
      return;
    }
    setUploading(true);
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
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
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
      <Card>
        <CardHeader>
          <CardTitle>{business ? business.name : 'Nouveau commerce'}</CardTitle>
          <CardDescription>
            Ces informations apparaîtront sur la page d&apos;inscription et dans Apple / Google Wallet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
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
                />
              </div>
            </div>

            {business?.id ? (
              <div className="space-y-2">
                <Label>Logo</Label>
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
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? 'Envoi…' : 'Changer le logo'}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vous pourrez ajouter un logo après la création du commerce.
              </p>
            )}

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

            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {business ? 'Enregistrer' : 'Créer mon commerce'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
