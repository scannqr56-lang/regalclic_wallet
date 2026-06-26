-- Phase 2 — Champs branding Wallet sur businesses

alter table public.businesses
  add column if not exists wallet_promo_message text,
  add column if not exists wallet_terms text,
  add column if not exists wallet_hero_url text,
  add column if not exists order_url text,
  add column if not exists instagram_url text,
  add column if not exists wallet_label_color text;

comment on column public.businesses.wallet_promo_message is 'Message court affiché sur la carte Wallet (face ou tagline)';
comment on column public.businesses.wallet_terms is 'Conditions de fidélité (dos de carte)';
comment on column public.businesses.wallet_hero_url is 'Bannière Wallet (strip Apple / hero Google)';
comment on column public.businesses.order_url is 'Lien de commande en ligne';
comment on column public.businesses.instagram_url is 'Profil Instagram ou lien social';
comment on column public.businesses.wallet_label_color is 'Couleur des libellés Apple Wallet (hex #RRGGBB)';

alter table public.businesses
  drop constraint if exists businesses_wallet_label_color_hex;

alter table public.businesses
  add constraint businesses_wallet_label_color_hex
  check (wallet_label_color is null or wallet_label_color ~ '^#[0-9a-fA-F]{6}$');
