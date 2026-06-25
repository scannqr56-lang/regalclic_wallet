import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { Copy, Check, Download, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import { getJoinUrl } from '@/lib/slug';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function QrPage() {
  const { business, loyaltyProgram, isLoading } = useMyBusiness();
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const joinUrl = business?.slug ? getJoinUrl(business.slug) : '';

  useEffect(() => {
    if (!joinUrl) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(joinUrl, { width: 320, margin: 2 })
      .then(setQrDataUrl)
      .catch(() => toast.error('Impossible de générer le QR code'));
  }, [joinUrl]);

  const copyLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Lien copié');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUrl || !business?.slug) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qr-inscription-${business.slug}.png`;
    link.click();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="QR inscription">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="QR inscription">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Commerce requis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/business">Configurer mon commerce</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!loyaltyProgram) {
    return (
      <DashboardLayout title="QR inscription">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Programme requis
            </CardTitle>
            <CardDescription>
              Créez votre programme de fidélité avant de générer le QR code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/dashboard/program">Créer le programme</Link>
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="QR code d'inscription"
      description="Affichez ce QR en boutique pour que vos clients rejoignent le programme."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{business.name}</CardTitle>
            <CardDescription>
              Programme {loyaltyProgram.type === 'stamps' ? 'à tampons' : 'à points'} — {loyaltyProgram.reward_label}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-6">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR code inscription"
                className="rounded-2xl border bg-white p-4 shadow-sm"
                width={320}
                height={320}
              />
            ) : (
              <Skeleton className="h-80 w-80 rounded-2xl" />
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copier le lien
              </Button>
              <Button variant="outline" onClick={downloadQr} disabled={!qrDataUrl}>
                <Download className="h-4 w-4" />
                Télécharger PNG
              </Button>
              <Button variant="outline" asChild>
                <a href={joinUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Prévisualiser
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comment l&apos;utiliser</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-4">
              <li>Imprimez ou affichez ce QR code à l&apos;entrée ou en caisse.</li>
              <li>Le client scanne et remplit le formulaire d&apos;inscription.</li>
              <li>Il ajoute sa carte dans Apple Wallet ou Google Wallet.</li>
              <li>Vous scannez sa carte pour ajouter des points ou tampons.</li>
            </ol>
            <div className="rounded-lg bg-muted p-3 break-all text-xs font-mono text-foreground">
              {joinUrl}
            </div>
            <p className="text-xs">
              Ce lien utilise automatiquement l&apos;adresse du site sur lequel vous êtes connecté
              (ex. Vercel ou votre domaine). En développement local, vous pouvez forcer une autre URL
              via <code className="rounded bg-muted px-1">VITE_PUBLIC_APP_URL</code> dans <code className="rounded bg-muted px-1">.env</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
