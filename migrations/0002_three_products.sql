-- Correct the product scope without deleting or relabelling unrelated historical content.
UPDATE tombstones
SET vendor = CASE vendor
  WHEN 'chatgpt' THEN 'codex'
  WHEN 'gemini' THEN 'antigravity'
END
WHERE vendor IN ('chatgpt', 'gemini');

UPDATE tombstones
SET pending_patch = json_set(
  pending_patch,
  '$.vendor',
  CASE json_extract(pending_patch, '$.vendor')
    WHEN 'chatgpt' THEN 'codex'
    WHEN 'gemini' THEN 'antigravity'
  END
)
WHERE CASE WHEN json_valid(pending_patch) THEN json_extract(pending_patch, '$.vendor') END
  IN ('chatgpt', 'gemini');
