PRAGMA foreign_keys = ON;
CREATE TABLE tombstones (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  codename TEXT,
  nickname TEXT,
  vendor TEXT NOT NULL,
  event_type TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'unknown',
  born_at TEXT,
  born_precision TEXT NOT NULL DEFAULT 'none',
  died_at TEXT NOT NULL,
  story TEXT,
  epitaph TEXT,
  appeal_status TEXT NOT NULL DEFAULT 'none',
  card_style TEXT NOT NULL DEFAULT 'flower',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','hidden','withdrawn')),
  pending_patch TEXT,
  flags TEXT,
  flowers INTEGER NOT NULL DEFAULT 0 CHECK(flowers >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  approved_at TEXT
);
CREATE INDEX idx_tomb_status_approved ON tombstones(status, approved_at DESC, id DESC);
CREATE INDEX idx_tomb_vendor ON tombstones(vendor, status);
CREATE INDEX idx_tomb_event ON tombstones(event_type, status);
CREATE TABLE flowers (
  tombstone_id TEXT NOT NULL REFERENCES tombstones(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  day TEXT NOT NULL,
  PRIMARY KEY(tombstone_id, visitor_hash, day)
);
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  tombstone_id TEXT NOT NULL REFERENCES tombstones(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  note TEXT,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX idx_reports_open ON reports(resolved_at, created_at);
CREATE UNIQUE INDEX idx_reports_unique_open ON reports(tombstone_id, visitor_hash) WHERE resolved_at IS NULL;
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start TEXT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY(key, window_start)
);
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  tombstone_id TEXT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_tombstone ON audit_log(tombstone_id, created_at);
