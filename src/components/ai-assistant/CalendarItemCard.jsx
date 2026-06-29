import { Calendar, Check, Clock, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  CALENDAR_STATUS_LABELS,
  formatShortDate,
} from '@/lib/ai-calendar';
import { OBJECTIVE_LABELS, TARGET_SEGMENT_LABELS } from '@/lib/ai-suggestions';

function StatusBadge({ status }) {
  const styles = {
    draft: 'bg-blue-100 text-blue-800',
    ready: 'bg-violet-100 text-violet-800',
    published: 'bg-emerald-100 text-emerald-800',
    ignored: 'bg-slate-200 text-slate-600',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status] || styles.draft)}>
      {CALENDAR_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function CalendarItemCard({
  item,
  mode = 'default',
  loading,
  onScheduleLater,
  onIgnore,
  onCopy,
}) {
  const isDraft = item.status === 'draft';
  const showActions = mode !== 'hub';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{item.title}</CardTitle>
              <StatusBadge status={item.status} />
            </div>
            <CardDescription className="flex flex-wrap items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatShortDate(item.scheduled_date)}
              {item.objective ? (
                <>
                  {' · '}
                  {OBJECTIVE_LABELS[item.objective] || item.objective}
                </>
              ) : null}
              {item.target_segment ? (
                <>
                  {' · '}
                  {TARGET_SEGMENT_LABELS[item.target_segment] || item.target_segment}
                </>
              ) : null}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.offer_message ? (
          <p className="text-sm text-slate-700">{item.offer_message}</p>
        ) : null}

        {item.wallet_message ? (
          <div className="rounded-lg border border-rc-teal/20 bg-rc-teal/5 px-3 py-2 text-sm text-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">
              Message Wallet
              <span className="ml-1 font-normal normal-case text-slate-500">
                ({item.wallet_message.length}/120)
              </span>
            </p>
            <p className="mt-1">{item.wallet_message}</p>
          </div>
        ) : null}

        {item.advice ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {item.advice}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2 pt-1">
          {isDraft && showActions ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={loading}
                onClick={() => onScheduleLater?.(item)}
              >
                <Clock className="h-4 w-4" />
                Programmer plus tard
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={loading}
                onClick={() => onIgnore?.(item)}
              >
                <X className="h-4 w-4" />
                Ignorer
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={loading}
            onClick={() => onCopy?.(item)}
          >
            <Copy className="h-4 w-4" />
            Copier
          </Button>
          {item.status === 'ready' ? (
            <span className="flex items-center gap-1 text-xs text-violet-700">
              <Check className="h-3.5 w-3.5" />
              Prêt à transformer en campagne (phase suivante)
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
