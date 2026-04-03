-- Supabase Storage setup for property image uploads from the admin UI.
-- 1. Storage → Create bucket → name: property-images → Public bucket (for site URLs).
-- 2. Run the policies below in SQL Editor (adjust bucket id if you changed NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET).

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read property images" on storage.objects;
create policy "Public read property images"
on storage.objects for select
using (bucket_id = 'property-images');

drop policy if exists "Admins can upload property images" on storage.objects;
create policy "Admins can upload property images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'property-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins can update property images" on storage.objects;
create policy "Admins can update property images"
on storage.objects for update to authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "Admins can delete property images" on storage.objects;
create policy "Admins can delete property images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'property-images'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
