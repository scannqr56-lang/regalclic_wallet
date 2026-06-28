import { Check, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { chunkStampRows } from '@/lib/stamp-grid';

function PerforationEdge() {
  return (
    <div
      className="pointer-events-none absolute -top-1.5 left-3 right-3 flex justify-between"
      aria-hidden
    >
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rounded-full bg-inherit shadow-[inset_0_0_0_2px_rgba(255,255,255,0.15)]"
        />
      ))}
    </div>
  );
}

function StampSlot({ filled, isReward }) {
  return (
    <div
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 sm:h-10 sm:w-10',
        isReward
          ? filled
            ? 'border-amber-300/90 bg-amber-400/25 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
            : 'border-dashed border-white/35 bg-white/5'
          : filled
            ? 'border-white bg-white text-slate-900 shadow-sm'
            : 'border-dashed border-white/45 bg-white/[0.04]',
      )}
    >
      {isReward ? (
        <Gift
          className={cn('h-4 w-4', filled ? 'text-amber-200' : 'text-white/45')}
          strokeWidth={2}
        />
      ) : filled ? (
        <Check className="h-4 w-4" strokeWidth={3} />
      ) : null}
    </div>
  );
}

/**
 * Ticket à tampons — cercles validés + emplacement récompense.
 */
export default function StampTicketGrid({
  slots,
  columns,
  balance,
  total,
  rewardLabel,
  labelColor,
  className,
}) {
  const rows = chunkStampRows(slots, columns);

  return (
    <div
      className={cn(
        'relative rounded-xl border border-dashed border-white/25 bg-black/20 px-3 py-4 sm:px-4',
        className,
      )}
    >
      <PerforationEdge />
      <p
        className="mb-3 text-center text-[10px] font-semibold uppercase tracking-widest opacity-90"
        style={labelColor ? { color: labelColor } : undefined}
      >
        Carte à tampons · {balance}/{total}
      </p>
      <div className="flex flex-col items-center gap-2.5">
        {rows.map((row) => (
          <div key={row[0].index} className="flex flex-wrap justify-center gap-2">
            {row.map((slot) => (
              <StampSlot key={slot.index} filled={slot.filled} isReward={slot.isReward} />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-xs leading-snug text-white/85">
        Récompense :{' '}
        <span className="font-semibold text-white">{rewardLabel}</span>
      </p>
    </div>
  );
}
