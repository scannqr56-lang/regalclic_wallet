import { Link } from 'react-router-dom';
import { ChevronRight, ScanLine } from 'lucide-react';
import { getCustomerDisplayName, getWalletBadges } from '@/lib/customers';
import { Button } from '@/components/ui/button';
import { ListCard, ListCardBody, ListCardFooter, ListCardHeader } from '@/components/ui/list-card';
import { ResponsiveActions } from '@/components/ui/responsive-actions';

function BalanceLabel({ membership, programType }) {
  if (programType === 'stamps') {
    return (
      <span>
        {membership.stamps_balance}
        {' '}
        tampon{membership.stamps_balance > 1 ? 's' : ''}
      </span>
    );
  }
  return (
    <span>
      {membership.points_balance}
      {' '}
      pt{membership.points_balance > 1 ? 's' : ''}
    </span>
  );
}

export default function CustomerListCard({ row, programType }) {
  const walletBadges = getWalletBadges(row);
  const displayName = getCustomerDisplayName(row.customers);
  const contact = row.customers?.phone || row.customers?.email || `Carte ${row.card_number}`;
  const lastVisit = row.updated_at
    ? new Date(row.updated_at).toLocaleDateString('fr-FR')
    : null;

  return (
    <ListCard>
      <ListCardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rc-navy/10 text-sm font-semibold text-rc-navy">
            {(row.customers?.first_name?.[0] || 'C').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-sm text-muted-foreground">{contact}</p>
          </div>
        </div>
      </ListCardHeader>

      <ListCardBody>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Solde · </span>
            <span className="font-semibold text-rc-navy">
              <BalanceLabel membership={row} programType={programType} />
            </span>
          </p>
          {row.rewards_available > 0 ? (
            <p className="font-medium text-rc-orange">
              {row.rewards_available}
              {' '}
              récompense{row.rewards_available > 1 ? 's' : ''}
            </p>
          ) : null}
        </div>
        {lastVisit ? (
          <p className="text-xs text-muted-foreground">
            Dernière activité :
            {' '}
            {lastVisit}
          </p>
        ) : null}
        {walletBadges.length > 0 ? (
          <p className="text-xs text-rc-teal">
            Wallet :
            {' '}
            {walletBadges.join(' · ')}
          </p>
        ) : null}
      </ListCardBody>

      <ListCardFooter>
        <ResponsiveActions className="sm:grid-cols-2">
          <Button asChild variant="default" className="gap-2">
            <Link to={`/dashboard/scan?membership=${row.id}`}>
              <ScanLine className="h-4 w-4" />
              Scanner
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to={`/dashboard/customers/${row.id}`}>
              Voir la fiche
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </ResponsiveActions>
      </ListCardFooter>
    </ListCard>
  );
}
