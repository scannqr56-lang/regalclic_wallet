import WalletCardPreview from '@/components/wallet/WalletCardPreview';
import { cn } from '@/lib/utils';

/**
 * Aperçu carte : toujours visible et sticky sur desktop ;
 * sur mobile, panneau repliable pour libérer l'écran pendant l'édition.
 */
export default function WalletPreviewPanel({ form, loyaltyProgram, className }) {
  return (
    <div className={cn('min-w-0', className)}>
      <details className="group rounded-xl border border-rc-teal/25 bg-gradient-to-br from-rc-teal/5 to-white open:shadow-sm lg:hidden" open>
        <summary className="cursor-pointer list-none px-4 py-3 marker:content-none">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Aperçu de la carte</p>
              <p className="text-xs text-muted-foreground">Apple Wallet · Google Wallet</p>
            </div>
            <span className="text-xs font-medium text-rc-teal group-open:hidden">Afficher</span>
            <span className="hidden text-xs font-medium text-rc-teal group-open:inline">Réduire</span>
          </div>
        </summary>
        <div className="border-t border-rc-teal/15 px-3 pb-3 pt-3">
          <WalletCardPreview form={form} loyaltyProgram={loyaltyProgram} compact />
        </div>
      </details>

      <div className="hidden lg:block">
        <WalletCardPreview form={form} loyaltyProgram={loyaltyProgram} />
      </div>
    </div>
  );
}
