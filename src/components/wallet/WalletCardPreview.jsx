import { useMemo, useState } from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWalletPreviewModel } from '@/lib/wallet-card-preview';
import { RewardUnlockedBanner } from '@/components/wallet/StampTicketGrid';

function PreviewField({ label, value, labelColor, valueClassName, className }) {
  if (!value) return null;
  return (
    <div className={cn('min-w-0', className)}>
      <p
        className="text-[10px] font-semibold uppercase tracking-wide opacity-80"
        style={labelColor ? { color: labelColor } : undefined}
      >
        {label}
      </p>
      <p className={cn('truncate text-sm font-medium', valueClassName || 'text-white')}>{value}</p>
    </div>
  );
}

function PointsBalanceHero({ model }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: model.labelColor }}>
        {model.balanceLabel}
      </p>
      <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">{model.balance}</p>
    </div>
  );
}

function StampBalanceHero({ model }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-center">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: model.labelColor }}>
          {model.balanceLabel}
        </p>
        <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">{model.balance}</p>
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: model.labelColor }}>
          Objectif
        </p>
        <p className="text-3xl font-bold tabular-nums text-white sm:text-4xl">{model.stampsRequired}</p>
      </div>
    </div>
  );
}

function StampCardBody({ model, variant = 'google' }) {
  return (
    <div className="space-y-4">
      {model.hasRewardUnlocked ? (
        <RewardUnlockedBanner text={model.rewardUnlockedBannerText} />
      ) : null}
      {variant === 'google' ? <StampBalanceHero model={model} /> : null}
      <div className="grid grid-cols-2 gap-3">
        <PreviewField label="Client" value={model.customerDisplayName} labelColor={model.labelColor} />
        <PreviewField label="Récompense" value={model.rewardLabel} labelColor={model.labelColor} />
      </div>
      <PreviewField
        label="Offre"
        value={model.promoMessage || model.faceTagline}
        labelColor={model.labelColor}
        valueClassName="text-sm leading-snug text-white whitespace-normal"
      />
    </div>
  );
}

function PointsCardBody({ model, statusLabel, statusValue }) {
  return (
    <div className="space-y-4">
      {model.hasRewardUnlocked ? (
        <RewardUnlockedBanner text={model.rewardUnlockedBannerText} />
      ) : null}
      <PointsBalanceHero model={model} />
      <div className="grid grid-cols-2 gap-3">
        <PreviewField label="Client" value={model.customerDisplayName} labelColor={model.labelColor} />
        <PreviewField label="Prochaine récompense" value={model.nextRewardText} labelColor={model.labelColor} />
        <PreviewField label="Récompense" value={model.rewardLabel} labelColor={model.labelColor} />
        <PreviewField label={statusLabel} value={statusValue} labelColor={model.labelColor} />
      </div>
    </div>
  );
}

