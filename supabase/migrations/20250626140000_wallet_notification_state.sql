-- Phase 7 — État sync + contexte notification Wallet transactionnelle

alter table public.wallet_passes
  add column if not exists last_synced_balance integer,
  add column if not exists last_synced_rewards_available integer,
  add column if not exists pending_notification jsonb;

comment on column public.wallet_passes.last_synced_balance is 'Dernier solde (points ou tampons) poussé vers Wallet';
comment on column public.wallet_passes.last_synced_rewards_available is 'Dernières récompenses dispo synchronisées';
comment on column public.wallet_passes.pending_notification is 'Contexte changeMessage Apple avant regen pass (APNs)';

alter table public.wallet_sync_logs
  add column if not exists notification_sent boolean not null default false,
  add column if not exists notification_kind text;
