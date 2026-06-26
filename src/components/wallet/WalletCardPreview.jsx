import { useMemo, useState } from 'react';
import { QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildWalletPreviewModel } from '@/lib/wallet-card-preview';

function PreviewField({ label, value, labelColor, className }) {
  if (!value) return null;
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80" style={{ color: labelColor }}>
        {label}
      </p>
      <p className="truncate text-sm font-medium text-white">{value}</p>
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
          ) : null}
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
      {model.heroUrl ? (
        <div className="h-24 w-full overflow-hidden">
          <img src={model.heroUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-3 w-full" style={{ backgroundColor: model.primaryColor }} />
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          {model.logoUrl ? (
            <img src={model.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200" />
          ) : (
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: model.primaryColor }}
            >
              RC
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{model.businessName}</p>
            <p className="truncate text-sm text-slate-600">{model.customerDisplayName}</p>
          </div>
        </div>

        <div className="rounded-xl px-3 py-2" style={{ backgroundColor: `${model.primaryColor}18` }}>
          <p className="text-xs font-medium text-slate-600">{model.balanceLabel}</p>
          <p className="text-2xl font-bold tabular-nums" style={{ color: model.primaryColor }}>
            {model.balance}
          </p>
        </div>

        <div className="space-y-2 text-sm text-slate-700">
          <p><span className="font-medium text-slate-500">Programme ·</span> {model.rewardLabel}</p>
          <p><span className="font-medium text-slate-500">Règle ·</span> {model.earnRuleText}</p>
          <p><span className="font-medium text-slate-500">Prochaine ·</span> {model.nextRewardText}</p>
          {model.promoMessage ? (
            <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-amber-900">{model.promoMessage}</p>
          ) : null}
        </div>

        {model.links.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {model.links.map((link) => (
              <span
                key={link.id}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              >
                {link.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-3">
          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <QrCode className="h-16 w-16 text-slate-800" strokeWidth={1.25} />
          </div>
          <p className="font-mono text-xs text-slate-500">{model.cardNumber}</p>
        </div>

        <p className="text-center text-[10px] text-slate-400">Carte propulsée par RegalClic</p>
      </div>
    </div>
  );
}

/**
 * Aperçu HTML approximatif — non représentatif pixel-perfect Apple/Google.
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
            Simulation visuelle — le rendu réel peut varier sur iPhone et Android.
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

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
        Les changements s&apos;appliquent aux <strong>nouvelles cartes</strong> dès l&apos;enregistrement.
        La mise à jour des cartes déjà installées chez vos clients sera proposée dans une prochaine version.
      </p>
    </div>
  );
}
