import { AlertTriangle, Bot, Sparkles } from 'lucide-react';
import {
  formatGenerationQuotaLine,
  formatUploadQuotaLine,
  getQuotaBlockMessage,
  PLAN_LABELS,
} from '@/lib/ai-quota';

export default function AiQuotaBanner({
  quota,
  kind = 'generation',
  showUsage = true,
  className = '',
}) {
  if (!quota) return null;

  if (!quota.assistant_enabled) {
    return (
      <div className={`flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 ${className}`}>
        <Bot className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Assistant IA indisponible</p>
          <p className="mt-0.5">L&apos;assistant est temporairement désactivé. Réessayez plus tard.</p>
        </div>
      </div>
    );
  }

  const section = kind === 'upload' ? quota.upload : quota.generation;
  const blockMessage = getQuotaBlockMessage(quota, kind);
  const usageLine = kind === 'upload'
    ? formatUploadQuotaLine(quota)
    : formatGenerationQuotaLine(quota);

  if (!section?.allowed) {
    const isTrialEnded = quota.plan === 'starter' && !quota.trial_available;

    return (
      <div className={`space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${className}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {isTrialEnded ? 'Essai utilisé — passez à Pro IA' : 'Quota atteint'}
            </p>
            <p className="mt-0.5">{blockMessage}</p>
            {isTrialEnded ? (
              <p className="mt-2 text-xs text-amber-800">
                Contactez RegalClic pour activer le plan Pro IA sur votre commerce.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  if (!showUsage) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-slate-500 ${className}`}>
      <Sparkles className="h-3.5 w-3.5 text-rc-teal" />
      <span>{usageLine}</span>
      {quota.plan ? (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
          {PLAN_LABELS[quota.plan] || quota.plan_label || quota.plan}
        </span>
      ) : null}
    </div>
  );
}

export function AiUpgradeHint({ quota }) {
  if (!quota || quota.plan !== 'starter' || quota.trial_available) return null;

  return (
    <p className="text-xs text-muted-foreground">
      Besoin de plus de générations ou d&apos;uploads ? Contactez RegalClic pour passer au plan Pro IA.
    </p>
  );
}
