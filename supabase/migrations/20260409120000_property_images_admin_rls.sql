-- property_images: admin RLS (was missing; inserts from admin Server Action failed with
-- "new row violates row-level security policy for table property_images").
-- Mirrors public.properties admin policies in properties-admin-rls.sql.

alter table public.property_images enable row level security;

drop policy if exists "Admins can read property_images" on public.property_images;
create policy "Admins can read property_images"
  on public.property_images
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can insert property_images" on public.property_images;
create policy "Admins can insert property_images"
  on public.property_images
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update property_images" on public.property_images;
create policy "Admins can update property_images"
  on public.property_images
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can delete property_images" on public.property_images;
create policy "Admins can delete property_images"
  on public.property_images
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
