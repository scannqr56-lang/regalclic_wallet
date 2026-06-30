import { formatTransactionType } from '@/lib/scan';

export default function TransactionHistoryList({ transactions }) {
  if (!transactions?.length) {
    return <p className="text-sm text-muted-foreground">Aucun mouvement enregistré.</p>;
  }

  return (
    <ul className="space-y-2">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="rounded-lg border bg-white px-3 py-3 text-sm sm:flex sm:items-start sm:justify-between sm:gap-3 sm:py-2"
        >
          <div className="min-w-0 space-y-1">
            <p className="font-medium">{formatTransactionType(tx.type)}</p>
            {tx.note ? <p className="text-muted-foreground">{tx.note}</p> : null}
            {tx.amount_spent ? (
              <p className="text-xs text-muted-foreground">
                Montant :
                {' '}
                {Number(tx.amount_spent).toFixed(2)}
                {' '}
                €
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground sm:hidden">
              {new Date(tx.created_at).toLocaleString('fr-FR')}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:mt-0 sm:block sm:shrink-0 sm:text-right">
            <p className="hidden text-muted-foreground sm:block">
              {new Date(tx.created_at).toLocaleString('fr-FR')}
            </p>
            {tx.points_delta > 0 ? <p className="font-medium text-rc-navy">+{tx.points_delta} pts</p> : null}
            {tx.stamps_delta > 0 ? <p className="font-medium text-rc-navy">+{tx.stamps_delta} tampon</p> : null}
            {tx.rewards_delta !== 0 ? (
              <p className={tx.rewards_delta > 0 ? 'font-medium text-green-600' : 'font-medium text-rc-orange'}>
                {tx.rewards_delta > 0 ? '+' : ''}
                {tx.rewards_delta}
                {' '}
                récomp.
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
