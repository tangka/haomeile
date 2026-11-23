CREATE TABLE radar_email_contacts (
    id TEXT NOT NULL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    platforms INTEGER NOT NULL CHECK (platforms BETWEEN 1 AND 7),
    locale TEXT NOT NULL CHECK (locale IN ('zh', 'en')),
    unsubscribe_hash TEXT NOT NULL UNIQUE,
    confirmed_at INTEGER NOT NULL
);

CREATE TABLE radar_email_confirmations (
    email TEXT NOT NULL PRIMARY KEY,
    platforms INTEGER NOT NULL CHECK (platforms BETWEEN 1 AND 7),
    locale TEXT NOT NULL CHECK (locale IN ('zh', 'en')),
    nonce TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    requested_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
);

CREATE TABLE radar_email_platform_state (
    platform TEXT NOT NULL PRIMARY KEY CHECK (platform IN ('codex', 'claude', 'antigravity')),
    observed_at INTEGER NOT NULL,
    episode_at INTEGER
);

CREATE TABLE radar_email_alerts (
    id TEXT NOT NULL PRIMARY KEY,
    contact_id TEXT NOT NULL REFERENCES radar_email_contacts(id) ON DELETE CASCADE,
    platform TEXT NOT NULL REFERENCES radar_email_platform_state(platform),
    episode_at INTEGER NOT NULL,
    probability INTEGER NOT NULL CHECK (probability > 80 AND probability <= 100),
    locale TEXT NOT NULL CHECK (locale IN ('zh', 'en')),
    next_attempt_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    claim TEXT,
    claim_until INTEGER,
    finished_at INTEGER,
    UNIQUE (contact_id, platform, episode_at)
);

CREATE INDEX radar_email_alerts_due
    ON radar_email_alerts(next_attempt_at) WHERE finished_at IS NULL;
