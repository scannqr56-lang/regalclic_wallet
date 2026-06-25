-- RegalClic Wallet V1 — Storage logos + seed optionnel

-- Bucket public pour logos commerce
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Lecture publique
drop policy if exists "business_assets_select_public" on storage.objects;
create policy "business_assets_select_public"
  on storage.objects
  for select
  using (bucket_id = 'business-assets');

-- Upload : chemin = {business_id}/logo.ext
drop policy if exists "business_assets_insert_member" on storage.objects;
create policy "business_assets_insert_member"
  on storage.objects
  for insert
  with check (
    bucket_id = 'business-assets'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );

drop policy if exists "business_assets_update_member" on storage.objects;
create policy "business_assets_update_member"
  on storage.objects
  for update
  using (
    bucket_id = 'business-assets'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );

drop policy if exists "business_assets_delete_member" on storage.objects;
create policy "business_assets_delete_member"
  on storage.objects
  for delete
  using (
    bucket_id = 'business-assets'
    and split_part(name, '/', 1) in (
      select b.id::text
      from public.businesses b
      where public.is_business_member(b.id)
    )
  );
