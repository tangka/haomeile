ALTER TABLE tombstones ADD COLUMN review_epoch INTEGER NOT NULL DEFAULT 0;

-- Only an AI decision on the current revision can be overturned from a card.
-- Until then keep both sides of a proposed edit, so a rejection restores the text
-- the owner actually had on the wall. A final human decision retains no text.
CREATE TABLE submission_reviews (
  tombstone_id TEXT PRIMARY KEY REFERENCES tombstones(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('new','patch')),
  reviewer TEXT NOT NULL CHECK(reviewer IN ('ai','human')),
  decision TEXT NOT NULL CHECK(decision IN ('approve','reject')),
  patch_snapshot TEXT
);

CREATE TRIGGER expire_submission_review
AFTER UPDATE OF codename,nickname,vendor,event_type,plan,born_at,born_precision,
  died_at,story,epitaph,appeal_status,card_style,status,pending_patch,origin ON tombstones
WHEN OLD.origin='submission'
BEGIN
  UPDATE tombstones SET review_epoch=review_epoch+1 WHERE id=NEW.id;
  DELETE FROM submission_reviews WHERE tombstone_id=NEW.id;
END;
