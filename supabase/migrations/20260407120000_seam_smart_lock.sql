-- Smart lock (Seam) + default check-in/out times for access code windows.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS check_in_time varchar(5) NOT NULL DEFAULT '16:00',
  ADD COLUMN IF NOT EXISTS check_out_time varchar(5) NOT NULL DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS timezone varchar(64) NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS seam_device_id varchar(128);

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS seam_access_code_id varchar(64),
  ADD COLUMN IF NOT EXISTS door_code varchar(16),
  ADD COLUMN IF NOT EXISTS seam_access_error text;
