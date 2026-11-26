CREATE TABLE IF NOT EXISTS bookings (
  id text PRIMARY KEY,
  booking_id text NOT NULL,
  payment_id text NOT NULL UNIQUE,
  txid text NOT NULL,
  pi_uid text NOT NULL,
  kind text NOT NULL,
  product_id text NOT NULL,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  guest_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  amount_inr integer NOT NULL DEFAULT 0,
  amount_usd numeric NOT NULL DEFAULT 0,
  amount_pi numeric NOT NULL,
  guests integer NOT NULL DEFAULT 1,
  nights integer NOT NULL DEFAULT 1,
  memo text NOT NULL DEFAULT '',
  payment_method text NOT NULL DEFAULT 'Pi (Mainnet)',
  status text NOT NULL DEFAULT 'confirmed',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_booking_id_idx ON bookings (booking_id);
CREATE INDEX IF NOT EXISTS bookings_pi_uid_idx ON bookings (pi_uid);
CREATE INDEX IF NOT EXISTS bookings_created_at_idx ON bookings (created_at DESC);
