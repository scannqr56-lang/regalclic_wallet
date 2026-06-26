-- Phase 9 — Notifications promotionnelles Wallet

alter table public.wallet_campaigns
  add column if not exists notify_on_activate boolean not null default false;

comment on column public.wallet_campaigns.notify_on_activate is
  'Si true, l''activation envoie une notification Wallet (changeMessage / TEXT_AND_NOTIFY)';

alter table public.wallet_campaign_broadcast_logs
  add column if not exists notification_sent boolean not null default false,
  add column if not exists notify_batch_id uuid;

comment on column public.wallet_campaign_broadcast_logs.notification_sent is
  'True si ce broadcast a tenté une notification Wallet promo';
comment on column public.wallet_campaign_broadcast_logs.notify_batch_id is
  'Identifiant de lot pour quota journalier (1 broadcast notifiant / jour / commerce)';

create index if not exists wallet_campaign_broadcast_logs_notify_quota_idx
  on public.wallet_campaign_broadcast_logs (business_id, created_at desc)
  where notification_sent = true and notify_batch_id is not null;
