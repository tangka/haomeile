CREATE TABLE memorial_numbers (
  memorial_number INTEGER PRIMARY KEY AUTOINCREMENT,
  tombstone_id TEXT NOT NULL UNIQUE REFERENCES tombstones(id) ON DELETE CASCADE
);

-- Preserve publication order for existing records, including hidden memorials.
INSERT INTO memorial_numbers (tombstone_id)
SELECT id
FROM tombstones
WHERE vendor IN ('claude','codex','antigravity')
  AND (status='approved' OR (status='hidden' AND approved_at IS NOT NULL))
ORDER BY COALESCE(approved_at, created_at), id;

CREATE TRIGGER number_inserted_memorial AFTER INSERT ON tombstones
WHEN NEW.status='approved' AND NEW.vendor IN ('claude','codex','antigravity')
BEGIN
  INSERT INTO memorial_numbers (tombstone_id) VALUES (NEW.id);
END;

CREATE TRIGGER number_published_memorial AFTER UPDATE OF status, vendor ON tombstones
WHEN NEW.status='approved' AND NEW.vendor IN ('claude','codex','antigravity')
  AND NOT EXISTS (SELECT 1 FROM memorial_numbers WHERE tombstone_id=NEW.id)
BEGIN
  INSERT INTO memorial_numbers (tombstone_id) VALUES (NEW.id);
END;
