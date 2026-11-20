import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { publicRoutes } from '../../src/worker/routes/public';
import { getStats } from '../../src/worker/lib/store';
import type { Bindings } from '../../src/worker/types';

const bindings = env as unknown as Bindings;
const input = {
  codename: '产品范围测试示例',
  vendor: 'claude',
  event_type: 'other',
  died_at: '2026-11-18',
  story: '这是只存在于隔离测试数据库的产品范围示例。',
  consent: true,
  turnstile_token: 'test-only-token',
};
function request(path: string, body?: unknown) {
  return publicRoutes.request(
    path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        'CF-Connecting-IP': '203.0.113.31',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    bindings,
  );
}
async function insert(id: string, vendor: string, patch: string | null = null) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,pending_patch,created_at,updated_at,approved_at) VALUES (?,'not-a-usable-secret','产品范围测试示例',?,'other','2026-11-18','这是只用于隔离数据库的历史产品测试示例。','approved',?,?,?,?)",
  )
    .bind(id, vendor, patch, now, now, now)
    .run();
}
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    Response.json({ success: true, hostname: 'haomeile.rip' }),
  );
});
afterEach(() => vi.restoreAllMocks());

describe('the three-product public scope', () => {
  it('accepts all three products while keeping the other event type available', async () => {
    for (const vendor of ['claude', 'codex', 'antigravity']) {
      const response = await request('/tombstones', { ...input, vendor });
      expect(response.status).toBe(201);
    }
    const rows = await env.DB.prepare(
      'SELECT vendor,event_type FROM tombstones ORDER BY vendor',
    ).all();
    expect(rows.results).toEqual([
      { vendor: 'antigravity', event_type: 'other' },
      { vendor: 'claude', event_type: 'other' },
      { vendor: 'codex', event_type: 'other' },
    ]);
  });
  it('rejects former broad product keys on writes and filters', async () => {
    for (const vendor of [
      'chatgpt',
      'gemini',
      'grok',
      'deepseek',
      'kimi',
      'qwen',
      'doubao',
      'other',
    ]) {
      expect((await request('/tombstones', { ...input, vendor })).status).toBe(
        400,
      );
      expect((await request('/tombstones?vendor=' + vendor)).status).toBe(400);
      expect((await request('/stats?vendor=' + vendor)).status).toBe(400);
    }
    expect(
      await env.DB.prepare('SELECT count(*) AS n FROM tombstones').first('n'),
    ).toBe(0);
  });
  it('excludes retained unsupported historical records from lists, details, statistics and flowers', async () => {
    await insert('CLAUDEAAAA', 'claude');
    await insert('CODEXAAAAA', 'codex');
    await insert('ANTIGRAVAA', 'antigravity');
    await insert('LEGACYAAAA', 'grok');
    const listing = (await (await request('/tombstones')).json()) as {
      data: { items: { vendor: string }[] };
    };
    expect(listing.data.items.map((item) => item.vendor).sort()).toEqual([
      'antigravity',
      'claude',
      'codex',
    ]);
    const stats = await getStats(env.DB);
    expect(stats.total).toBe(3);
    expect(stats.by_vendor.map(([key]) => key).sort()).toEqual([
      'antigravity',
      'claude',
      'codex',
    ]);
    expect(stats.by_event).toEqual([['other', 3]]);
    expect((await request('/tombstones/LEGACYAAAA')).status).toBe(404);
    expect(
      (
        await request('/tombstones/LEGACYAAAA/flower', {
          visitor_id: crypto.randomUUID(),
        })
      ).status,
    ).toBe(404);
    expect(
      await env.DB.prepare(
        "SELECT flowers FROM tombstones WHERE id='LEGACYAAAA'",
      ).first('flowers'),
    ).toBe(0);
    expect(
      await env.DB.prepare(
        "SELECT vendor FROM tombstones WHERE id='LEGACYAAAA'",
      ).first('vendor'),
    ).toBe('grok');
  });
});

describe('legacy product migration', () => {
  it('renames only the two old product keys and pending edits without deleting unrelated history', async () => {
    await insert(
      'LEGACYAAAA',
      'chatgpt',
      JSON.stringify({ ...input, vendor: 'gemini' }),
    );
    await insert(
      'LEGACYAAAB',
      'gemini',
      JSON.stringify({ ...input, vendor: 'chatgpt' }),
    );
    await insert(
      'LEGACYAAAC',
      'grok',
      JSON.stringify({ ...input, vendor: 'grok' }),
    );
    await insert('LEGACYAAAD', 'other');
    const migration = env.TEST_MIGRATIONS.find((item) =>
      item.name.startsWith('0002'),
    );
    expect(migration).toBeDefined();
    await env.DB.batch(
      migration!.queries.map((query) => env.DB.prepare(query)),
    );
    const rows = await env.DB.prepare(
      'SELECT id,vendor,pending_patch,story FROM tombstones ORDER BY id',
    ).all<{
      id: string;
      vendor: string;
      pending_patch: string | null;
      story: string;
    }>();
    expect(rows.results).toHaveLength(4);
    expect(rows.results.map((row) => row.vendor)).toEqual([
      'codex',
      'antigravity',
      'grok',
      'other',
    ]);
    expect(
      rows.results.map(
        (row) => row.pending_patch && JSON.parse(row.pending_patch).vendor,
      ),
    ).toEqual(['antigravity', 'codex', 'grok', null]);
    for (const row of rows.results)
      expect(row.story).toBe('这是只用于隔离数据库的历史产品测试示例。');
  });
});
