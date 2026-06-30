import { cn } from '@/lib/utils';
import { getProspectInterestLabel, getProspectStatusLabel } from '@/lib/sales-prospect-constants';

const STATUS_STYLES = {
  new: 'bg-slate-100 text-slate-700',
  to_contact: 'bg-blue-50 text-blue-700',
  contacted: 'bg-sky-50 text-sky-700',
  interested: 'bg-teal-50 text-teal-800',
  demo_requested: 'bg-cyan-50 text-cyan-800',
  demo_done: 'bg-indigo-50 text-indigo-800',
  proposal_sent: 'bg-violet-50 text-violet-800',
  to_follow_up: 'bg-amber-50 text-amber-800',
  signed: 'bg-emerald-50 text-emerald-800',
  refused: 'bg-slate-200 text-slate-700',
  lost: 'bg-slate-300 text-slate-800',
};

const INTEREST_STYLES = {
  hot: 'bg-rc-orange/15 text-rc-orange',
  warm: 'bg-amber-50 text-amber-700',
  cold: 'bg-slate-100 text-slate-600',
  refused: 'bg-slate-200 text-slate-700',
};

export function ProspectStatusBadge({ status, className }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_STYLES[status] || 'bg-slate-100 text-slate-700',
        className,
      )}
    >
      {getProspectStatusLabel(status)}
    </span>
  );
}

export function ProspectInterestBadge({ level, className }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        INTEREST_STYLES[level] || 'bg-slate-100 text-slate-700',
        className,
      )}
    >
      {getProspectInterestLabel(level)}
    </span>
  );
}
