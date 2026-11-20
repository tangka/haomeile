import {
  EVENTS,
  VENDORS,
  type PublicTombstone,
  type Stats,
  type TombstonePage,
} from '../types';
import { ApiError } from './errors';
import { beijingDay, beijingMidnight, shiftDay } from './time';
export const INPUT_FIELDS = [
  'codename',
  'nickname',
  'vendor',
  'event_type',
  'plan',
  'born_at',
  'born_precision',
  'died_at',
  'story',
  'epitaph',
  'appeal_status',
  'card_style',
] as const;
export const PUBLIC_FIELDS =
  'id,codename,nickname,vendor,event_type,plan,born_at,born_precision,died_at,story,epitaph,appeal_status,card_style,status,flowers,created_at,updated_at,approved_at,origin,source_url,source_platform,source_published_at,codename_en,story_en';
// Values come only from the fixed product enum, never from request parameters.
export const SUPPORTED_VENDOR_FILTER = `vendor IN (${VENDORS.map((value) => `'${value}'`).join(',')})`;
export function validId(id: string): boolean {
  return /^[A-Z2-7]{10}$/.test(id);
}
export async function findPublicTombstone(
  db: D1Database,
  id: string,
): Promise<PublicTombstone | null> {
  if (!validId(id)) return null;
  return db
    .prepare(
      `SELECT ${PUBLIC_FIELDS} FROM tombstones WHERE id=? AND status='approved' AND ${SUPPORTED_VENDOR_FILTER}`,
    )
    .bind(id)
    .first<PublicTombstone>();
}
function filters(
  vendor?: string | null,
  event?: string | null,
): { sql: string; values: string[] } {
  const parts = ["status='approved'", SUPPORTED_VENDOR_FILTER];
  const values: string[] = [];
  if (vendor) {
    if (!(VENDORS as readonly string[]).includes(vendor))
      throw new ApiError('INVALID_FILTER', '请选择有效的产品。');
    parts.push('vendor=?');
    values.push(vendor);
  }
  if (event) {
    if (!(EVENTS as readonly string[]).includes(event))
      throw new ApiError('INVALID_FILTER', '请选择有效的事件种类。');
    parts.push('event_type=?');
    values.push(event);
  }
  return { sql: parts.join(' AND '), values };
}
function encodeCursor(row: PublicTombstone): string {
  return btoa(JSON.stringify([row.approved_at, row.id]))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
function decodeCursor(value: string): [string, string] {
  try {
    if (value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value))
      throw new Error('bad cursor');
    const data: unknown = JSON.parse(
      atob(value.replaceAll('-', '+').replaceAll('_', '/')),
    );
    if (
      !Array.isArray(data) ||
      data.length !== 2 ||
      typeof data[0] !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(data[0]) ||
      typeof data[1] !== 'string' ||
      !validId(data[1])
    )
      throw new Error('bad cursor');
    return data as [string, string];
  } catch {
    throw new ApiError(
      'INVALID_CURSOR',
      '翻页地址不正确，请回到纪念墙重新查看。',
    );
  }
}
export async function listTombstones(
  db: D1Database,
  query: {
    vendor?: string | null;
    event?: string | null;
    cursor?: string | null;
  } = {},
): Promise<TombstonePage> {
  const where = filters(query.vendor, query.event);
  if (query.cursor) {
    const [at, id] = decodeCursor(query.cursor);
    where.sql += ' AND (approved_at<? OR (approved_at=? AND id<?))';
    where.values.push(at, at, id);
  }
  const { results } = await db
    .prepare(
      `SELECT ${PUBLIC_FIELDS} FROM tombstones WHERE ${where.sql} ORDER BY approved_at DESC,id DESC LIMIT 21`,
    )
    .bind(...where.values)
    .all<PublicTombstone>();
  const items = results.slice(0, 20);
  return {
    items,
    next_cursor:
      results.length > 20 ? encodeCursor(items[items.length - 1]!) : null,
  };
}
export async function getStats(
  db: D1Database,
  vendor?: string | null,
  now: Date | number = Date.now(),
): Promise<Stats> {
  const date = beijingDay(now);
  const where = filters(vendor);
  const submissions = { ...where, sql: where.sql + " AND origin='submission'" };
  const start = beijingMidnight(date),
    last7 = beijingMidnight(shiftDay(date, -6)),
    last30 = shiftDay(date, -29);
  const rows = await db.batch<Record<string, unknown>>([
    db
      .prepare(
        `SELECT COALESCE(SUM(origin='submission'),0) total,COALESCE(SUM(origin='community'),0) community_total,COALESCE(SUM(origin='submission' AND created_at>=?),0) today,COALESCE(SUM(origin='submission' AND created_at>=?),0) last7 FROM tombstones WHERE ${where.sql}`,
      )
      .bind(start, last7, ...where.values),
    db
      .prepare(
        `SELECT vendor key,COUNT(*) n FROM tombstones WHERE ${submissions.sql} GROUP BY vendor`,
      )
      .bind(...where.values),
    db
      .prepare(
        `SELECT event_type key,COUNT(*) n FROM tombstones WHERE ${submissions.sql} GROUP BY event_type`,
      )
      .bind(...where.values),
    db
      .prepare(
        `SELECT substr(datetime(created_at,'+8 hours'),1,10) day,COUNT(*) n FROM tombstones WHERE ${submissions.sql} AND created_at>=? GROUP BY day`,
      )
      .bind(...where.values, beijingMidnight(last30)),
    db
      .prepare(
        `SELECT died_at day,COUNT(*) n FROM tombstones WHERE ${submissions.sql} AND died_at>=? GROUP BY died_at`,
      )
      .bind(...where.values, last30),
  ]);
  const counts = (result: D1Result, key: string): number =>
    Number(
      (result.results[0] as Record<string, unknown> | undefined)?.[key] || 0,
    );
  const map = (
    result: D1Result<Record<string, unknown>>,
  ): Map<string, number> =>
    new Map(
      result.results.map((row) => [String(row.key ?? row.day), Number(row.n)]),
    );
  const vendors = map(rows[1]!),
    events = map(rows[2]!),
    reports = map(rows[3]!),
    occurred = map(rows[4]!);
  return {
    date,
    total: counts(rows[0]!, 'total'),
    community_total: counts(rows[0]!, 'community_total'),
    today: counts(rows[0]!, 'today'),
    last7: counts(rows[0]!, 'last7'),
    by_vendor: VENDORS.filter((key) => vendors.has(key)).map((key) => [
      key,
      vendors.get(key)!,
    ]),
    by_event: EVENTS.filter((key) => events.has(key)).map((key) => [
      key,
      events.get(key)!,
    ]),
    timeline: Array.from({ length: 30 }, (_, index) => {
      const day = shiftDay(last30, index);
      return {
        date: day,
        reported: reports.get(day) || 0,
        occurred: occurred.get(day) || 0,
      };
    }),
  };
}
export function auditStatement(
  db: D1Database,
  id: string,
  action: string,
  actor: string,
  detail: string | null = null,
  now = new Date().toISOString(),
): D1PreparedStatement {
  return db
    .prepare(
      'INSERT INTO audit_log (id,tombstone_id,action,actor,detail,created_at) VALUES (?,?,?,?,?,?)',
    )
    .bind(crypto.randomUUID(), id, action, actor, detail, now);
}
