import { useMemo, useState } from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWalletPreviewModel } from '@/lib/wallet-card-preview';
import StampTicketGrid from '@/components/wallet/StampTicketGrid';

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
      <p className="text-4xl font-bold tabular-nums text-white">{model.balance}</p>
    </div>
  );
}

function StampCardBody({ model }) {
  return (
    <div className="space-y-4">
      <StampTicketGrid
        slots={model.stampSlots}
        balance={model.balance}
        total={model.stampsRequired}
        rewardLabel={model.rewardLabel}
        labelColor={model.labelColor}
      />
      <div className="grid grid-cols-2 gap-3">
        <PreviewField label="Client" value={model.customerDisplayName} labelColor={model.labelColor} />
        {model.rewardsAvailableSample > 0 ? (
          <PreviewField
            label="Récompense disponible"
            value={`1 ${model.rewardLabel.toLowerCase()} à utiliser`}
            labelColor={model.labelColor}
          />
        ) : (
          <PreviewField label="Programme" value={model.earnRuleText} labelColor={model.labelColor} />
        )}
      </div>
    </div>
  );
}

function PointsCardBody({ model, statusLabel, statusValue }) {
  return (
    <div className="space-y-4">
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

      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          {model.logoUrl ? (
            <img
              src={model.logoUrl}
              alt=""
              className="h-10 max-w-[120px] object-contain object-left"
            />
          ) : (
            <span className="text-sm font-semibold text-white/90">RegalClic</span>
          )}
          <div className="min-w-0 flex-1 text-right">
            <p className="text-[10px] uppercase tracking-wide text-white/70" style={{ color: model.labelColor }}>
              {isStamps ? 'Carte à tampons' : 'Carte de fidélité'}
            </p>
            <p className="truncate text-sm font-semibold text-white">{model.businessName}</p>
          </div>
        </div>

        {isStamps ? (
          <StampCardBody model={model} />
        ) : (
          <PointsCardBody
            model={model}
            statusLabel={model.secondaryMetricLabel}
            statusValue={String(model.secondaryMetricValue)}
          />
        )}

        {model.promoMessage ? (
          <p className="rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white/95">
            {model.promoMessage}
          </p>
        ) : (
          !isStamps && <p className="text-center text-xs text-white/75">{model.faceTagline}</p>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-white/15 pt-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white p-2">
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

      <div className="space-y-4 p-4">
        {isStamps ? (
          <StampCardBody model={model} />
        ) : (
          <PointsCardBody model={model} statusLabel={statusLabel} statusValue={statusValue} />
        )}

        {model.promoMessage ? (
          <p className="rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white/95">
            {model.promoMessage}
          </p>
        ) : (
          !isStamps && <p className="text-center text-xs text-white/75">{model.faceTagline}</p>
        )}

        <div className="flex flex-col items-center gap-2 border-t border-white/15 pt-4">
          <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-white p-2">
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
export default function WalletCardPreview({ form, loyaltyProgram }) {
  const [variant, setVariant] = useState('apple');
  const model = useMemo(
    () => buildWalletPreviewModel(form, loyaltyProgram),
    [form, loyaltyProgram],
  );
  const isStamps = model.programType === 'stamps';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Aperçu de la carte</p>
          <p className="text-xs text-muted-foreground">
            {isStamps
              ? 'Programme tampons : ticket avec emplacements à valider (aligné Apple / Google).'
              : 'Google et Apple partagent la même structure (grille 2×2, solde centré, promo pleine largeur).'}
          </p>
        </div>
        <div className="flex rounded-lg border bg-white p-0.5 text-xs">
          <button
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              variant === 'apple' ? 'bg-rc-navy text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
            onClick={() => setVariant('apple')}
          >
            Apple
          </button>
          <button
            type="button"
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              variant === 'google' ? 'bg-rc-navy text-white' : 'text-slate-600 hover:bg-slate-50',
            )}
            onClick={() => setVariant('google')}
          >
            Google
          </button>
        </div>
      </div>

      {variant === 'apple' ? <AppleCardFace model={model} /> : <GoogleCardFace model={model} />}

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
        Les cartes déjà installées se mettent à jour après un scan, une sync manuelle (fiche client)
        ou une activation d&apos;offre promo. Si le téléphone affiche encore l&apos;ancien design,
        utilisez « Mettre à jour la carte Wallet » sur la fiche client.
      </p>
    </div>
  );
}
