-- Fix Supabase : gen_random_bytes() est dans le schéma extensions (pgcrypto)

create extension if not exists pgcrypto with schema extensions;

create or replace function public.generate_qr_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select encode(extensions.gen_random_bytes(24), 'hex');
$$;

create or replace function public.generate_card_number()
returns text
language plpgsql
volatile
set search_path = public, extensions
as $$
declare
  v_code text;
begin
  loop
    v_code := 'RC-' || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    exit when not exists (
      select 1 from public.customer_memberships m where m.card_number = v_code
    );
  end loop;
  return v_code;
end;
$$;
