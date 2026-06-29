import { Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

function PerforationEdge() {
  return (
    <div
      className="pointer-events-none absolute -top-1 left-2 right-2 flex justify-between gap-0.5"
      aria-hidden
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-inherit shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.12)]"
        />
      ))}
    </div>
  );
}

function StampSlot({ filled, isReward, rewardReady, compact }) {
  const sizeClass = compact
    ? 'h-8 w-8 min-w-[2rem] sm:h-9 sm:w-9'
    : 'h-10 w-10 min-w-[2.5rem] sm:h-11 sm:w-11';

  const showRewardGlow = isReward && rewardReady;

  return (
    <div className="relative flex flex-1 items-center justify-center">
      {showRewardGlow ? (
        <span className="absolute h-full w-full max-h-12 max-w-12 rounded-full bg-amber-400/25 blur-sm" />
      ) : null}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full border-[2.5px] shadow-sm transition-all',
          sizeClass,
          isReward
            ? showRewardGlow
              ? 'border-amber-300 bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_16px_rgba(251,191,36,0.45)]'
              : filled
                ? 'border-amber-300/90 bg-amber-400/35'
                : 'border-dashed border-amber-300/55 bg-amber-400/10'
            : filled
              ? 'border-white bg-white'
              : 'border-dashed border-white/50 bg-white/[0.06]',
        )}
      >
        {isReward ? (
          <Gift
            className={cn(
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
              showRewardGlow ? 'text-amber-50' : 'text-amber-200/80',
            )}
            strokeWidth={2.2}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Ticket à tampons — une seule ligne, cercles pleins sans traits intérieurs.
 */
export default function StampTicketGrid({
  slots,
  balance,
  total,
  rewardLabel,
  labelColor,
  rewardReady = false,
  className,
}) {
  return (
    <div
      className={cn(
        'relative rounded-xl border border-dashed border-white/30 bg-black/25 px-2 py-4 sm:px-3',
        rewardReady && 'border-amber-300/40 bg-amber-500/10',
        className,
      )}
    >
      <PerforationEdge />
      <p
        className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.2em] opacity-90"
        style={labelColor ? { color: labelColor } : undefined}
      >
        Carte à tampons · {balance}/{total}
      </p>
      <div className="flex w-full items-center justify-between gap-1 sm:gap-1.5">
        {slots.map((slot) => (
          <StampSlot
            key={slot.index}
            filled={slot.filled}
            isReward={slot.isReward}
            rewardReady={rewardReady && slot.isReward}
            compact={slots.length > 8}
          />
        ))}
      </div>
      <p className="mt-3 text-center text-xs leading-snug text-white/85">
        Récompense :{' '}
        <span className="font-semibold text-white">{rewardLabel}</span>
      </p>
    </div>
  );
}

export function RewardUnlockedBanner({ text, className }) {
  if (!text) return null;
  return (
    <p
      className={cn(
        'rounded-lg border border-amber-300/50 bg-gradient-to-r from-amber-400/25 to-amber-500/15 px-3 py-2.5 text-center text-sm font-semibold text-amber-50 shadow-[0_0_20px_rgba(251,191,36,0.15)]',
        className,
      )}
    >
      🎉 {text}
    </p>
  );
}
