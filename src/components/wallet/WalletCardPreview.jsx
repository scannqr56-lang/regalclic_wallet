import { useMemo, useState } from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWalletPreviewModel } from '@/lib/wallet-card-preview';

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

function AppleCardFace({ model }) {
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
              Carte de fidélité
            </p>
            <p className="truncate text-sm font-semibold text-white">{model.businessName}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: model.labelColor }}>
            {model.balanceLabel}
          </p>
          <p className="text-4xl font-bold tabular-nums text-white">{model.balance}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PreviewField label="Client" value={model.customerDisplayName} labelColor={model.labelColor} />
          <PreviewField label="Prochaine récompense" value={model.nextRewardText} labelColor={model.labelColor} />
          <PreviewField label="Récompense" value={model.rewardLabel} labelColor={model.labelColor} />
          {model.rewardsAvailableSample > 0 ? (
            <PreviewField
              label="Récompense disponible"
              value={`1 ${model.rewardLabel.toLowerCase()} à utiliser`}
              labelColor={model.labelColor}
            />
          ) : (
            <PreviewField
              label={model.secondaryMetricLabel}
              value={String(model.secondaryMetricValue)}
              labelColor={model.labelColor}
            />
          )}
        </div>

        {model.promoMessage ? (
          <p className="rounded-lg bg-white/10 px-3 py-2 text-center text-xs text-white/95">
            {model.promoMessage}
          </p>
        ) : (
          <p className="text-center text-xs text-white/75">{model.faceTagline}</p>
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
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
        {model.logoUrl ? (
          <img src={model.logoUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200" />
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: model.primaryColor }}
          >
            RC
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-slate-500">RegalClic</p>
          <p className="truncate text-sm font-semibold text-slate-900">{model.businessName}</p>
        </div>
      </div>

      {model.heroUrl ? (
        <div className="h-20 w-full overflow-hidden">
          <img src={model.heroUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-2 w-full" style={{ backgroundColor: model.primaryColor }} />
      )}

      <div className="space-y-3 p-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Client</p>
          <p className="truncate text-sm font-medium text-slate-900">{model.customerDisplayName}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg px-3 py-2" style={{ backgroundColor: `${model.primaryColor}18` }}>
            <p className="text-[10px] font-medium text-slate-600">{model.balanceLabel}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: model.primaryColor }}>
              {model.balance}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-medium text-slate-600">{model.secondaryMetricLabel}</p>
            <p className="text-2xl font-bold tabular-nums text-slate-900">{model.secondaryMetricValue}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <PreviewField
            label="Récompense"
            value={model.rewardLabel}
            valueClassName="text-slate-800 text-xs"
            className="rounded-lg bg-slate-50 px-2 py-1.5"
          />
          <PreviewField
            label="Prochaine"
            value={model.nextRewardText}
            valueClassName="text-slate-800 text-xs"
            className="rounded-lg bg-slate-50 px-2 py-1.5"
          />
          <PreviewField
            label={model.promoMessage ? 'Offre' : ' '}
            value={model.promoMessage || model.faceTagline}
            valueClassName="text-slate-800 text-xs"
            className="rounded-lg bg-slate-50 px-2 py-1.5"
          />
        </div>

        <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <QrCode className="h-16 w-16 text-slate-800" strokeWidth={1.25} />
          </div>
          <p className="font-mono text-xs text-slate-500">{model.cardNumber}</p>
        </div>

        <p className="text-center text-[10px] text-slate-400">
          Détails (règle, liens, conditions) visibles en ouvrant la carte dans Google Wallet
        </p>
      </div>
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">Aperçu de la carte</p>
          <p className="text-xs text-muted-foreground">
            Rendu calqué sur la structure réelle Apple Wallet et Google Wallet.
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
