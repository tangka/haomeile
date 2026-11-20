import { env } from 'cloudflare:workers';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { publicRoutes } from '../../src/worker/routes/public';
import type { Bindings, TombstoneRow } from '../../src/worker/types';
import { getStats, listTombstones } from '../../src/worker/lib/store';
import { reserveRate } from '../../src/worker/lib/ratelimit';
import { app } from '../../src/worker/index';
const bindings = env as unknown as Bindings;
const input = {
  codename: '接口测试示例',
  vendor: 'claude',
  event_type: 'verification',
  died_at: '2026-11-18',
  story: '这是一段仅供接口测试使用的示例经过。',
  consent: true,
  turnstile_token: 'test-token',
};
async function request(
  path: string,
  body?: unknown,
  ip = '203.0.113.7',
): Promise<Response> {
  return publicRoutes.request(
    path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': ip },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    bindings,
  );
}
async function submit(ip?: string): Promise<{ id: string; secret: string }> {
  const response = await request('/tombstones', input, ip);
  expect(response.status).toBe(201);
  return ((await response.json()) as { data: { id: string; secret: string } })
    .data;
}
async function approve(id: string): Promise<void> {
  await bindings.DB.prepare(
    "UPDATE tombstones SET status='approved',approved_at=? WHERE id=?",
  )
    .bind(new Date().toISOString(), id)
    .run();
}
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    Response.json({ success: true, hostname: 'haomeile.rip' }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});
describe('public API lifecycle', () => {
  it('keeps pending reports private and stores credentials only as a hash', async () => {
    const credential = await submit();
    const row = await bindings.DB.prepare('SELECT * FROM tombstones WHERE id=?')
      .bind(credential.id)
      .first<TombstoneRow>();
    expect(row?.status).toBe('pending');
    expect(row?.secret_hash).not.toBe(credential.secret);
    expect((await request('/tombstones/' + credential.id)).status).toBe(404);
    const list = (await (await request('/tombstones')).json()) as {
      data: { items: unknown[] };
    };
    expect(list.data.items).toEqual([]);
    expect((await getStats(bindings.DB)).total).toBe(0);
    const owner = await request('/manage/status', credential);
    const text = await owner.text();
    expect(text).toContain('pending');
    expect(text).not.toContain('secret_hash');
    expect(text).not.toContain(credential.secret);
  });
  it('publishes only safe fields and deduplicates flowers atomically', async () => {
    const credential = await submit();
    await approve(credential.id);
    const detail = await request('/tombstones/' + credential.id);
    const raw = await detail.text();
    expect(raw).toContain(input.codename);
    expect(raw).not.toMatch(/secret_hash|pending_patch|flags/);
    const visitor = crypto.randomUUID();
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request('/tombstones/' + credential.id + '/flower', {
          visitor_id: visitor,
        }),
      ),
    );
    for (const response of responses) expect(response.status).toBe(200);
    expect(
      await bindings.DB.prepare('SELECT flowers FROM tombstones WHERE id=?')
        .bind(credential.id)
        .first('flowers'),
    ).toBe(1);
    expect((await getStats(bindings.DB)).total).toBe(1);
  });
  it('preserves approved content until edits are reviewed and scrubs withdrawal', async () => {
    const credential = await submit();
    await approve(credential.id);
    const patch = await request('/manage/patch', {
      ...credential,
      patch: { ...input, codename: '修改后的接口测试示例' },
    });
    expect(patch.status).toBe(200);
    expect(
      await (await request('/tombstones/' + credential.id)).text(),
    ).toContain(input.codename);
    const own = (await (
      await request('/manage/status', credential)
    ).json()) as { data: { pending_patch: { codename: string } } };
    expect(own.data.pending_patch.codename).toBe('修改后的接口测试示例');
    expect((await request('/manage/withdraw', credential)).status).toBe(200);
    expect((await request('/tombstones/' + credential.id)).status).toBe(404);
    const row = await bindings.DB.prepare('SELECT * FROM tombstones WHERE id=?')
      .bind(credential.id)
      .first<TombstoneRow>();
    expect(row).toMatchObject({
      status: 'withdrawn',
      codename: null,
      nickname: null,
      story: null,
      epitaph: null,
      secret_hash: '',
      pending_patch: null,
      flags: null,
      born_at: null,
      died_at: '',
      flowers: 0,
    });
    expect((await getStats(bindings.DB)).total).toBe(0);
    expect((await request('/manage/status', credential)).status).toBe(403);
  });
  it('counts three different visitors and hides only on the third report', async () => {
    const credential = await submit();
    await approve(credential.id);
    const report = (visitor: string) =>
      request('/tombstones/' + credential.id + '/report', {
        reason: 'privacy',
        note: '',
        turnstile_token: 'test-token',
        visitor_id: visitor,
      });
    const visitor = crypto.randomUUID();
    expect((await report(visitor)).status).toBe(200);
    expect((await report(visitor)).status).toBe(200);
    expect((await report(crypto.randomUUID())).status).toBe(200);
    expect((await request('/tombstones/' + credential.id)).status).toBe(200);
    expect((await report(crypto.randomUUID())).status).toBe(200);
    expect((await request('/tombstones/' + credential.id)).status).toBe(404);
    expect(
      await bindings.DB.prepare(
        'SELECT COUNT(*) n FROM reports WHERE tombstone_id=?',
      )
        .bind(credential.id)
        .first('n'),
    ).toBe(3);
    expect(
      await bindings.DB.prepare(
        "SELECT COUNT(*) n FROM audit_log WHERE tombstone_id=? AND action='hide'",
      )
        .bind(credential.id)
        .first('n'),
    ).toBe(1);
  });
  it('flags gray market mentions without auto-publication', async () => {
    const response = await request('/tombstones', {
      ...input,
      story: '示例：我之前看见有人提到拼车，但这里只记录经过。',
    });
    const data = (await response.json()) as { data: { id: string } };
    const row = await bindings.DB.prepare(
      'SELECT status,flags FROM tombstones WHERE id=?',
    )
      .bind(data.data.id)
      .first<{ status: string; flags: string }>();
    expect(row?.status).toBe('pending');
    expect(row?.flags).toContain('拼车');
  });
});
describe('validation, verification and limits', () => {
  it('integrates the Worker Origin middleware with bounded body parsing', async () => {
    const response = await app.request(
      'https://haomeile.rip/api/tombstones',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://haomeile.rip',
        },
        body: JSON.stringify(input),
      },
      bindings,
    );
    expect(response.status).toBe(201);
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(response.headers.get('set-cookie')).toBeNull();
    const denied = await app.request(
      'https://haomeile.rip/api/tombstones',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://elsewhere.invalid',
        },
        body: JSON.stringify(input),
      },
      bindings,
    );
    expect(denied.status).toBe(403);
  });
  it('rejects private input and invalid Turnstile', async () => {
    expect(
      (
        await request('/tombstones', {
          ...input,
          story: '示例邮箱 hello@example.com 应该在提交前删除。',
        })
      ).status,
    ).toBe(400);
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ success: false }));
    expect((await request('/tombstones', input)).status).toBe(400);
    expect(
      await bindings.DB.prepare('SELECT COUNT(*) n FROM tombstones').first('n'),
    ).toBe(0);
  });
  it('enforces submission and credential-failure budgets without raw IP storage', async () => {
    const credential = await submit();
    await submit();
    await submit();
    expect((await request('/tombstones', input)).status).toBe(429);
    for (let index = 0; index < 20; index++)
      expect(
        (await request('/manage/status', { ...credential, secret: 'wrong' }))
          .status,
      ).toBe(403);
    expect((await request('/manage/status', credential)).status).toBe(429);
    const keys = await bindings.DB.prepare('SELECT key FROM rate_limits').all<{
      key: string;
    }>();
    for (const row of keys.results) {
      expect(row.key).not.toContain('203.0.113.7');
      expect(row.key).toMatch(/^[a-z]+:[a-f0-9]{64}$/);
    }
  });
  it('rotates day buckets at Beijing midnight and successful auth does not consume budget', async () => {
    const credential = await submit();
    for (let index = 0; index < 22; index++)
      expect((await request('/manage/status', credential)).status).toBe(200);
    const first = await reserveRate(
      bindings.DB,
      bindings.PEPPER,
      '203.0.113.55',
      'daytest',
      1,
      false,
      new Date('2026-11-19T15:59:59Z'),
    );
    const second = await reserveRate(
      bindings.DB,
      bindings.PEPPER,
      '203.0.113.55',
      'daytest',
      1,
      false,
      new Date('2026-11-19T16:00:00Z'),
    );
    expect(first.key).not.toBe(second.key);
  });
  it('returns controlled errors for malformed requests', async () => {
    expect(
      (
        await publicRoutes.request(
          '/tombstones',
          {
            method: 'POST',
            body: '[]',
            headers: { 'content-type': 'text/plain' },
          },
          bindings,
        )
      ).status,
    ).toBe(415);
    expect(
      (
        await publicRoutes.request(
          '/tombstones',
          {
            method: 'POST',
            body: '{',
            headers: { 'content-type': 'application/json' },
          },
          bindings,
        )
      ).status,
    ).toBe(400);
    expect((await request('/tombstones', null)).status).toBe(400);
    expect(
      (await request('/tombstones', { story: '字'.repeat(10_000) })).status,
    ).toBe(413);
    expect((await request('/tombstones?cursor=bad')).status).toBe(400);
    expect((await request('/tombstones?vendor=demo_orange')).status).toBe(400);
  });
  it('paginates approval ties stably and filters statistics without ranking', async () => {
    const now = new Date().toISOString();
    await bindings.DB.batch(
      Array.from({ length: 23 }, (_, index) => {
        const id =
          'AAAAAAA' +
          [
            'A',
            'B',
            'C',
            'D',
            'E',
            'F',
            'G',
            'H',
            'I',
            'J',
            'K',
            'L',
            'M',
            'N',
            'O',
            'P',
            'Q',
            'R',
            'S',
            'T',
            'U',
            'V',
            'W',
          ][index] +
          'AA';
        return bindings.DB.prepare(
          "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) VALUES (?,'hash','分页测试示例',?,'billing','2026-11-18','这是用于分页接口测试的示例内容。','approved',?,?,?)",
        ).bind(id, index < 21 ? 'claude' : 'gemini', now, now, now);
      }),
    );
    const first = await listTombstones(bindings.DB);
    const second = await listTombstones(bindings.DB, {
      cursor: first.next_cursor,
    });
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(3);
    expect(
      new Set([...first.items, ...second.items].map((row) => row.id)).size,
    ).toBe(23);
    expect(
      (
        await listTombstones(bindings.DB, {
          vendor: 'gemini',
          event: 'billing',
        })
      ).items,
    ).toHaveLength(2);
    expect((await getStats(bindings.DB, 'gemini')).total).toBe(2);
    expect((await getStats(bindings.DB)).timeline).toHaveLength(30);
  });
});
