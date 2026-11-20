-- Public-source editorial cases are distinct from voluntary site submissions.
ALTER TABLE tombstones ADD COLUMN origin TEXT NOT NULL DEFAULT 'submission' CHECK(origin IN ('submission','community'));
ALTER TABLE tombstones ADD COLUMN source_url TEXT;
ALTER TABLE tombstones ADD COLUMN source_platform TEXT;
ALTER TABLE tombstones ADD COLUMN source_published_at TEXT;
ALTER TABLE tombstones ADD COLUMN codename_en TEXT;
ALTER TABLE tombstones ADD COLUMN story_en TEXT;
CREATE UNIQUE INDEX idx_tombstone_source_url ON tombstones(source_url) WHERE source_url IS NOT NULL;
CREATE INDEX idx_tombstone_origin_status ON tombstones(origin,status);

-- Keep no source URL or author in this private deduplication ledger. A withdrawn
-- source must not reappear when an old editorial dataset is imported again.
CREATE TABLE community_source_history (
  source_fingerprint TEXT PRIMARY KEY,
  tombstone_id TEXT NOT NULL,
  imported_at TEXT NOT NULL
);

-- This also protects direct, authenticated operator withdrawals of community
-- cases, whose original authors were never issued local owner credentials.
CREATE TRIGGER scrub_withdrawn_tombstone AFTER UPDATE OF status ON tombstones
WHEN NEW.status='withdrawn'
BEGIN
  UPDATE tombstones SET secret_hash='',codename=NULL,nickname=NULL,vendor='other',event_type='other',plan='unknown',born_at=NULL,born_precision='none',died_at='',story=NULL,epitaph=NULL,appeal_status='none',card_style='flower',pending_patch=NULL,flags=NULL,flowers=0,approved_at=NULL,source_url=NULL,source_platform=NULL,source_published_at=NULL,codename_en=NULL,story_en=NULL WHERE id=NEW.id;
  DELETE FROM reports WHERE tombstone_id=NEW.id;
  DELETE FROM flowers WHERE tombstone_id=NEW.id;
  UPDATE audit_log SET detail=NULL WHERE tombstone_id=NEW.id;
END;
