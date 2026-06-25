import { useSearchParams, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import JoinLayout from '@/pages/join/JoinLayout';
import { fetchPublicMembershipSummary } from '@/lib/join';
import WalletAddButtons from '@/components/wallet/WalletAddButtons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function JoinSuccessPage() {
  const { businessSlug } = useParams();
  const [searchParams] = useSearchParams();
  const membershipId = searchParams.get('membership');
  const isExisting = searchParams.get('existing') === '1';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['membership-public', businessSlug, membershipId],
    queryFn: () => fetchPublicMembershipSummary(businessSlug, membershipId),
    enabled: !!businessSlug && !!membershipId,
  });

  if (!membershipId) {
    return (
      <JoinLayout>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Lien invalide. Veuillez recommencer l&apos;inscription.
          </CardContent>
        </Card>
      </JoinLayout>
    );
  }

  const membership = data?.membership;
  const program = membership?.loyalty_program;
  const customer = membership?.customer;
  const balanceLabel = program?.type === 'stamps'
    ? `${membership?.stamps_balance ?? 0} tampon${(membership?.stamps_balance ?? 0) > 1 ? 's' : ''}`
    : `${membership?.points_balance ?? 0} point${(membership?.points_balance ?? 0) > 1 ? 's' : ''}`;

  return (
    <JoinLayout>
      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-rc-teal/10 px-6 py-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-rc-teal shrink-0" />
          <div>
            <p className="font-semibold text-rc-navy">
              {isExisting ? 'Votre carte est déjà active' : 'Votre carte est prête !'}
            </p>
            <p className="text-sm text-muted-foreground">
              Ajoutez-la à Apple Wallet ou Google Wallet
            </p>
          </div>
        </div>

        <CardHeader>
          <CardTitle className="text-rc-navy">
            {isLoading ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              `Bonjour ${customer?.first_name || ''} 👋`
            )}
          </CardTitle>
          <CardDescription>
            {isLoading ? (
              <Skeleton className="h-4 w-56 mt-2" />
            ) : isError ? (
              'Impossible de charger les détails de la carte.'
            ) : (
              <>
                Solde actuel : <strong>{balanceLabel}</strong>
                {membership?.card_number ? (
                  <> · N° {membership.card_number}</>
                ) : null}
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {program?.reward_label && !isLoading && !isError && (
            <p className="text-sm rounded-lg bg-muted px-3 py-2 text-muted-foreground">
              Prochaine récompense : <strong className="text-foreground">{program.reward_label}</strong>
            </p>
          )}

          <WalletAddButtons membershipId={membershipId} businessSlug={businessSlug} />

          <p className="text-xs text-center text-muted-foreground pt-2">
            Présentez le QR code de votre carte en caisse pour cumuler vos {program?.type === 'stamps' ? 'tampons' : 'points'}.
          </p>
        </CardContent>
      </Card>
    </JoinLayout>
  );
}
