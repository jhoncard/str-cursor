-- iCal import (multiple feeds per property) + secret export URL for Airbnb/VRBO.
-- Applied via Supabase migrations in hosted project; keep as reference for fresh DBs.

create table if not exists public.property_ical_feeds (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  feed_url text not null,
  source varchar(50) not null,
  last_sync_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists property_ical_feeds_property_id_idx
  on public.property_ical_feeds (property_id);

create unique index if not exists property_ical_feeds_property_id_feed_url_uidx
  on public.property_ical_feeds (property_id, feed_url);

alter table public.properties
  add column if not exists ical_export_token uuid default gen_random_uuid();

update public.properties
set ical_export_token = gen_random_uuid()
where ical_export_token is null;

alter table public.properties
  alter column ical_export_token set not null;

create unique index if not exists properties_ical_export_token_uidx
  on public.properties (ical_export_token);

create table if not exists public.property_ical_blocked_dates (
  ical_feed_id uuid not null references public.property_ical_feeds (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  blocked_date date not null,
  primary key (ical_feed_id, blocked_date)
);

create index if not exists property_ical_blocked_dates_property_date_idx
  on public.property_ical_blocked_dates (property_id, blocked_date);

alter table public.property_ical_feeds enable row level security;

drop policy if exists "Admins full access property_ical_feeds" on public.property_ical_feeds;
create policy "Admins full access property_ical_feeds"
  on public.property_ical_feeds
  for all
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

alter table public.property_ical_blocked_dates enable row level security;

drop policy if exists "Admins read property_ical_blocked_dates" on public.property_ical_blocked_dates;
create policy "Admins read property_ical_blocked_dates"
  on public.property_ical_blocked_dates
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Optional: remove legacy rows from the old approach (blocked in availability only).
delete from public.availability
where status = 'blocked'
  and source::text in ('airbnb', 'vrbo', 'booking_com', 'manual');
