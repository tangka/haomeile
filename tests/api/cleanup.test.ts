import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { cleanup } from '../../src/worker/cleanup';
import { beijingDay, shiftDay } from '../../src/worker/lib/time';
import type { TombStatus } from '../../src/worker/types';

const now = new Date('2026-11-19T20:17:00.000Z'); // Beijing 04:17, the scheduled cleanup time.
const before = (days: number, delta = 0) =>
  new Date(now.getTime() - days * 86_400_000 + delta).toISOString();
async function tombstone(
  id: string,
  status: TombStatus,
  updated: string,
  flowers = 0,
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,flowers,created_at,updated_at) VALUES (?,'test-hash','清理测试示例','other','other','2026-11-18','这是仅用于保留期限测试的示例内容。',?,?,?,?)",
  )
    .bind(id, status, flowers, updated, updated)
    .run();
}
async function count(table: string): Promise<number> {
  return Number(
    await env.DB.prepare(`SELECT COUNT(*) n FROM ${table}`).first('n'),
  );
}
describe('scheduled data retention', () => {
  it('deletes only rejections older than thirty days and cascades dependent private records', async () => {
    await tombstone('AAAAAAAAAA', 'rejected', before(30, -1));
    await tombstone('BBBBBBBBBB', 'rejected', before(30));
    await tombstone('CCCCCCCCCC', 'rejected', before(30, 1));
    for (const [id, status] of [
      ['DDDDDDDDDD', 'approved'],
      ['EEEEEEEEEE', 'hidden'],
      ['FFFFFFFFFF', 'pending'],
      ['GGGGGGGGGG', 'withdrawn'],
    ] as const)
      await tombstone(id, status, before(365));
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO flowers VALUES ('AAAAAAAAAA','test-visitor',?)",
      ).bind(beijingDay(now)),
      env.DB.prepare(
        "INSERT INTO reports VALUES ('cascade-report','AAAAAAAAAA','privacy','测试举报说明','test-visitor',?,NULL)",
      ).bind(before(1)),
      env.DB.prepare(
        "INSERT INTO audit_log VALUES ('preserved-audit','AAAAAAAAAA','reject','system',NULL,?)",
      ).bind(before(30, -1)),
    ]);
    await cleanup(env, now);
    expect(
      await env.DB.prepare('SELECT id FROM tombstones ORDER BY id').all<{
        id: string;
      }>(),
    ).toMatchObject({
      results: [
        { id: 'BBBBBBBBBB' },
        { id: 'CCCCCCCCCC' },
        { id: 'DDDDDDDDDD' },
        { id: 'EEEEEEEEEE' },
        { id: 'FFFFFFFFFF' },
        { id: 'GGGGGGGGGG' },
      ],
    });
    expect(await count('reports')).toBe(0);
    expect(await count('flowers')).toBe(0);
    expect(await count('audit_log')).toBe(1);
  });
  it('keeps unresolved reports and the ninety-day boundary while removing old resolved reports', async () => {
    await tombstone('AAAAAAAAAA', 'approved', before(365));
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO reports VALUES ('old','AAAAAAAAAA','other','旧的已处理测试举报','visitor-old',?,?)",
      ).bind(before(100), before(90, -1)),
      env.DB.prepare(
        "INSERT INTO reports VALUES ('boundary','AAAAAAAAAA','other','边界测试举报','visitor-boundary',?,?)",
      ).bind(before(100), before(90)),
      env.DB.prepare(
        "INSERT INTO reports VALUES ('recent','AAAAAAAAAA','other','新的已处理测试举报','visitor-recent',?,?)",
      ).bind(before(100), before(90, 1)),
      env.DB.prepare(
        "INSERT INTO reports VALUES ('unresolved','AAAAAAAAAA','other','尚未处理的测试举报','visitor-open',?,NULL)",
      ).bind(before(365)),
    ]);
    await cleanup(env, now);
    const records = await env.DB.prepare(
      'SELECT id FROM reports ORDER BY id',
    ).all<{ id: string }>();
    expect(records.results.map((row) => row.id)).toEqual([
      'boundary',
      'recent',
      'unresolved',
    ]);
  });
  it('expires old daily deduplication and rate rows without changing cumulative flowers', async () => {
    const day = beijingDay(now),
      boundary = shiftDay(day, -2),
      old = shiftDay(day, -3);
    await tombstone('AAAAAAAAAA', 'approved', before(10), 81);
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO flowers VALUES ('AAAAAAAAAA','visitor-old',?)",
      ).bind(old),
      env.DB.prepare(
        "INSERT INTO flowers VALUES ('AAAAAAAAAA','visitor-boundary',?)",
      ).bind(boundary),
      env.DB.prepare(
        "INSERT INTO flowers VALUES ('AAAAAAAAAA','visitor-today',?)",
      ).bind(day),
      env.DB.prepare(
        "INSERT INTO rate_limits VALUES ('submit:test-old',?,3)",
      ).bind(old),
      env.DB.prepare(
        "INSERT INTO rate_limits VALUES ('submit:test-boundary',?,3)",
      ).bind(boundary),
      env.DB.prepare(
        "INSERT INTO rate_limits VALUES ('auth:test-old',?,20)",
      ).bind(old + 'T20'),
      env.DB.prepare(
        "INSERT INTO rate_limits VALUES ('auth:test-current',?,20)",
      ).bind(now.toISOString().slice(0, 13)),
    ]);
    await cleanup(env, now);
    expect(await count('flowers')).toBe(2);
    expect(await count('rate_limits')).toBe(2);
    expect(
      await env.DB.prepare(
        "SELECT flowers FROM tombstones WHERE id='AAAAAAAAAA'",
      ).first('flowers'),
    ).toBe(81);
    await cleanup(env, now);
    expect(await count('flowers')).toBe(2);
    expect(await count('rate_limits')).toBe(2);
    expect(
      await env.DB.prepare(
        "SELECT flowers FROM tombstones WHERE id='AAAAAAAAAA'",
      ).first('flowers'),
    ).toBe(81);
  });
});
