-- Corriger l'email administrateur plateforme
update public.platform_admins
set email = 'admin@regalclic.com'
where email = 'admin@regalclick.com';

insert into public.platform_admins (email)
values ('admin@regalclic.com')
on conflict (email) do nothing;

delete from public.platform_admins
where email = 'admin@regalclick.com';
