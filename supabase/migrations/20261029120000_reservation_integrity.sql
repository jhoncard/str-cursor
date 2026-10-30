-- Apply separately after reviewing existing data. Never delete/merge paid bookings
-- automatically to make this migration pass. PostgreSQL rolls back the whole file.
BEGIN;
SET LOCAL search_path = public, extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A short maintenance window is recommended: prevent a writer racing preflight.
LOCK TABLE public.bookings IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (
    SELECT payment_intent_id FROM public.bookings
    WHERE payment_intent_id IS NOT NULL
    GROUP BY payment_intent_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate payment intents exist. Reconcile with Stripe before migrating.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.bookings a JOIN public.bookings b
      ON a.property_id = b.property_id AND a.id < b.id
      AND a.booking_status <> 'cancelled' AND b.booking_status <> 'cancelled'
      AND a.check_in < b.check_out AND b.check_in < a.check_out
  ) THEN
    RAISE EXCEPTION 'Overlapping reservations exist. Review with the host before migrating.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_payment_intent_unique
  ON public.bookings (payment_intent_id);
CREATE UNIQUE INDEX IF NOT EXISTS availability_property_id_date_key
  ON public.availability (property_id, date);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass AND conname = 'bookings_no_overlapping_stays') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlapping_stays
      EXCLUDE USING gist (
        property_id WITH =,
        daterange(check_in, check_out, '[)') WITH &&
      ) WHERE (booking_status <> 'cancelled');
  END IF;
END $$;
COMMIT;
