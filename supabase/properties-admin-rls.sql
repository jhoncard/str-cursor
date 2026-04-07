-- Allow authenticated admins to read/update all properties (RLS was SELECT-only for public).
-- Without this, property updates (including guest_contract_pdf_url) can affect 0 rows with no error.

drop policy if exists "Admins can read all properties" on public.properties;
create policy "Admins can read all properties"
  on public.properties
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

drop policy if exists "Admins can update properties" on public.properties;
create policy "Admins can update properties"
  on public.properties
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
