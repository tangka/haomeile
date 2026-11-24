import { Hono } from 'hono';
import { sha256 } from '../lib/crypto';
import { ApiError } from '../lib/errors';
import { detectGrayMarket } from '../lib/graymarket';
import { readJson } from '../lib/json';
import { INPUT_FIELDS } from '../lib/store';
import { validateStoredTombInput } from '../lib/validate';
import { VENDORS, type AppEnv, type TombstoneRow } from '../types';

type ReviewRow = TombstoneRow & { review_epoch: number };
type Reviewer = 'ai' | 'human';
type Action = 'approve' | 'reject';
type Kind = 'new' | 'patch';
type Fields = Pick<TombstoneRow, (typeof INPUT_FIELDS)[number]>;
type PatchSnapshot = {
  before: Fields;
  proposal: string;
  status: Exclude<TombstoneRow['status'], 'withdrawn'>;
  approvedAt: string | null;
};
type Receipt = {
  kind: Kind;
  version: string;
  reviewer: Reviewer;
  decision: Action;
  patch_snapshot: string | null;
};

export function reviewVersion(row: ReviewRow, kind: string) {
  return sha256(
    JSON.stringify([row.id, row.created_at, row.review_epoch, kind]),
  );
}

function content(row: TombstoneRow): Fields {
  return Object.fromEntries(
    INPUT_FIELDS.map((key) => [key, row[key]]),
  ) as Fields;
}

function stale(): never {
  throw new ApiError('STATE_CHANGED', '投稿已变更，请查看最新审核结果。', 409);
}

export const versionedReviews = new Hono<AppEnv>();
versionedReviews.post('/:id/:kind/:action', async (c) => {
  const { id, kind, action } = c.req.param();
  const { expected_review_version: version, reviewer } = await readJson(
    c.req.raw,
  );
  if (
    (kind !== 'new' && kind !== 'patch') ||
    (action !== 'approve' && action !== 'reject') ||
    (reviewer !== 'ai' && reviewer !== 'human') ||
    typeof version !== 'string' ||
    !/^[0-9a-f]{64}$/.test(version)
  )
    throw new ApiError('INVALID_REVIEW', '无效的审核请求。');
  const db = c.env.DB;
  const apply = async () => {
    const [rows, receipts] = await db.batch([
      db.prepare('SELECT * FROM tombstones WHERE id=?').bind(id),
      db
        .prepare('SELECT * FROM submission_reviews WHERE tombstone_id=?')
        .bind(id),
    ]);
    const row = rows.results[0] as ReviewRow | undefined;
    if (!row || row.origin !== 'submission' || row.status === 'withdrawn')
      throw new ApiError('NOT_FOUND', '投稿不存在或已撤回。', 404);
    const prior = receipts.results[0] as Receipt | undefined;
    const correcting = prior?.version === version && prior.kind === kind;
    const confirming = correcting && prior.decision === action;
    let snapshot: PatchSnapshot | undefined;
    let status = row.status;
    let approvedAt = row.approved_at;
    let fields = content(row);
    const result = () =>
      c.json({
        ok: true,
        data: {
          id,
          status,
          review_version: version,
          decision: action,
          reviewer,
        },
      });
    if (correcting) {
      if (prior.reviewer === reviewer && prior.decision === action)
        return result();
      if (prior.reviewer !== 'ai' || reviewer !== 'human') stale();
      if (kind === 'patch')
        snapshot = JSON.parse(prior.patch_snapshot!) as PatchSnapshot;
    } else {
      if ((await reviewVersion(row, kind)) !== version) stale();
      if (
        kind === 'new' &&
        (row.status !== 'pending' || row.pending_patch !== null)
      )
        stale();
      if (kind === 'patch') {
        if (!row.pending_patch) stale();
        snapshot = {
          before: fields,
          proposal: row.pending_patch,
          status,
          approvedAt,
        };
      }
    }
    const now = new Date().toISOString();
    if (!confirming && snapshot) {
      status = snapshot.status;
      fields = snapshot.before;
      approvedAt = snapshot.approvedAt;
      if (action === 'approve') {
        const next = validateStoredTombInput(JSON.parse(snapshot.proposal));
        fields = next;
        status = status === 'hidden' ? 'hidden' : 'approved';
        approvedAt ??= now;
      }
    } else if (!confirming) {
      if (
        action === 'approve' &&
        !(VENDORS as readonly string[]).includes(row.vendor)
      )
        throw new ApiError('UNSUPPORTED_PRODUCT', '当前产品不在收录范围内。');
      status = action === 'approve' ? 'approved' : 'rejected';
      approvedAt = status === 'approved' ? (approvedAt ?? now) : null;
    }
    const flags = detectGrayMarket(
      [fields.codename, fields.nickname, fields.story, fields.epitaph].join(
        '\n',
      ),
    );
    const condition =
      "WHERE id=? AND review_epoch=? AND origin='submission' AND status!='withdrawn'";
    const update = confirming
      ? db
          .prepare(
            `UPDATE tombstones SET pending_patch=pending_patch ${condition}`,
          )
          .bind(id, row.review_epoch)
      : db
          .prepare(
            `UPDATE tombstones SET ${INPUT_FIELDS.map((key) => key + '=?').join(',')},
      status=?,approved_at=?,updated_at=?,pending_patch=NULL,flags=? ${condition}`,
          )
          .bind(
            ...INPUT_FIELDS.map((key) => fields[key]),
            status,
            approvedAt,
            now,
            JSON.stringify(flags),
            id,
            row.review_epoch,
          );
    const updates = await db.batch([
      update,
      // The trigger clears any earlier receipt when the first statement succeeds.
      db
        .prepare(
          `INSERT INTO submission_reviews(tombstone_id,version,kind,reviewer,decision,patch_snapshot)
       SELECT ?,?,?,?,?,? WHERE changes()=1`,
        )
        .bind(
          id,
          version,
          kind,
          reviewer,
          action,
          reviewer === 'ai' && snapshot ? JSON.stringify(snapshot) : null,
        ),
      db
        .prepare(
          `INSERT INTO audit_log(id,tombstone_id,action,actor,detail,created_at)
       SELECT ?,?,?,?,?,? WHERE changes()=1`,
        )
        .bind(
          crypto.randomUUID(),
          id,
          kind === 'patch' ? 'patch_' + action : action,
          c.get('actor'),
          JSON.stringify({ reviewer, version }),
          now,
        ),
    ]);
    if (!updates[0].meta.changes) return null;
    if (!confirming && (status === 'approved' || row.status === 'approved'))
      c.get('onPublishPaths')?.([
        ...new Set([
          '/',
          '/v/' + fields.vendor,
          '/v/' + row.vendor,
          '/t/' + id,
          '/llms-full.txt',
        ]),
      ]);
    return result();
  };
  // A concurrent first decision may now have an idempotent receipt, or an AI
  // result on this exact revision that the human is entitled to override.
  return (await apply()) ?? (await apply()) ?? stale();
});
