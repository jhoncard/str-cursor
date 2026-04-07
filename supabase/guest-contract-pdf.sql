-- Replace plain-text contract with PDF URL (stored in same bucket as property images).
alter table public.properties drop column if exists guest_contract;

alter table public.properties
  add column if not exists guest_contract_pdf_url text;

comment on column public.properties.guest_contract_pdf_url is 'Public URL of rental agreement PDF; guest must accept before checkout when non-null.';
