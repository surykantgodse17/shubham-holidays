ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS client_ip text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS checkout_sessions_client_ip_idx ON checkout_sessions (client_ip);
