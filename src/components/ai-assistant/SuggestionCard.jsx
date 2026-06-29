import { Link } from 'react-router-dom';
import { Check, Copy, ExternalLink, Pencil, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  MARGIN_RISK_LABELS,
  OBJECTIVE_LABELS,
  SUGGESTION_STATUS_LABELS,
  SUGGESTION_TYPE_LABELS,
  TARGET_SEGMENT_LABELS,
} from '@/lib/ai-suggestions';

function MarginBadge({ risk }) {
  const styles = {
    low: 'bg-emerald-100 text-emerald-800',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[risk] || styles.medium)}>
      {MARGIN_RISK_LABELS[risk] || risk}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-blue-100 text-blue-800',
    accepted: 'bg-emerald-100 text-emerald-800',
    discarded: 'bg-slate-200 text-slate-600',
    modified: 'bg-violet-100 text-violet-800',
    applied: 'bg-rc-navy text-white',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status] || styles.pending)}>
      {SUGGESTION_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function SuggestionCard({
  suggestion,
  mode = 'hub',
  onUse,
  onEdit,
  onDiscard,
  onCopy,
  loading,
}) {
  const isHub = mode === 'hub';
  const canAct = ['pending', 'accepted', 'modified'].includes(suggestion.status);
  const isApplied = suggestion.status === 'applied';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{suggestion.title}</CardTitle>
              <StatusBadge status={suggestion.status} />
            </div>
            <CardDescription>
              {SUGGESTION_TYPE_LABELS[suggestion.suggestion_type] || suggestion.suggestion_type}
              {suggestion.objective ? (
                <>
                  {' · '}
                  {OBJECTIVE_LABELS[suggestion.objective] || suggestion.objective}
                </>
              ) : null}
            </CardDescription>
          </div>
          <MarginBadge risk={suggestion.margin_risk} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestion.suggestion_type === 'offer' && suggestion.customer_message ? (
          <div className="rounded-lg border border-rc-teal/20 bg-rc-teal/5 px-3 py-2 text-sm text-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">Message carte Wallet</p>
            <p className="mt-1">{suggestion.customer_message}</p>
          </div>
        ) : null}

        {suggestion.suggestion_type === 'notification' ? (
          <div className="rounded-lg border border-rc-teal/20 bg-rc-teal/5 px-3 py-2 text-sm text-slate-800">
            <p className="text-xs font-medium uppercase tracking-wide text-rc-teal">
              Titre Wallet
              {(suggestion.wallet_notification_title || suggestion.title) ? (
                <span className="ml-1 font-normal normal-case text-slate-500">
                  ({(suggestion.wallet_notification_title || suggestion.title).length}/40)
                </span>
              ) : null}
            </p>
            <p className="mt-1 font-medium">
              {suggestion.wallet_notification_title || suggestion.title}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-rc-teal">
              Message carte
              {(suggestion.wallet_notification_body || suggestion.customer_message) ? (
                <span className="ml-1 font-normal normal-case text-slate-500">
                  ({(suggestion.wallet_notification_body || suggestion.customer_message).length}/120)
                </span>
              ) : null}
            </p>
            <p className="mt-1">
              {suggestion.wallet_notification_body || suggestion.customer_message}
            </p>
            {suggestion.description ? (
              <p className="mt-3 text-xs text-slate-600">
                Libellé carte : <span className="font-medium">{suggestion.description}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {suggestion.description && suggestion.suggestion_type === 'offer' ? (
          <p className="text-sm text-slate-600">
            Libellé carte : <span className="font-medium">{suggestion.description}</span>
          </p>
        ) : suggestion.description && suggestion.suggestion_type !== 'offer' && suggestion.suggestion_type !== 'notification' ? (
          <p className="text-sm text-slate-700">{suggestion.description}</p>
        ) : null}

        {suggestion.recommended_timing ? (
          <p className="text-sm text-slate-600">
            Moment suggéré : {suggestion.recommended_timing}
            {suggestion.target_segment ? (
              <>
                {' · '}
                {TARGET_SEGMENT_LABELS[suggestion.target_segment] || suggestion.target_segment}
              </>
            ) : null}
          </p>
        ) : null}

        {suggestion.recommended_threshold != null ? (
          <p className="text-sm font-medium text-slate-900">
            Seuil recommandé : {suggestion.recommended_threshold}
          </p>
        ) : null}

        {suggestion.explanation ? (
          <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {suggestion.explanation}
          </p>
        ) : null}

        {isApplied && suggestion.applied_entity_type === 'wallet_campaign' && suggestion.applied_entity_id ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to={`/dashboard/offers?draft=${suggestion.applied_entity_id}`}>
              <ExternalLink className="h-4 w-4" />
              Voir le brouillon campagne
            </Link>
          </Button>
        ) : null}

        {isApplied && suggestion.applied_entity_type === 'loyalty_program' ? (
          <Button type="button" size="sm" variant="outline" asChild>
            <Link to="/dashboard/program">
              <ExternalLink className="h-4 w-4" />
              Voir le programme
            </Link>
          </Button>
        ) : null}

        {isHub && canAct ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => onUse?.(suggestion)}
            >
              <Sparkles className="h-4 w-4" />
              Utiliser
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => onEdit?.(suggestion)}
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loading}
              onClick={() => onCopy?.(suggestion)}
            >
              <Copy className="h-4 w-4" />
              Copier
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => onDiscard?.(suggestion)}
            >
              <X className="h-4 w-4" />
              Ignorer
            </Button>
          </div>
        ) : null}

        {!isHub && suggestion.status === 'pending' ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" asChild>
              <Link to="/dashboard/ai-assistant/suggestions">
                <Check className="h-4 w-4" />
                Valider dans le hub
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={loading}
              onClick={() => onDiscard?.(suggestion)}
            >
              <X className="h-4 w-4" />
              Ignorer
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
