import { Hono, type Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { REPORT_REASONS, type AppEnv, type TombstoneRow } from '../types';
import {
  constantTimeEqual,
  createCredentials,
  hashSecret,
  hashVisitor,
} from '../lib/crypto';
import { ApiError } from '../lib/errors';
import { detectGrayMarket } from '../lib/graymarket';
import { readJson } from '../lib/json';
import { checkPrivacy } from '../lib/privacy';
import { verifyRadarAccess } from '../lib/radar-gate';
import { reserveRate, releaseRate } from '../lib/ratelimit';
import {
  auditStatement,
  findPublicTombstone,
  getStats,
  INPUT_FIELDS,
  listTombstones,
  SUPPORTED_VENDOR_FILTER,
  validId,
} from '../lib/store';
import { beijingDay } from '../lib/time';
import { verifyTurnstile } from '../lib/turnstile';
import { validateTombInput, validateVisitor } from '../lib/validate';
import { requestLocale, tr } from '../../shared/i18n';

export const publicRoutes = new Hono<AppEnv>();
publicRoutes.onError((error, c) => {
  const locale = requestLocale(c.req.raw);
  if (error instanceof ApiError)
    return c.json(
      {
        ok: false,
        error: {
          code: error.code,
          message: tr(error.message, locale),
          ...(error.fields
            ? {
                fields: Object.fromEntries(
                  Object.entries(error.fields).map(([key, value]) => [
                    key,
                    tr(value, locale),
                  ]),
                ),
              }
            : {}),
        },
      },
      error.status as ContentfulStatusCode,
    );
  return c.json(
    {
      ok: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: tr('服务器出了点问题。过几分钟再试，碑文不会丢。', locale),
      },
    },
    500,
  );
});
async function rate(
  c: Context<AppEnv>,
  action: string,
  limit: number,
): Promise<void> {
  await reserveRate(
    c.env.DB,
    c.env.PEPPER,
    c.req.header('CF-Connecting-IP') || null,
    action,
    limit,
  );
}
async function authenticate(
  c: Context<AppEnv>,
  body: Record<string, unknown>,
): Promise<TombstoneRow> {
  const reservation = await reserveRate(
    c.env.DB,
    c.env.PEPPER,
    c.req.header('CF-Connecting-IP') || null,
    'auth',
    20,
    true,
  );
  const id = typeof body.id === 'string' && validId(body.id) ? body.id : '';
  const secret =
    typeof body.secret === 'string' && body.secret.length <= 128
      ? body.secret
      : '';
  const computed = await hashSecret(secret, c.env.PEPPER);
  const row = await c.env.DB.prepare('SELECT * FROM tombstones WHERE id=?')
    .bind(id)
    .first<TombstoneRow>();
  const equal = constantTimeEqual(computed, row?.secret_hash || '0'.repeat(64));
  if (!row || !equal || row.origin === 'community')
    throw new ApiError(
      'INVALID_CREDENTIALS',
      '编号或密钥不对，再检查一下。',
      403,
    );
  await releaseRate(c.env.DB, reservation);
  return row;
}

