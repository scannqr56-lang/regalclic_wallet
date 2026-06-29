-- Phase 2 — Assistant IA Fidélité : bucket privé menus
-- Chemin : {business_id}/ai-menus/{upload_id}.{ext}
-- Accès public interdit — signed URLs via Edge Functions uniquement

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-private',
  'business-private',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture : membres du commerce uniquement, dossier ai-menus
drop policy if exists "business_private_select_member" on storage.objects;
create policy "business_private_select_member"
  on storage.objects
  for select
  using (
    bucket_id = 'business-private'
    and split_part(name, '/', 2) = 'ai-menus'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );

-- Upload menus IA
drop policy if exists "business_private_insert_member" on storage.objects;
create policy "business_private_insert_member"
  on storage.objects
  for insert
  with check (
    bucket_id = 'business-private'
    and split_part(name, '/', 2) = 'ai-menus'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );

drop policy if exists "business_private_update_member" on storage.objects;
create policy "business_private_update_member"
  on storage.objects
  for update
  using (
    bucket_id = 'business-private'
    and split_part(name, '/', 2) = 'ai-menus'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );

drop policy if exists "business_private_delete_member" on storage.objects;
create policy "business_private_delete_member"
  on storage.objects
  for delete
  using (
    bucket_id = 'business-private'
    and split_part(name, '/', 2) = 'ai-menus'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );
