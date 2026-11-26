CREATE TABLE IF NOT EXISTS order_ticket_uses (
  jti text PRIMARY KEY,
  payment_id text NOT NULL,
  uid text NOT NULL,
  status text NOT NULL DEFAULT 'approved',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS order_ticket_uses_expires_idx ON order_ticket_uses (expires_at);
CREATE INDEX IF NOT EXISTS order_ticket_uses_payment_idx ON order_ticket_uses (payment_id);