function AppleCardFace({ model }) {
  const isStamps = model.programType === 'stamps';

  return (
    <div
      className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10"
      style={{ backgroundColor: model.primaryColor }}
    >
      {model.heroUrl ? (
        <div className="h-20 w-full overflow-hidden bg-black/20">
          <img src={model.heroUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        <div className="flex items-start gap-3">
          {model.logoUrl ? (
            <img
              src={model.logoUrl}
              alt=""
              className="h-10 max-w-[120px] object-contain object-left"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight text-white">RegalClic</p>
            <p className="truncate text-xs font-medium text-white/85">{model.businessName}</p>
          </div>
          {isStamps ? (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: model.labelColor }}>
                {model.balanceLabel}
              </p>
              <p className="text-lg font-bold tabular-nums text-white">
                {model.balance}
                <span className="text-sm font-semibold text-white/70"> / {model.stampsRequired}</span>
              </p>
            </div>
          ) : (
            <div className="min-w-0 flex-1 text-right">
              <p className="text-[10px] uppercase tracking-wide text-white/70" style={{ color: model.labelColor }}>
                Carte de fidélité
              </p>
            </div>
          )}
        </div>

        {isStamps ? (
          <StampCardBody model={model} variant="apple" />
        ) : (
          <PointsCardBody
            model={model}
            statusLabel={model.secondaryMetricLabel}
            statusValue={String(model.secondaryMetricValue)}
          />
        )}

        {model.promoMessage && !isStamps ? (
          <p className="break-words rounded-lg bg-white/10 px-3 py-2 text-center text-xs leading-relaxed text-white/95">
            {model.promoMessage}
          </p>
        ) : (
          !isStamps && <p className="text-center text-xs text-white/75">{model.faceTagline}</p>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-white/15 pt-3 sm:pt-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white p-1.5 sm:h-24 sm:w-24 sm:p-2">
            <QrCode className="h-full w-full text-slate-900" strokeWidth={1.25} />
          </div>
          <p className="font-mono text-xs text-white/80">{model.cardNumber}</p>
        </div>
      </div>
    </div>
  );
}

function GoogleCardFace({ model }) {
  const isStamps = model.programType === 'stamps';
  const statusLabel = model.rewardsAvailableSample > 0 ? 'Dispo' : 'Encore';
  const statusValue = model.rewardsAvailableSample > 0
    ? `1 ${model.rewardLabel.toLowerCase()} à utiliser`
    : String(model.secondaryMetricValue);

  return (
    <div
      className="overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/10"
      style={{ backgroundColor: model.primaryColor }}
    >
      <div className="flex items-center gap-2 px-4 py-2.5">
        {model.logoUrl ? (
          <img src={model.logoUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20" />
        ) : (
          <span className="text-xs font-semibold text-white/90">RegalClic</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-wide text-white/60">RegalClic</p>
          <p className="truncate text-sm font-semibold text-white">{model.businessName}</p>
        </div>
      </div>

      <div className="space-y-3 p-3 sm:space-y-4 sm:p-4">
        {isStamps ? (
          <StampCardBody model={model} />
        ) : (
          <PointsCardBody model={model} statusLabel={statusLabel} statusValue={statusValue} />
        )}

        {model.promoMessage && !isStamps ? (
          <p className="break-words rounded-lg bg-white/10 px-3 py-2 text-center text-xs leading-relaxed text-white/95">
            {model.promoMessage}
          </p>
        ) : (
          !isStamps && <p className="text-center text-xs text-white/75">{model.faceTagline}</p>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-white/15 pt-3 sm:pt-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-white p-1.5 sm:h-24 sm:w-24 sm:p-2">
            <QrCode className="h-full w-full text-slate-900" strokeWidth={1.25} />
          </div>
          <p className="font-mono text-xs text-white/80">{model.cardNumber}</p>
        </div>
      </div>

      {model.heroUrl ? (
        <div className="h-14 w-full overflow-hidden">
          <img src={model.heroUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Aperçu aligné sur le mapping Apple PassKit / Google Wallet (classTemplateInfo).
 */
export default function WalletCardPreview({ form, loyaltyProgram, compact = false }) {
  const [variant, setVariant] = useState('apple');
  const model = useMemo(
    () => buildWalletPreviewModel(form, loyaltyProgram),
    [form, loyaltyProgram],
  );
  const isStamps = model.programType === 'stamps';

  return (
    <div className="mx-auto min-w-0 w-full max-w-sm space-y-3 sm:max-w-md">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {!compact ? (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Aperçu de la carte</p>
            <p className="text-xs text-muted-foreground">
              {isStamps
                ? 'Programme tampons — compteur et offre sur la face de carte.'
                : 'Structure alignée Apple Wallet et Google Wallet.'}
            </p>
          </div>
        ) : null}
        <div
          className={cn(
            'flex rounded-lg border bg-white p-0.5 text-xs',
            compact ? 'w-full' : 'w-full sm:w-auto',
          )}
        >
          <button
            type="button"
            className={cn(
              'min-h-9 flex-1 rounded-md px-3 py-1.5 font-medium transition-colors sm:min-h-0 sm:flex-none sm:px-2.5',
              variant === 'apple' ? 'bg-rc-navy text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
            onClick={() => setVariant('apple')}
          >
            Apple
          </button>
          <button
            type="button"
            className={cn(
              'min-h-9 flex-1 rounded-md px-3 py-1.5 font-medium transition-colors sm:min-h-0 sm:flex-none sm:px-2.5',
              variant === 'google' ? 'bg-rc-navy text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
            onClick={() => setVariant('google')}
          >
            Google
          </button>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        {variant === 'apple' ? <AppleCardFace model={model} /> : <GoogleCardFace model={model} />}
      </div>

      {!compact ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
          Les cartes déjà installées se mettent à jour après un scan, une sync manuelle (fiche client)
          ou une activation d&apos;offre promo. Si le téléphone affiche encore l&apos;ancien design,
          utilisez « Mettre à jour la carte Wallet » sur la fiche client.
        </p>
      ) : null}
    </div>
  );
}
