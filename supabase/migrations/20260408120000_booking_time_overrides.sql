-- Per-booking check-in / check-out time overrides for individual reservations.
-- NULL means "use the property default". See feature doc:
-- docs/SEAM_PHONE_CODE_FEATURE.md (Task 2).

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS check_in_time_override varchar(5),
  ADD COLUMN IF NOT EXISTS check_out_time_override varchar(5);

COMMENT ON COLUMN public.bookings.check_in_time_override IS
  'Per-reservation check-in time override (HH:mm). NULL = use property default.';
COMMENT ON COLUMN public.bookings.check_out_time_override IS
  'Per-reservation check-out time override (HH:mm). NULL = use property default.';
