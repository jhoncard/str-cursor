-- PriceLabs: map listing + optional per-night overrides tagged with source pricelabs
alter table public.properties
  add column if not exists pricelabs_listing_id varchar(128);

comment on column public.properties.pricelabs_listing_id is 'PriceLabs listing ID for API/webhook sync; get from PriceLabs dashboard when linking.';

-- booking_source enum: pricelabs (for availability rows written by sync)
do $$ begin
  alter type booking_source add value 'pricelabs';
exception
  when duplicate_object then null;
end $$;
