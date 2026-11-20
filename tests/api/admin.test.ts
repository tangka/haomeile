import { env } from 'cloudflare:workers';
import { Hono } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { adminRoutes } from '../../src/worker/routes/admin';
import { publicRoutes } from '../../src/worker/routes/public';
import { app as worker } from '../../src/worker';
import { hashSecret } from '../../src/worker/lib/crypto';
import { createAccessVerifier } from '../../src/worker/lib/access';
import { ApiError } from '../../src/worker/lib/errors';
import { INPUT_FIELDS } from '../../src/worker/lib/store';
import { validateTombInput } from '../../src/worker/lib/validate';
import type {
  AppEnv,
  Bindings,
  TombStatus,
  TombstoneRow,
} from '../../src/worker/types';

const bindings: Bindings = {
  ...(env as unknown as Bindings),
  ACCESS_TEAM_DOMAIN: 'admin-test.cloudflareaccess.com',
  ACCESS_AUD: 'moderation-test',
};
let assertion: string;
let jwk: JsonWebKey;
let sequence = 0;
let verify: ReturnType<typeof createAccessVerifier>;
const app = new Hono<AppEnv>();
app.onError((error, c) =>
  error instanceof ApiError
    ? c.json(
        { ok: false, error: { code: error.code, message: error.message } },
        error.status as ContentfulStatusCode,
      )
    : c.json({ ok: false, error: { code: 'INTERNAL_ERROR' } }, 500),
);
app.use('*', async (c, next) => {
  const identity = await verify(c.req.raw, c.env);
  if (!identity)
    return c.json({ ok: false, error: { code: 'FORBIDDEN' } }, 403);
  c.set('actor', identity.email);
  await next();
});
app.route('/api/admin', adminRoutes);

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

