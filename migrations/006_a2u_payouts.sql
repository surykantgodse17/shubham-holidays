CREATE TABLE IF NOT EXISTS a2u_payouts (
  id text PRIMARY KEY,
  pi_uid text NOT NULL,
  username text NOT NULL DEFAULT '',
  payment_id text NOT NULL UNIQUE,
  txid text NOT NULL DEFAULT '',
  to_address text NOT NULL DEFAULT '',
  amount_pi numeric NOT NULL,
  memo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'completed',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS a2u_payouts_pi_uid_uq ON a2u_payouts (pi_uid);
CREATE INDEX IF NOT EXISTS a2u_payouts_to_address_idx ON a2u_payouts (to_address);
CREATE INDEX IF NOT EXISTS a2u_payouts_created_at_idx ON a2u_payouts (created_at DESC);
