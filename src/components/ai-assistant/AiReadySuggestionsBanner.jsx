import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

export default function AiReadySuggestionsBanner({ insights }) {
  const ready = insights?.ready_this_week ?? 0;
  const pendingOffers = insights?.pending_suggestions?.offers ?? 0;

  if (!ready && !pendingOffers) return null;

  const message = ready > 0
    ? `${ready} suggestion${ready > 1 ? 's' : ''} promo prête${ready > 1 ? 's' : ''} cette semaine`
    : `${pendingOffers} offre${pendingOffers > 1 ? 's' : ''} IA en attente de validation`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rc-teal/30 bg-rc-teal/5 px-4 py-3 text-sm text-slate-800">
      <div className="flex items-start gap-2">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-rc-teal" />
        <div>
          <p className="font-medium">{message}</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Rappel dashboard V2 — validez manuellement avant activation Wallet.
          </p>
        </div>
      </div>
      <Link
        to="/dashboard/ai-assistant/suggestions"
        className="text-sm font-medium text-rc-teal underline"
      >
        Valider maintenant →
      </Link>
    </div>
  );
}