beforeAll(async () => {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  jwk = {
    ...((await crypto.subtle.exportKey('jwk', pair.publicKey)) as JsonWebKey),
    alg: 'RS256',
    use: 'sig',
  };
  Object.assign(jwk, { kid: 'admin-test-key' });
  const header = encode(
    new TextEncoder().encode(
      JSON.stringify({ alg: 'RS256', kid: 'admin-test-key', typ: 'JWT' }),
    ),
  );
  const payload = encode(
    new TextEncoder().encode(
      JSON.stringify({
        iss: 'https://admin-test.cloudflareaccess.com',
        aud: [bindings.ACCESS_AUD],
        exp: Math.floor(Date.now() / 1000) + 3600,
        type: 'app',
        email: 'moderator@example.test',
        sub: 'moderator-test',
      }),
    ),
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    pair.privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  assertion = `${header}.${payload}.${encode(new Uint8Array(signature))}`;
  verify = createAccessVerifier();
});
beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    Response.json({ keys: [jwk] }),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function request(path: string, body?: unknown, jwt = assertion) {
  return app.request(
    '/api/admin' + path,
    {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'content-type': 'application/json',
        'Cf-Access-Jwt-Assertion': jwt,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    bindings,
  );
}

async function create(status: TombStatus = 'pending', flags: string[] = []) {
  sequence++;
  const id = `AAAAAAA${String.fromCharCode(65 + (sequence % 26))}AA`;
  const input = validateTombInput({
    codename: '审核接口测试示例',
    vendor: 'claude',
    event_type: 'verification',
    died_at: '2026-11-18',
    story: '这是仅用于审核接口验证的示例经过。',
    consent: true,
  });
  const now = new Date().toISOString();
  await bindings.DB.prepare(
    `INSERT INTO tombstones (id,secret_hash,${INPUT_FIELDS.join(',')},status,flags,created_at,updated_at,approved_at)
    VALUES (${Array.from({ length: INPUT_FIELDS.length + 7 }, () => '?').join(',')})`,
  )
    .bind(
      id,
      'private-hash-test',
      ...INPUT_FIELDS.map((key) => input[key]),
      status,
      JSON.stringify(flags),
      now,
      now,
      ['approved', 'hidden'].includes(status) ? now : null,
    )
    .run();
  return { id, input };
}

const row = (id: string) =>
  bindings.DB.prepare('SELECT * FROM tombstones WHERE id=?')
    .bind(id)
    .first<TombstoneRow>();

describe('authenticated moderation', () => {
  it.each(['approve', 'restore'] as const)(
    'cannot %s unsupported historical products until the owner selects a supported product',
    async (action) => {
      const { id } = await create(action === 'approve' ? 'pending' : 'hidden');
      await bindings.DB.prepare(
        "UPDATE tombstones SET vendor='grok' WHERE id=?",
      )
        .bind(id)
        .run();
      const response = await request(`/tombstones/${id}/${action}`, {});
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        ok: false,
        error: { code: 'UNSUPPORTED_PRODUCT' },
      });
      expect((await row(id))?.status).toBe(
        action === 'approve' ? 'pending' : 'hidden',
      );
      expect((await row(id))?.vendor).toBe('grok');
    },
  );
  it('protects the real Worker admin endpoints and all static HTML aliases', async () => {
    for (const path of [
      '/admin',
      '/admin/',
      '/admin/index.html',
      '/admin.html',
      '/api/admin',
      '/api/admin/queue',
    ]) {
      const response = await worker.request(
        `https://haomeile.rip${path}`,
        {},
        bindings,
      );
      expect(response.status).toBe(403);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
    }
    for (const path of [
      '/%61dmin',
      '/admin%2findex.html',
      '/api/%61dmin/queue',
    ]) {
      const response = await worker.request(
        `https://haomeile.rip${path}`,
        {},
        bindings,
      );
      expect(response.status).toBe(404);
    }
  });

  it('accepts a real signed moderator assertion through the production Worker middleware', async () => {
    const response = await worker.request(
      'https://haomeile.rip/api/admin/queue',
      { headers: { 'Cf-Access-Jwt-Assertion': assertion } },
      bindings,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.text()).not.toContain('secret_hash');
  });

  it('rejects missing or malformed Access assertions before serving queue data', async () => {
    expect((await request('/queue', undefined, '')).status).toBe(403);
    expect(
      (await request('/queue', undefined, 'fake.jwt.signature')).status,
    ).toBe(403);
  });

  it('returns flagged submissions first with no credential hashes and records approval atomically', async () => {
    const plain = await create();
    const flagged = await create('pending', ['拼车']);
    const response = await request('/queue?type=new');
    expect(response.status).toBe(200);
    const raw = await response.text();
    expect(raw).not.toContain('secret_hash');
    expect(raw).not.toContain('private-hash-test');
    const queue = JSON.parse(raw).data;
    expect(queue.items.map((item: { id: string }) => item.id)).toEqual([
      flagged.id,
      plain.id,
    ]);
    expect(queue.counts.new).toBe(2);
    expect(queue.items[0].flags).toEqual(['拼车']);
    expect((await request(`/tombstones/${plain.id}/approve`, {})).status).toBe(
      200,
    );
    expect((await row(plain.id))?.status).toBe('approved');
    const audit = await bindings.DB.prepare(
      'SELECT action,actor FROM audit_log WHERE tombstone_id=?',
    )
      .bind(plain.id)
      .first();
    expect(audit).toMatchObject({
      action: 'approve',
      actor: 'moderator@example.test',
    });
    expect((await request(`/tombstones/${plain.id}/approve`, {})).status).toBe(
      409,
    );
    expect(
      await bindings.DB.prepare(
        'SELECT count(*) n FROM audit_log WHERE tombstone_id=?',
      )
        .bind(plain.id)
        .first('n'),
    ).toBe(1);
  });

  it('supports rejection feedback and rejects privacy information in the reason', async () => {
    const { id } = await create();
    expect(
      (
        await request(`/tombstones/${id}/reject`, {
          reason: '联系 hello@example.com',
        })
      ).status,
    ).toBe(400);
    expect((await row(id))?.status).toBe('pending');
    expect(
      (await request(`/tombstones/${id}/reject`, { reason: '含灰产推广信息' }))
        .status,
    ).toBe(200);
    expect((await row(id))?.status).toBe('rejected');
    expect(
      await bindings.DB.prepare(
        'SELECT detail FROM audit_log WHERE tombstone_id=?',
      )
        .bind(id)
        .first('detail'),
    ).toContain('含灰产推广信息');
  });

  it('reviews a pending edit instead of approving the obsolete submission', async () => {
    const { id, input } = await create();
    await bindings.DB.prepare(
      'UPDATE tombstones SET pending_patch=? WHERE id=?',
    )
      .bind(JSON.stringify({ ...input, codename: '修改后的审核测试示例' }), id)
      .run();
    const initialQueue = (await (await request('/queue?type=new')).json()) as {
      data: { items: unknown[] };
    };
    expect(initialQueue.data.items).toHaveLength(0);
    expect((await request(`/tombstones/${id}/approve`, {})).status).toBe(409);
    expect((await request(`/tombstones/${id}/patch/approve`, {})).status).toBe(
      200,
    );
    expect(await row(id)).toMatchObject({
      status: 'approved',
      codename: '修改后的审核测试示例',
      pending_patch: null,
    });
  });

  it('approves a stored legacy plan patch without inventing a named tier', async () => {
    const { id, input } = await create('approved');
    await bindings.DB.prepare(
      'UPDATE tombstones SET plan=?,pending_patch=? WHERE id=?',
    )
      .bind(
        'paid_personal',
        JSON.stringify({
          ...input,
          plan: 'paid_personal',
          codename: '旧分类修改审核测试示例',
        }),
        id,
      )
      .run();
    const response = await request(`/tombstones/${id}/patch/approve`, {});
    expect(response.status).toBe(200);
    expect(await row(id)).toMatchObject({
      status: 'approved',
      codename: '旧分类修改审核测试示例',
      plan: 'paid_personal',
      pending_patch: null,
    });
  });

  it('keeps the current version when rejecting an edit and does not restore a hidden tombstone on patch approval', async () => {
    const { id, input } = await create('hidden');
    const patch = { ...input, codename: '隐藏中的审核测试示例' };
    await bindings.DB.prepare(
      'UPDATE tombstones SET pending_patch=?,flags=? WHERE id=?',
    )
      .bind(JSON.stringify(patch), JSON.stringify(['拼车']), id)
      .run();
    expect((await request(`/tombstones/${id}/patch/reject`, {})).status).toBe(
      200,
    );
    expect(await row(id)).toMatchObject({
      status: 'hidden',
      codename: input.codename,
      pending_patch: null,
      flags: '[]',
    });
    await bindings.DB.prepare(
      'UPDATE tombstones SET pending_patch=? WHERE id=?',
    )
      .bind(JSON.stringify(patch), id)
      .run();
    expect((await request(`/tombstones/${id}/patch/approve`, {})).status).toBe(
      200,
    );
    expect(await row(id)).toMatchObject({
      status: 'hidden',
      codename: patch.codename,
      pending_patch: null,
    });
  });

  it('keeps hidden content in the reported queue and resolves old reports when explicitly restoring', async () => {
    const { id } = await create('approved');
    expect((await request(`/tombstones/${id}/hide`, {})).status).toBe(200);
    for (let index = 0; index < 3; index++)
      await bindings.DB.prepare(
        "INSERT INTO reports(id,tombstone_id,reason,note,visitor_hash,created_at) VALUES (?,?,'privacy','',?,?)",
      )
        .bind(
          crypto.randomUUID(),
          id,
          `hash-${index}`,
          new Date().toISOString(),
        )
        .run();
    const queued = (await (await request('/queue?type=reported')).json()) as {
      data: { items: { id: string; reports: unknown[] }[] };
    };
    expect(queued.data.items[0].id).toBe(id);
    expect(queued.data.items[0].reports).toHaveLength(3);
    expect((await request(`/tombstones/${id}/restore`, {})).status).toBe(200);
    expect((await row(id))?.status).toBe('approved');
    expect(
      await bindings.DB.prepare(
        'SELECT count(*) n FROM reports WHERE tombstone_id=? AND resolved_at IS NULL',
      )
        .bind(id)
        .first('n'),
    ).toBe(0);
    const detail = await bindings.DB.prepare(
      "SELECT detail FROM audit_log WHERE tombstone_id=? AND action='restore'",
    )
      .bind(id)
      .first<string>('detail');
    expect(JSON.parse(detail!)).toEqual({ resolved_reports: 3 });
  });

  it('resolves individual reports without restoring hidden content and retains a route to review it', async () => {
    const { id } = await create('hidden');
    const reportId = crypto.randomUUID();
    await bindings.DB.prepare(
      "INSERT INTO reports(id,tombstone_id,reason,note,visitor_hash,created_at) VALUES (?,?,'other','','hash',?)",
    )
      .bind(reportId, id, new Date().toISOString())
      .run();
    expect((await request(`/reports/${reportId}/resolve`, {})).status).toBe(
      200,
    );
    expect((await row(id))?.status).toBe('hidden');
    const queue = (await (await request('/queue?type=reported')).json()) as {
      data: { items: { id: string }[] };
    };
    expect(queue.data.items.map((item) => item.id)).toContain(id);
    expect(
      await bindings.DB.prepare(
        "SELECT count(*) n FROM audit_log WHERE tombstone_id=? AND action='resolve_report'",
      )
        .bind(id)
        .first('n'),
    ).toBe(1);
    expect((await request(`/reports/${reportId}/resolve`, {})).status).toBe(
      404,
    );
  });

  it.each(['approve', 'patch/approve'])(
    'does not resurrect an owner withdrawal racing with %s',
    async (action) => {
      const { id, input } = await create(
        action === 'approve' ? 'pending' : 'approved',
      );
      const secret = 'owner-race-test-only-secret';
      await bindings.DB.prepare(
        'UPDATE tombstones SET secret_hash=?,pending_patch=? WHERE id=?',
      )
        .bind(
          await hashSecret(secret, bindings.PEPPER),
          action === 'patch/approve'
            ? JSON.stringify({ ...input, codename: '等待修改审核的测试示例' })
            : null,
          id,
        )
        .run();
      const responses = await Promise.all([
        request(`/tombstones/${id}/${action}`, {}),
        publicRoutes.request(
          '/manage/withdraw',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, secret }),
          },
          bindings,
        ),
      ]);
      expect(responses[1].status).toBe(200);
      expect([200, 404, 409]).toContain(responses[0].status);
      expect(await row(id)).toMatchObject({
        status: 'withdrawn',
        codename: null,
        story: null,
        epitaph: null,
        pending_patch: null,
        secret_hash: '',
      });
      expect(
        (await publicRoutes.request(`/tombstones/${id}`, {}, bindings)).status,
      ).toBe(404);
    },
  );

  it('never resurrects withdrawn records through any moderation action', async () => {
    const { id } = await create('withdrawn');
    for (const action of [
      'approve',
      'reject',
      'hide',
      'restore',
      'patch/approve',
      'patch/reject',
    ])
      expect((await request(`/tombstones/${id}/${action}`, {})).status).toBe(
        404,
      );
    expect((await row(id))?.status).toBe('withdrawn');
    expect(
      await bindings.DB.prepare(
        'SELECT count(*) n FROM audit_log WHERE tombstone_id=?',
      )
        .bind(id)
        .first('n'),
    ).toBe(0);
    for (const type of ['unexpected', 'constructor', '__proto__'])
      expect((await request(`/queue?type=${type}`)).status).toBe(400);
  });
});
