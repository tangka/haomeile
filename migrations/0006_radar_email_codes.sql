ALTER TABLE radar_email_confirmations ADD COLUMN code_hash TEXT;
ALTER TABLE radar_email_confirmations ADD COLUMN code_expires_at INTEGER;
ALTER TABLE radar_email_confirmations ADD COLUMN code_failures INTEGER NOT NULL DEFAULT 0;
