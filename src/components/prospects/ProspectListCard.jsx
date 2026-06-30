import { Link } from 'react-router-dom';
import { ChevronRight, MapPin, User } from 'lucide-react';
import { ListCard } from '@/components/ui/list-card';
import { ProspectInterestBadge, ProspectStatusBadge } from '@/components/prospects/ProspectBadges';
import { getBusinessTypeLabel } from '@/lib/sales-prospect-constants';

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function ProspectListCard({ prospect }) {
  const contact = prospect.phone_mobile || prospect.phone_landline || prospect.email || '—';

  return (
    <ListCard className="p-0">
      <Link
        to={`/admin/prospects/${prospect.id}`}
        className="block p-4 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-semibold text-slate-900">{prospect.business_name}</p>
            <p className="text-xs text-slate-500">
              {getBusinessTypeLabel(prospect.business_type)}
              {' · '}
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="h-3 w-3" />
                {prospect.city}
              </span>
            </p>
            <p className="flex items-center gap-1 text-xs text-slate-600">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{prospect.contact_name || contact}</span>
            </p>
            <p className="text-xs text-slate-500">
              Commercial : {prospect.commercial_name || prospect.commercial_code || '—'}
            </p>
          </div>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ProspectInterestBadge level={prospect.interest_level} />
          <ProspectStatusBadge status={prospect.status} />
          {prospect.follow_up_date ? (
            <span className="text-xs text-amber-700">Relance {formatDate(prospect.follow_up_date)}</span>
          ) : null}
        </div>
      </Link>
    </ListCard>
  );
}
