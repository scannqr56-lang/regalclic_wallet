import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Camera,
  Gift,
  Loader2,
  Plus,
  RotateCcw,
  ScanLine,
  Search,
  Sparkles,
  Stamp,
} from 'lucide-react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import QrScanner from '@/components/scan/QrScanner';
import { useMyBusiness } from '@/hooks/useMyBusiness';
import {
  addPointsToMembership,
  addStampToMembership,
  formatTransactionType,
  lookupMembershipByQrToken,
  normalizeScannedValue,
  redeemMembershipReward,
} from '@/lib/scan';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const SCAN_COOLDOWN_MS = 2500;

function TransactionList({ transactions }) {
  if (!transactions?.length) {
    return <p className="text-sm text-muted-foreground">Aucun mouvement récent.</p>;
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="flex items-start justify-between gap-3 rounded-lg border bg-white px-3 py-2 text-sm"
        >
          <div>
            <p className="font-medium">{formatTransactionType(tx.type)}</p>
            {tx.note ? <p className="text-muted-foreground">{tx.note}</p> : null}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{new Date(tx.created_at).toLocaleString('fr-FR')}</p>
            {tx.points_delta > 0 ? <p className="text-rc-navy">+{tx.points_delta} pts</p> : null}
            {tx.stamps_delta > 0 ? <p className="text-rc-navy">+{tx.stamps_delta} tampon</p> : null}
            {tx.rewards_delta !== 0 ? (
              <p className={tx.rewards_delta > 0 ? 'text-green-600' : 'text-rc-orange'}>
                {tx.rewards_delta > 0 ? '+' : ''}
                {tx.rewards_delta} récomp.
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function MembershipPanel({
  data,
  loyaltyProgram,
  onReset,
  onRefresh,
}) {
  const queryClient = useQueryClient();
  const membership = data.membership;
  const customer = data.customer;
  const program = data.loyalty_program || loyaltyProgram;
  const isStamps = program?.type === 'stamps';

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const refreshStats = () => {
    queryClient.invalidateQueries({ queryKey: ['business-stats'] });
    onRefresh?.();
  };

  const pointsMutation = useMutation({
    mutationFn: () => addPointsToMembership(membership.id, {
      amountSpent: parseFloat(amount.replace(',', '.')),
      note,
    }),
    onSuccess: (updated) => {
      toast.success('Points ajoutés', {
        description: `Nouveau solde : ${updated.points_balance} pts`,
      });
      setAmount('');
      setNote('');
      refreshStats();
    },
    onError: (error) => toast.error(error.message || 'Erreur'),
  });

  const stampMutation = useMutation({
    mutationFn: () => addStampToMembership(membership.id, note),
    onSuccess: (updated) => {
      toast.success('Tampon ajouté', {
        description: `${updated.stamps_balance} / ${program?.stamps_required ?? '?'} tampons`,
      });
      setNote('');
      refreshStats();
    },
    onError: (error) => toast.error(error.message || 'Erreur'),
  });

  const redeemMutation = useMutation({
    mutationFn: () => redeemMembershipReward(membership.id, note),
    onSuccess: (updated) => {
      toast.success('Récompense utilisée', {
        description: `${updated.rewards_available} récompense(s) restante(s)`,
      });
      setNote('');
      refreshStats();
    },
    onError: (error) => toast.error(error.message || 'Erreur'),
  });

  const parsedAmount = parseFloat(amount.replace(',', '.'));
  const previewPoints = !Number.isNaN(parsedAmount) && parsedAmount > 0
    ? Math.floor(parsedAmount * (program?.points_per_euro ?? 1))
    : 0;

  const busy = pointsMutation.isPending || stampMutation.isPending || redeemMutation.isPending;

  return (
    <div className="space-y-4">
      <Card className="border-rc-teal/30 bg-gradient-to-br from-white to-rc-teal/5">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">
                {customer?.first_name || 'Client'}
              </CardTitle>
              <CardDescription>
                Carte n° {membership.card_number}
              </CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4" />
              Autre client
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isStamps ? 'Tampons' : 'Points'}
            </p>
            <p className="mt-1 text-3xl font-bold text-rc-navy">
              {isStamps ? membership.stamps_balance : membership.points_balance}
              {isStamps && program?.stamps_required ? (
                <span className="text-lg font-normal text-muted-foreground">
                  {' '}
                  / {program.stamps_required}
                </span>
              ) : null}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Récompenses
            </p>
            <p className="mt-1 text-3xl font-bold text-rc-orange">
              {membership.rewards_available}
            </p>
            <p className="text-xs text-muted-foreground">
              {program?.reward_label || 'Récompense'}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Programme
            </p>
            <p className="mt-1 text-lg font-semibold">
              {isStamps ? 'Tampons' : 'Points'}
            </p>
            {!isStamps && program?.reward_threshold ? (
              <p className="text-xs text-muted-foreground">
                Seuil : {program.reward_threshold} pts
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Action</CardTitle>
          <CardDescription>
            {isStamps
              ? 'Ajoutez un tampon après chaque visite ou achat.'
              : 'Saisissez le montant dépensé pour créditer les points.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isStamps ? (
            <Button
              type="button"
              className="h-12 w-full gap-2"
              disabled={busy}
              onClick={() => stampMutation.mutate()}
            >
              {stampMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Stamp className="h-5 w-5" />
              )}
              +1 tampon
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="amount">Montant dépensé (€)</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex. 24,50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                {previewPoints > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    → <span className="font-medium text-rc-navy">+{previewPoints} points</span>
                    {' '}
                    ({program?.points_per_euro ?? 1} pt/€)
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                className="h-12 w-full gap-2"
                disabled={busy || previewPoints <= 0}
                onClick={() => pointsMutation.mutate()}
              >
                {pointsMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="h-5 w-5" />
                )}
                Ajouter les points
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Note (optionnel)</Label>
            <Input
              id="note"
              placeholder="Ex. déjeuner, table 4…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {membership.rewards_available > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-rc-orange text-rc-orange hover:bg-rc-orange/10"
              disabled={busy}
              onClick={() => redeemMutation.mutate()}
            >
              {redeemMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Gift className="h-4 w-4" />
              )}
              Utiliser une récompense
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Derniers mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionList transactions={data.recent_transactions} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ScanPage() {
  const { business, loyaltyProgram, isLoading } = useMyBusiness();
  const [mode, setMode] = useState('scan');
  const [scanActive, setScanActive] = useState(true);
  const [manualToken, setManualToken] = useState('');
  const [lookupData, setLookupData] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const lastScanRef = useRef({ value: '', at: 0 });

  const runLookup = useCallback(async (rawValue) => {
    const token = normalizeScannedValue(rawValue);
    if (!token) return;

    setLookupLoading(true);
    setLookupError('');
    try {
      const data = await lookupMembershipByQrToken(token);
      setLookupData(data);
      setScanActive(false);
      toast.success('Carte trouvée', {
        description: data.customer?.first_name || 'Client identifié',
      });
    } catch (error) {
      setLookupData(null);
      const message = error?.message || 'Carte introuvable';
      setLookupError(message);
      toast.error(message);
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const handleScan = useCallback((value) => {
    const now = Date.now();
    if (
      value === lastScanRef.current.value
      && now - lastScanRef.current.at < SCAN_COOLDOWN_MS
    ) {
      return;
    }
    lastScanRef.current = { value, at: now };
    runLookup(value);
  }, [runLookup]);

  const handleManualSearch = (event) => {
    event.preventDefault();
    runLookup(manualToken);
  };

  const resetClient = () => {
    setLookupData(null);
    setLookupError('');
    setManualToken('');
    setScanActive(true);
    lastScanRef.current = { value: '', at: 0 };
  };

  const refreshMembership = async () => {
    if (!lookupData?.membership?.qr_token) return;
    try {
      const data = await lookupMembershipByQrToken(lookupData.membership.qr_token);
      setLookupData(data);
    } catch {
      // keep current view on refresh failure
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Scanner">
        <Skeleton className="h-64 w-full" />
      </DashboardLayout>
    );
  }

  if (!business) {
    return (
      <DashboardLayout title="Scanner">
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
      <DashboardLayout title="Scanner">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rc-orange" />
              Programme requis
            </CardTitle>
            <CardDescription>
              Créez votre programme de fidélité avant de scanner des clients.
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
      title="Scanner client"
      description="Scannez le QR code sur la carte Wallet du client."
    >
      <div className="space-y-6">
        {!lookupData ? (
          <>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'scan' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => {
                  setMode('scan');
                  setScanActive(true);
                  setLookupError('');
                }}
              >
                <Camera className="h-4 w-4" />
                Caméra
              </Button>
              <Button
                type="button"
                variant={mode === 'manual' ? 'default' : 'outline'}
                className="gap-2"
                onClick={() => {
                  setMode('manual');
                  setScanActive(false);
                  setLookupError('');
                }}
              >
                <Search className="h-4 w-4" />
                Saisie manuelle
              </Button>
            </div>

            {mode === 'scan' ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ScanLine className="h-5 w-5" />
                    Scanner le QR de la carte
                  </CardTitle>
                  <CardDescription>
                    Pointez la caméra vers le QR affiché dans Apple Wallet ou Google Wallet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <QrScanner
                    active={scanActive && !lookupLoading}
                    onResult={handleScan}
                    onError={() => setLookupError('Accès caméra refusé ou indisponible.')}
                  />
                  {lookupLoading ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recherche de la carte…
                    </div>
                  ) : null}
                  {lookupError ? (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{lookupError}</p>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Code carte</CardTitle>
                  <CardDescription>
                    Collez le token QR si la caméra ne fonctionne pas.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleManualSearch} className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      placeholder="Token QR de la carte"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={lookupLoading || !manualToken.trim()}>
                      {lookupLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
                    </Button>
                  </form>
                  {lookupError ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{lookupError}</p>
                  ) : null}
                </CardContent>
              </Card>
            )}

            <Card className="border-dashed">
              <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-rc-teal" />
                <p>
                  Le client doit d&apos;abord s&apos;inscrire via votre QR d&apos;inscription et ajouter sa carte
                  à son Wallet. Vous scannez ensuite le QR sur sa carte pour créditer points ou tampons.
                </p>
              </CardContent>
            </Card>
          </>
        ) : (
          <MembershipPanel
            data={lookupData}
            loyaltyProgram={loyaltyProgram}
            onReset={resetClient}
            onRefresh={refreshMembership}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
