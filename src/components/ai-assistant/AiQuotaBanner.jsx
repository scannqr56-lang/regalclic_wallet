import { AlertTriangle, Sparkles } from 'lucide-react';
import {
  formatGenerationQuotaLine,
  formatUploadQuotaLine,
  getQuotaBlockMessage,
} from '@/lib/ai-quota';

export default function AiQuotaBanner({
  quota,
  kind = 'generation',
  showUsage = false,
  className = '',
}) {
  if (!quota) return null;

  if (!quota.assistant_enabled) {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 ${className}`}>
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Idées indisponibles pour le moment</p>
          <p className="mt-0.5">Réessayez plus tard ou contactez RegalClic.</p>
        </div>
      </div>
    );
  }

  const section = kind === 'upload' ? quota.upload : quota.generation;
  const blockMessage = getQuotaBlockMessage(quota, kind);

  if (!section?.allowed) {
    const isTrialEnded = quota.plan === 'starter' && !quota.trial_available;

    return (
      <div className={`space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {isTrialEnded ? 'Essai terminé' : 'Limite mensuelle atteinte'}
            </p>
            <p className="mt-0.5">
              {blockMessage || (kind === 'upload'
                ? 'Vous avez envoyé tous vos menus prévus ce mois-ci. Vous pouvez toujours modifier un menu existant.'
                : 'Vous avez utilisé toutes vos idées automatiques ce mois-ci. Vous pouvez toujours créer vos offres manuellement, ou nous contacter pour plus d’idées.')}
            </p>
            {isTrialEnded ? (
              <p className="mt-2 text-xs text-amber-800">
                Contactez RegalClic pour continuer à recevoir des idées personnalisées.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!showUsage) return null;

  const usageLine = kind === 'upload'
    ? formatUploadQuotaLine(quota)
    : formatGenerationQuotaLine(quota);

  if (!usageLine) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-slate-500 ${className}`}>
      <Sparkles className="h-3.5 w-3.5 text-rc-teal" />
      <span>{usageLine}</span>
    </div>
  );
}

export function AiUpgradeHint({ quota }) {
  if (!quota || quota.plan !== 'starter' || quota.trial_available) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Besoin de plus d&apos;idées ou de menus ? Contactez RegalClic pour élargir votre forfait.
    </p>
  );
}
