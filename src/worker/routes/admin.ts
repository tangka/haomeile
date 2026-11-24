import { Hono } from 'hono';
import { VENDORS, type AppEnv, type TombstoneRow } from '../types';
import { ApiError } from '../lib/errors';
import { validateStoredTombInput } from '../lib/validate';
import { checkPrivacy } from '../lib/privacy';
import { detectGrayMarket } from '../lib/graymarket';
import { readJson } from '../lib/json';
import { reviewVersion, versionedReviews } from './versioned-review';

const adminRoutes = new Hono<AppEnv>();
adminRoutes.route('/review', versionedReviews);

interface ReportRow {
  id: string;
  tombstone_id: string;
  reason: string;
  note: string | null;
  created_at: string;
  resolved_at: string | null;
}

function parsed(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function safeRow(row: TombstoneRow) {
  const { secret_hash: _secret, flags, pending_patch, ...rest } = row;
  return {
    ...rest,
    flags: parsed(flags) ?? [],
    pending_patch: parsed(pending_patch),
  };
}

function auditAfterUpdate(
  db: D1Database,
  id: string,
  action: string,
  actor: string,
  now: string,
  detail: string | null = null,
) {
  return db
    .prepare(
      `INSERT INTO audit_log (id,tombstone_id,action,actor,detail,created_at)
    SELECT ?,?,?,?,?,? WHERE changes() = 1`,
    )
    .bind(crypto.randomUUID(), id, action, actor, detail, now);
}

async function rowOrFail(db: D1Database, id: string) {
  const row = await db
    .prepare('SELECT * FROM tombstones WHERE id=?')
    .bind(id)
    .first<TombstoneRow>();
  if (!row || row.status === 'withdrawn')
    throw new ApiError('NOT_FOUND', '找不到这块碑。', 404);
  return row;
}

function changed(results: D1Result[]) {
  if (!results[0].meta.changes)
    throw new ApiError(
      'STATE_CHANGED',
      '这条内容的状态已经变了，请刷新后重试。',
      409,
    );
}

adminRoutes.get('/queue', async (c) => {
  const type = c.req.query('type') || 'new';
  const predicates: Record<string, string> = {
    new: "status='pending' AND pending_patch IS NULL",
    patch: "pending_patch IS NOT NULL AND status!='withdrawn'",
    reported:
      "status='hidden' OR (status='approved' AND EXISTS (SELECT 1 FROM reports r WHERE r.tombstone_id=tombstones.id AND r.resolved_at IS NULL))",
  };
  if (!Object.hasOwn(predicates, type))
    throw new ApiError('INVALID_QUEUE', '请选择一个审核队列。');
  const db = c.env.DB;
  const rows = await db
    .prepare(
      `SELECT * FROM tombstones WHERE ${predicates[type]}
    ORDER BY (flags IS NOT NULL AND flags!='[]') DESC,created_at,id LIMIT 100`,
    )
    .all<TombstoneRow & { review_epoch: number }>();
  const counts: Record<string, number> = {};
  for (const [key, predicate] of Object.entries(predicates)) {
    counts[key] =
      (
        await db
          .prepare(
            `SELECT count(*) AS count FROM tombstones WHERE ${predicate}`,
          )
          .first<{ count: number }>()
      )?.count ?? 0;
  }
  const allReports = await db
    .prepare(
      'SELECT id,tombstone_id,reason,note,created_at,resolved_at FROM reports WHERE resolved_at IS NULL ORDER BY created_at',
    )
    .all<ReportRow>();
  const audit = await db
    .prepare(
      'SELECT id,tombstone_id,action,actor,detail,created_at FROM audit_log ORDER BY created_at DESC,id DESC LIMIT 20',
    )
    .all();
  const items = await Promise.all(
    rows.results.map(async (row) => ({
      ...(row.origin === 'submission' && type !== 'reported'
        ? { review_version: await reviewVersion(row, type) }
        : {}),
      ...safeRow(row),
      reports: allReports.results.filter(
        (report) => report.tombstone_id === row.id,
      ),
    })),
  );
  c.header('Cache-Control', 'no-store');
  return c.json({
    ok: true,
    data: { items, counts, audit_log: audit.results },
  });
});

for (const action of ['approve', 'reject', 'hide', 'restore'] as const) {
  adminRoutes.post(`/tombstones/:id/${action}`, async (c) => {
    const body = await readJson(c.req.raw);
    const id = c.req.param('id');
    const row = await rowOrFail(c.env.DB, id);
    if (
      (action === 'approve' || action === 'restore') &&
      !(VENDORS as readonly string[]).includes(row.vendor)
    )
      throw new ApiError(
        'UNSUPPORTED_PRODUCT',
        '这里只接受 Claude、Codex 和 Antigravity 的投稿，请先修改产品。',
      );
    const now = new Date().toISOString();
    let reason = '';
    if (action === 'reject') {
      if (body.reason !== undefined && typeof body.reason !== 'string')
        throw new ApiError('INVALID_REASON', '拒绝原因最多 200 字。');
      reason = (body.reason as string | undefined)?.trim() ?? '';
      if ([...reason].length > 200)
        throw new ApiError('INVALID_REASON', '拒绝原因最多 200 字。');
      const privacy = checkPrivacy(reason);
      if (privacy) throw new ApiError(privacy.code, privacy.message);
    }
    const updates = {
      approve:
        "status='approved',approved_at=COALESCE(approved_at,?),updated_at=?",
      reject: "status='rejected',updated_at=?",
      hide: "status='hidden',updated_at=?",
      restore: "status='approved',updated_at=?",
    };
    const predicates = {
      approve: "status='pending' AND pending_patch IS NULL",
      reject: "status='pending' AND pending_patch IS NULL",
      hide: "status='approved'",
      restore: "status='hidden' AND approved_at IS NOT NULL",
    };
    const bindings = action === 'approve' ? [now, now, id] : [now, id];
    const statements = [
      c.env.DB.prepare(
        `UPDATE tombstones SET ${updates[action]} WHERE id=? AND ${predicates[action]}`,
      ).bind(...bindings),
    ];
    if (action === 'restore') {
      // Restoring is an explicit review decision: close existing reports in the same transaction.
      const auditId = crypto.randomUUID();
      statements.push(
        c.env.DB.prepare(
          `INSERT INTO audit_log (id,tombstone_id,action,actor,detail,created_at)
        SELECT ?,?,'restore',?,json_object('resolved_reports',(SELECT count(*) FROM reports WHERE tombstone_id=? AND resolved_at IS NULL)),?
        WHERE changes()=1`,
        ).bind(auditId, id, c.get('actor'), id, now),
      );
      statements.push(
        c.env.DB.prepare(
          `UPDATE reports SET resolved_at=? WHERE tombstone_id=? AND resolved_at IS NULL
        AND EXISTS (SELECT 1 FROM audit_log WHERE id=?)`,
        ).bind(now, id, auditId),
      );
    } else
      statements.push(
        auditAfterUpdate(
          c.env.DB,
          id,
          action,
          c.get('actor'),
          now,
          reason ? JSON.stringify({ reason }) : null,
        ),
      );
    const results = await c.env.DB.batch(statements);
    changed(results);
    const status =
      action === 'approve' || action === 'restore'
        ? 'approved'
        : action === 'reject'
          ? 'rejected'
          : 'hidden';
    if (status === 'approved') {
      c.get('onPublishPaths')?.(['/', `/v/${row.vendor}`, `/t/${id}`, '/llms-full.txt']);
    }
    return c.json({ ok: true, data: { id, status } });
  });
}

for (const action of ['approve', 'reject'] as const) {
  adminRoutes.post(`/tombstones/:id/patch/${action}`, async (c) => {
    await readJson(c.req.raw);
    const id = c.req.param('id');
    const row = await rowOrFail(c.env.DB, id);
    if (row.origin === 'community')
      throw new ApiError(
        'READ_ONLY_SOURCE',
        '社区整理案例请通过受控导入维护，不接受用户修改。',
        409,
      );
    if (!row.pending_patch)
      throw new ApiError('NO_PATCH', '这块碑没有等待审核的修改。', 409);
    const now = new Date().toISOString();
    let update: D1PreparedStatement;
    let status = row.status;
    if (action === 'approve') {
      const input = validateStoredTombInput(parsed(row.pending_patch));
      const { consent: _consent, ...fields } = input;
      const entries = Object.entries(fields);
      const flags = detectGrayMarket(
        [input.codename, input.nickname, input.story, input.epitaph].join('\n'),
      );
      status = row.status === 'hidden' ? 'hidden' : 'approved';
      update = c.env.DB.prepare(
        `UPDATE tombstones SET ${entries.map(([key]) => `${key}=?`).join(',')},
        status=?,pending_patch=NULL,flags=?,approved_at=COALESCE(approved_at,?),updated_at=?
        WHERE id=? AND status=? AND pending_patch=?`,
      ).bind(
        ...entries.map(([, value]) => value),
        status,
        JSON.stringify(flags),
        now,
        now,
        id,
        row.status,
        row.pending_patch,
      );
    } else {
      const flags = detectGrayMarket(
        [row.codename, row.nickname, row.story, row.epitaph].join('\n'),
      );
      update = c.env.DB.prepare(
        'UPDATE tombstones SET pending_patch=NULL,flags=?,updated_at=? WHERE id=? AND status=? AND pending_patch=?',
      ).bind(JSON.stringify(flags), now, id, row.status, row.pending_patch);
    }
    const results = await c.env.DB.batch([
      update,
      auditAfterUpdate(c.env.DB, id, `patch_${action}`, c.get('actor'), now),
    ]);
    changed(results);
    if (action === 'approve' && status === 'approved') {
      c.get('onPublishPaths')?.(['/', `/v/${row.vendor}`, `/t/${id}`, '/llms-full.txt']);
    }
    return c.json({ ok: true, data: { id, status, pending_patch: null } });
  });
}

adminRoutes.post('/reports/:id/resolve', async (c) => {
  await readJson(c.req.raw);
  const report = await c.env.DB.prepare(
    'SELECT id,tombstone_id FROM reports WHERE id=? AND resolved_at IS NULL',
  )
    .bind(c.req.param('id'))
    .first<ReportRow>();
  if (!report) throw new ApiError('NOT_FOUND', '找不到这条举报。', 404);
  const now = new Date().toISOString();
  const results = await c.env.DB.batch([
    c.env.DB.prepare(
      'UPDATE reports SET resolved_at=? WHERE id=? AND resolved_at IS NULL',
    ).bind(now, report.id),
    auditAfterUpdate(
      c.env.DB,
      report.tombstone_id,
      'resolve_report',
      c.get('actor'),
      now,
      JSON.stringify({ report_id: report.id }),
    ),
  ]);
  changed(results);
  return c.json({ ok: true, data: { id: report.id, resolved_at: now } });
});

export { adminRoutes };