publicRoutes.get('/tombstones', async (c) =>
  c.json({
    ok: true,
    data: await listTombstones(c.env.DB, {
      vendor: c.req.query('vendor'),
      event: c.req.query('event'),
      cursor: c.req.query('cursor'),
    }),
  }),
);
publicRoutes.get('/stats', async (c) =>
  c.json({ ok: true, data: await getStats(c.env.DB, c.req.query('vendor')) }),
);
publicRoutes.post('/radar/verify', verifyRadarAccess);
publicRoutes.get('/tombstones/:id', async (c) => {
  const tombstone = await findPublicTombstone(c.env.DB, c.req.param('id'));
  if (!tombstone) throw new ApiError('NOT_FOUND', '这里什么也没有。', 404);
  return c.json({ ok: true, data: tombstone });
});
publicRoutes.post('/tombstones', async (c) => {
  const body = await readJson(c.req.raw);
  const input = validateTombInput(body);
  await rate(c, 'submit', 3);
  await verifyTurnstile(body.turnstile_token, c.env);
  const credentials = await createCredentials(c.env.PEPPER);
  const flags = detectGrayMarket(
    [input.codename, input.nickname, input.story, input.epitaph].join('\n'),
  );
  const now = new Date().toISOString();
  const columns = [...INPUT_FIELDS];
  await c.env.DB.prepare(
    `INSERT INTO tombstones (id,secret_hash,${columns.join(',')},flags,created_at,updated_at) VALUES (${Array.from({ length: columns.length + 5 }, () => '?').join(',')})`,
  )
    .bind(
      credentials.id,
      credentials.secret_hash,
      ...columns.map((key) => input[key]),
      JSON.stringify(flags),
      now,
      now,
    )
    .run();
  return c.json(
    { ok: true, data: { id: credentials.id, secret: credentials.secret } },
    201,
  );
});
publicRoutes.post('/manage/status', async (c) => {
  const row = await authenticate(c, await readJson(c.req.raw));
  const { secret_hash: _secret, flags: _flags, pending_patch, ...safe } = row;
  return c.json({
    ok: true,
    data: {
      ...safe,
      pending_patch: pending_patch
        ? (JSON.parse(pending_patch) as unknown)
        : null,
    },
  });
});
publicRoutes.post('/manage/patch', async (c) => {
  const body = await readJson(c.req.raw);
  const row = await authenticate(c, body);
  const input = validateTombInput(body.patch);
  await rate(c, 'patch', 10);
  const flags = detectGrayMarket(
    [input.codename, input.nickname, input.story, input.epitaph].join('\n'),
  );
  const result = await c.env.DB.prepare(
    "UPDATE tombstones SET pending_patch=?,flags=?,updated_at=? WHERE id=? AND status!='withdrawn'",
  )
    .bind(
      JSON.stringify(input),
      JSON.stringify(flags),
      new Date().toISOString(),
      row.id,
    )
    .run();
  if (!result.meta.changes)
    throw new ApiError('NOT_FOUND', '这里什么也没有。', 404);
  return c.json({
    ok: true,
    data: { status: row.status, pending_patch: input },
  });
});
publicRoutes.post('/manage/withdraw', async (c) => {
  const row = await authenticate(c, await readJson(c.req.raw));
  const now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE tombstones SET secret_hash='',codename=NULL,nickname=NULL,vendor='other',event_type='other',plan='unknown',born_at=NULL,born_precision='none',died_at='',story=NULL,epitaph=NULL,appeal_status='none',card_style='flower',status='withdrawn',pending_patch=NULL,flags=NULL,flowers=0,updated_at=?,approved_at=NULL,source_url=NULL,source_platform=NULL,source_published_at=NULL,codename_en=NULL,story_en=NULL WHERE id=?",
    ).bind(now, row.id),
    c.env.DB.prepare('DELETE FROM reports WHERE tombstone_id=?').bind(row.id),
    c.env.DB.prepare('DELETE FROM flowers WHERE tombstone_id=?').bind(row.id),
    c.env.DB.prepare(
      'UPDATE audit_log SET detail=NULL WHERE tombstone_id=?',
    ).bind(row.id),
    auditStatement(c.env.DB, row.id, 'withdraw', 'owner', null, now),
  ]);
  return c.json({ ok: true, data: { status: 'withdrawn' } });
});
publicRoutes.post('/tombstones/:id/flower', async (c) => {
  const body = await readJson(c.req.raw),
    id = c.req.param('id');
  const visitor = validateVisitor(body.visitor_id);
  await rate(c, 'flower', 100);
  const visitorHash = await hashVisitor(visitor, c.env.PEPPER);
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO flowers (tombstone_id,visitor_hash,day) SELECT id,?,? FROM tombstones WHERE id=? AND status='approved' AND ${SUPPORTED_VENDOR_FILTER}`,
    ).bind(visitorHash, beijingDay(), id),
    c.env.DB.prepare(
      `UPDATE tombstones SET flowers=flowers+changes() WHERE id=? AND status='approved' AND ${SUPPORTED_VENDOR_FILTER}`,
    ).bind(id),
  ]);
  const tombstone = await findPublicTombstone(c.env.DB, id);
  if (!tombstone) throw new ApiError('NOT_FOUND', '这里什么也没有。', 404);
  return c.json({
    ok: true,
    data: { flowers: tombstone.flowers, flowered: true },
  });
});
publicRoutes.post('/tombstones/:id/report', async (c) => {
  const body = await readJson(c.req.raw),
    id = c.req.param('id');
  const visitor = validateVisitor(body.visitor_id);
  if (
    typeof body.reason !== 'string' ||
    !(REPORT_REASONS as readonly string[]).includes(body.reason)
  )
    throw new ApiError('VALIDATION_ERROR', '请选择举报原因。', 400, {
      reason: '请选择举报原因。',
    });
  if (body.note !== undefined && typeof body.note !== 'string')
    throw new ApiError('VALIDATION_ERROR', '举报说明格式不正确。');
  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (Array.from(note).length > 200)
    throw new ApiError('VALIDATION_ERROR', '举报说明最多 200 个字。', 400, {
      note: '举报说明最多 200 个字。',
    });
  const privacy = checkPrivacy(note);
  if (privacy)
    throw new ApiError('VALIDATION_ERROR', privacy.message, 400, {
      note: privacy.message,
    });
  if (!(await findPublicTombstone(c.env.DB, id)))
    throw new ApiError('NOT_FOUND', '这里什么也没有。', 404);
  await rate(c, 'report', 10);
  await verifyTurnstile(body.turnstile_token, c.env);
  const visitorHash = await hashVisitor(visitor, c.env.PEPPER),
    now = new Date().toISOString();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT OR IGNORE INTO reports (id,tombstone_id,reason,note,visitor_hash,created_at) SELECT ?,id,?,?,?,? FROM tombstones WHERE id=? AND status='approved' AND ${SUPPORTED_VENDOR_FILTER}`,
    ).bind(crypto.randomUUID(), body.reason, note, visitorHash, now, id),
    c.env.DB.prepare(
      `UPDATE tombstones SET status='hidden',updated_at=? WHERE id=? AND status='approved' AND ${SUPPORTED_VENDOR_FILTER} AND (SELECT COUNT(DISTINCT visitor_hash) FROM reports WHERE tombstone_id=? AND resolved_at IS NULL)>=3`,
    ).bind(now, id, id),
    c.env.DB.prepare(
      "INSERT INTO audit_log (id,tombstone_id,action,actor,detail,created_at) SELECT ?,?,'hide','system',NULL,? WHERE changes()>0",
    ).bind(crypto.randomUUID(), id, now),
  ]);
  return c.json({ ok: true, data: { received: true } });
});
