ALTER TABLE radar_email_contacts ADD COLUMN provider TEXT NOT NULL DEFAULT 'resend'
    CHECK (provider IN ('resend', 'brevo', 'smtp2go', 'mailjet'));
ALTER TABLE radar_email_confirmations ADD COLUMN provider TEXT
    CHECK (provider IN ('resend', 'brevo', 'smtp2go', 'mailjet'));

-- Every challenge issued before this migration was sent through Resend.
UPDATE radar_email_confirmations SET provider = 'resend';

CREATE INDEX radar_email_contacts_provider ON radar_email_contacts(provider);
CREATE INDEX radar_email_confirmations_provider ON radar_email_confirmations(provider, expires_at);

-- Activation consumes the confirmation and inserts the contact in one transaction.
-- Existing contacts keep their original sender when they confirm a settings change.
CREATE TRIGGER radar_email_new_contact_provider AFTER INSERT ON radar_email_contacts
WHEN EXISTS (SELECT 1 FROM radar_email_confirmations WHERE email = NEW.email AND provider IS NOT NULL)
BEGIN
    UPDATE radar_email_contacts
    SET provider = (SELECT provider FROM radar_email_confirmations WHERE email = NEW.email)
    WHERE id = NEW.id;
END;

-- Keys are opaque message identifiers. No addresses or message content are retained.
CREATE TABLE radar_email_reservations (
    message_key TEXT PRIMARY KEY NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('resend', 'brevo', 'smtp2go', 'mailjet')),
    state TEXT NOT NULL CHECK (state IN ('reserved', 'sent', 'unknown')),
    usage_at INTEGER NOT NULL
);
CREATE INDEX radar_email_reservations_usage ON radar_email_reservations(provider, usage_at, state);
CREATE INDEX radar_email_reservations_age ON radar_email_reservations(usage_at);

CREATE TABLE radar_email_provider_state (
    provider TEXT PRIMARY KEY NOT NULL,
    blocked_until INTEGER NOT NULL DEFAULT 0,
    settled_count INTEGER NOT NULL DEFAULT 0
);
INSERT INTO radar_email_provider_state(provider) VALUES ('resend'), ('brevo'), ('smtp2go'), ('mailjet');

CREATE TRIGGER radar_email_count_delivery AFTER UPDATE OF state ON radar_email_reservations
WHEN OLD.state = 'reserved' AND NEW.state IN ('sent', 'unknown')
BEGIN
    UPDATE radar_email_provider_state SET settled_count = settled_count + 1 WHERE provider = NEW.provider;
END;

CREATE TABLE radar_email_quota_observations (
    provider TEXT NOT NULL REFERENCES radar_email_provider_state(provider),
    period TEXT NOT NULL CHECK (period IN ('day', 'month')),
    used INTEGER NOT NULL,
    reported_used INTEGER NOT NULL,
    cycle_observed_at INTEGER NOT NULL,
    settled_count INTEGER NOT NULL,
    observed_at INTEGER NOT NULL,
    valid_until INTEGER NOT NULL,
    exact_reset INTEGER NOT NULL CHECK (exact_reset IN (0, 1)),
    PRIMARY KEY(provider, period)
);
