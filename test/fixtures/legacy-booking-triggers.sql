-- Relevant behavior observed read-only in Supabase on 2026-10-29.
-- Keep this fixture: the ORM schema alone does not describe production triggers.
ALTER TABLE guests ADD COLUMN total_bookings integer NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD CONSTRAINT chk_dates CHECK (check_out > check_in);
ALTER TABLE bookings ADD CONSTRAINT chk_guests CHECK (num_guests > 0);
ALTER TABLE bookings ADD CONSTRAINT chk_total CHECK (total_amount >= 0);
CREATE FUNCTION block_availability_on_booking() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_status = 'confirmed' THEN
    INSERT INTO availability(property_id, date, status, source)
    SELECT NEW.property_id, d::date, 'booked', NEW.source
    FROM generate_series(NEW.check_in, NEW.check_out - INTERVAL '1 day', INTERVAL '1 day') AS d
    ON CONFLICT(property_id, date) DO UPDATE SET
      status = 'booked', source = EXCLUDED.source, updated_at = now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_block_availability AFTER INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION block_availability_on_booking();
CREATE FUNCTION increment_guest_bookings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE guests SET total_bookings = total_bookings + 1 WHERE id = NEW.guest_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_increment_guest_bookings AFTER INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION increment_guest_bookings();
