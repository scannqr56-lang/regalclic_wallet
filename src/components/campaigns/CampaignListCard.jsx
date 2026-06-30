import { Megaphone } from 'lucide-react';
import AiOriginBadge from '@/components/ai-assistant/AiOriginBadge';
import {
  ListCard,
  ListCardBody,
  ListCardFooter,
  ListCardHeader,
  ListCardMeta,
} from '@/components/ui/list-card';
import { ResponsiveActions } from '@/components/ui/responsive-actions';
import { cn } from '@/lib/utils';
import { CAMPAIGN_STATUS_LABELS, formatCampaignDates } from '@/lib/campaigns';
import CampaignStatsLine from '@/components/campaigns/CampaignStatsLine';

export function CampaignStatusBadge({ status }) {
  const styles = {
    draft: 'bg-slate-100 text-slate-700',
    active: 'bg-emerald-100 text-emerald-800',
    ended: 'bg-slate-200 text-slate-600',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', styles[status] || styles.draft)}>
      {CAMPAIGN_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function CampaignListCard({
  campaign,
  aiOriginLabel,
  showStats = true,
  featured = false,
  actions,
  className,
}) {
  return (
    <ListCard
      className={cn(
        featured && 'border-emerald-200 bg-emerald-50/50 shadow-none',
        className,
      )}
    >
      <ListCardHeader>
        <div className="flex items-start gap-3">
          {featured ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Megaphone className="h-5 w-5" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900">{campaign.title}</p>
              <CampaignStatusBadge status={campaign.status} />
              {aiOriginLabel ? <AiOriginBadge label={aiOriginLabel} /> : null}
            </div>
            <ListCardMeta>{formatCampaignDates(campaign)}</ListCardMeta>
          </div>
        </div>
      </ListCardHeader>

      <ListCardBody className="mt-0">
        <div
          className={cn(
            'rounded-lg border px-3 py-2.5 text-sm leading-relaxed',
            featured
              ? 'border-emerald-200/80 bg-white/80 text-emerald-950'
              : 'border-rc-teal/20 bg-rc-teal/5 text-slate-800',
          )}
        >
          {campaign.offer_label ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-rc-teal">
              {campaign.offer_label}
            </p>
          ) : null}
          <p className={campaign.offer_label ? 'mt-1' : undefined}>{campaign.message}</p>
        </div>

        {campaign.notify_on_activate ? (
          <p className="text-xs text-muted-foreground">
            Notification à l&apos;activation activée
          </p>
        ) : null}

        {showStats && campaign.status !== 'draft' ? (
          <CampaignStatsLine campaignId={campaign.id} className={featured ? 'text-emerald-800/80' : undefined} />
        ) : null}
      </ListCardBody>

      {actions ? (
        <ListCardFooter>
          <ResponsiveActions>{actions}</ResponsiveActions>
        </ListCardFooter>
      ) : null}
    </ListCard>
  );
}
