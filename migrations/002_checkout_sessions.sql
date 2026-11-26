CREATE TABLE IF NOT EXISTS checkout_sessions (
  id text PRIMARY KEY,
  browser_id text NOT NULL,
  kind text NOT NULL,
  product_id text NOT NULL,
  guests integer NOT NULL,
  nights integer NOT NULL,
  amount_inr integer NOT NULL,
  amount_usd numeric NOT NULL,
  amount_pi numeric NOT NULL,
  title text NOT NULL,
  memo text NOT NULL DEFAULT '',
  booking_id text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz
);

CREATE INDEX IF NOT EXISTS checkout_sessions_browser_idx ON checkout_sessions (browser_id);
CREATE INDEX IF NOT EXISTS checkout_sessions_expires_idx ON checkout_sessions (expires_at);
