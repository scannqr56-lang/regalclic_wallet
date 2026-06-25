import { useState } from 'react';
import { Loader2, Smartphone, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { openAppleWalletPass, isAppleDevice } from '@/lib/wallet';
import { Button } from '@/components/ui/button';

export default function WalletAddButtons({ membershipId, businessSlug }) {
  const [appleLoading, setAppleLoading] = useState(false);

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

  const handleGoogle = () => {
    toast.info('Google Wallet arrive à la Phase 5.');
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button
        type="button"
        className="h-12 justify-start gap-3 bg-black text-white hover:bg-black/90"
        onClick={handleApple}
        disabled={appleLoading}
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
      >
        <Smartphone className="h-5 w-5" />
        Ajouter à Google Wallet
      </Button>
    </div>
  );
}
