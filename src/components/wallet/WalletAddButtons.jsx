import { useState } from 'react';
import { Loader2, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { openAppleWalletPass, openGoogleWalletPass, isAppleDevice } from '@/lib/wallet';
import { Button } from '@/components/ui/button';

export default function WalletAddButtons({ membershipId, businessSlug }) {
  const [appleLoading, setAppleLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleApple = async () => {
    if (!membershipId || !businessSlug) return;
    setAppleLoading(true);
    try {
      await openAppleWalletPass(membershipId, businessSlug);
      toast.success('Carte Apple Wallet prête', {
        description: isAppleDevice()
          ? 'Suivez les instructions pour l\'ajouter à votre Wallet.'
          : 'Ouvrez le fichier .pkpass sur votre iPhone.',
      });
    } catch (error) {
      toast.error(error?.message || 'Erreur Apple Wallet', {
        description: 'Vérifiez que les certificats Apple sont configurés côté serveur.',
      });
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!membershipId || !businessSlug) return;
    setGoogleLoading(true);
    try {
      await openGoogleWalletPass(membershipId, businessSlug);
      toast.success('Redirection vers Google Wallet…');
    } catch (error) {
      toast.error(error?.message || 'Erreur Google Wallet', {
        description: 'Vérifiez que le compte de service Google est configuré côté serveur.',
      });
      setGoogleLoading(false);
    }
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        className="h-12 justify-start gap-3 bg-black text-white hover:bg-black/90"
        onClick={handleApple}
        disabled={appleLoading || googleLoading}
      >
        {appleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Wallet className="h-5 w-5" />
        )}
        {appleLoading ? 'Génération…' : 'Ajouter à Apple Wallet'}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-12 justify-start gap-3 border-2"
        onClick={handleGoogle}
        disabled={appleLoading || googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Smartphone className="h-5 w-5" />
        )}
        {googleLoading ? 'Génération…' : 'Ajouter à Google Wallet'}
      </Button>
    </div>
  );
}
