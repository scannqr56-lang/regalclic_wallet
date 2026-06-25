import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import JoinLayout from '@/pages/join/JoinLayout';
import { submitPublicJoin } from '@/lib/join';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function JoinPage() {
  const { businessSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim()) {
      toast.error('Veuillez entrer votre prénom.');
      return;
    }
    if (!consent) {
      toast.error('Veuillez accepter les conditions pour continuer.');
      return;
    }

    setLoading(true);
    try {
      const result = await submitPublicJoin({
        business_slug: businessSlug,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        consent: true,
      });

      const membershipId = result.membership_id;
      if (!membershipId) {
        throw new Error('Réponse serveur invalide');
      }

      if (result.already_exists) {
        toast.message('Vous avez déjà une carte pour ce commerce.');
      }

      navigate(
        `/join/${businessSlug}/success?membership=${membershipId}${result.already_exists ? '&existing=1' : ''}`,
        { replace: true },
      );
    } catch (error) {
      toast.error(error?.message || 'Impossible de créer votre carte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <JoinLayout>
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rc-navy">
            <WalletCards className="h-5 w-5" />
            Ajouter ma carte
          </CardTitle>
          <CardDescription>
            Inscrivez-vous en quelques secondes. Aucune application à télécharger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">Prénom *</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                placeholder="Jean"
                autoComplete="given-name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => update('last_name', e.target.value)}
                placeholder="Dupont"
                autoComplete="family-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="06 12 34 56 78"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="jean@exemple.fr"
                autoComplete="email"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border bg-slate-50 p-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-muted-foreground">
                J&apos;accepte que mes données soient utilisées pour gérer ma carte de fidélité
                chez ce commerce, conformément à la politique de confidentialité RegalClic.
              </span>
            </label>

            <Button
              type="submit"
              className="w-full h-12 text-base bg-rc-navy hover:bg-rc-navy/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création en cours…
                </>
              ) : (
                'Créer ma carte'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </JoinLayout>
  );
}
