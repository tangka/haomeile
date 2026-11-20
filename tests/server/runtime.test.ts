import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { openRuntime } from '../../src/server';
import { hashSecret } from '../../src/worker/lib/crypto';
import type { TombstoneRow } from '../../src/worker/types';

const SITE = 'https://haomeile.rip';
const PEPPER = 'runtime-test-only-pepper-never-used-by-a-deployment';
const PASSWORD = 'runtime-test-only-administrator-password-32-plus';
const TOKEN = 'runtime-production-like-non-dummy-token';
const AUTHORIZATION = 'Basic ' + btoa('runtime-admin:' + PASSWORD);
const originalStory = '写你看到了什么、做了什么。猜测请注明“猜测”。';
const input = {
  codename: '使用须知',
  nickname: '独立测试者',
  vendor: 'codex',
  event_type: 'verification',
  plan: 'plus',
  died_at: '2026-11-18',
  story: originalStory,
  epitaph: '回到纪念墙',
  consent: true,
};
type Runtime = Awaited<ReturnType<typeof openRuntime>>;
const runtimes: Runtime[] = [];
const directories: string[] = [];
const fetchSpies: ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>[] = [];

async function runtime() {
  const data = await mkdtemp(join(tmpdir(), 'haomeile-runtime-test-'));
  directories.push(data);
  const values = {
    ENVIRONMENT: 'production',
    SITE_ORIGIN: SITE,
    DATA_DIR: data,
    ASSET_ROOT: resolve(import.meta.dir, '../../dist'),
    MIGRATIONS_ROOT: resolve(import.meta.dir, '../../migrations'),
    PEPPER,
    // These are deliberately fake 0x-prefixed credentials. The only mocked
    // boundary is outbound Siteverify; application and SQLite code are real.
    TURNSTILE_SITE_KEY: '0xFAKE_RUNTIME_TEST_SITE_KEY',
    TURNSTILE_SECRET: '0xFAKE_RUNTIME_TEST_SECRET',
    ADMIN_AUTH_MODE: 'basic',
    ADMIN_USERNAME: 'runtime-admin',
    ADMIN_PASSWORD_HASH: await hashSecret(PASSWORD, PEPPER),
    APP_VERSION: 'isolated-runtime-test',
    BUILD_TIMESTAMP: '2026-11-20T00:00:00Z',
  };
  const opened = await openRuntime(values);
  runtimes.push(opened);
  return { opened, values };
}

function mockSiteverify() {
  const implementation = async (
    ...[request, options]: Parameters<typeof fetch>
  ) => {
    const url = request instanceof Request ? request.url : String(request);
    expect(url).toBe(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    );
    expect(options?.method).toBe('POST');
    expect(options?.redirect).toBe('manual');
    const body = options?.body;
    expect(body).toBeInstanceOf(URLSearchParams);
    expect((body as URLSearchParams).get('secret')).toBe(
      '0xFAKE_RUNTIME_TEST_SECRET',
    );
    expect((body as URLSearchParams).get('response')).toBe(TOKEN);
    return Response.json({ success: true, hostname: 'haomeile.rip' });
  };
  const mock = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(implementation, {
      preconnect() {
        throw new Error('Unexpected external connection');
      },
    }),
  );
  fetchSpies.push(mock);
  return mock;
}

afterEach(async () => {
  for (const mock of fetchSpies.splice(0)) mock.mockRestore();
  for (const item of runtimes.splice(0)) item.database.close();
  for (const directory of directories.splice(0))
    await rm(directory, { recursive: true, force: true });
});

async function request(
  runtime: Runtime,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return runtime.app.fetch(
    new Request(SITE + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        'CF-Connecting-IP': '203.0.113.17',
        ...(body === undefined
          ? {}
          : { Origin: SITE, 'Content-Type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    runtime.env,
  );
}
const admin = (runtime: Runtime, path: string, body?: unknown) =>
  request(runtime, '/api/admin' + path, body, { Authorization: AUTHORIZATION });
const stored = (runtime: Runtime, id: string) =>
  runtime.env.DB.prepare('SELECT * FROM tombstones WHERE id=?')
    .bind(id)
    .first<TombstoneRow>();

describe('production Bun runtime with real assets, HTMLRewriter and SQLite', () => {
  test('renders Chinese and automatically routes English with valid metadata and native rewritten HTML', async () => {
    const { opened } = await runtime();
    const chinese = await request(opened, '/', undefined, {
      'Accept-Language': 'zh-CN,zh;q=0.9',
    });
    expect(chinese.status).toBe(200);
    expect(chinese.headers.get('Content-Type')).toContain('text/html');
    expect(chinese.headers.has('Content-Length')).toBe(false);
    const zh = await chinese.text();
    expect(zh).toContain('<html lang="zh-CN">');
    expect(zh).toContain('这里还很安静');
    expect(zh).toContain('content="0xFAKE_RUNTIME_TEST_SITE_KEY"');
    expect(zh).not.toContain('data-locale-switch');
    const redirect = await request(opened, '/submit?mode=edit', undefined, {
      'Accept-Language': 'en-US,en;q=0.9',
    });
    expect(redirect.status).toBe(302);
    expect(redirect.headers.get('Location')).toBe('/en/submit?mode=edit');
    expect(redirect.headers.get('Cache-Control')).toContain('no-store');
    expect(redirect.headers.get('Vary')).toBe('Accept-Language');
    const english = await request(opened, '/en/', undefined, {
      'Accept-Language': 'en-US',
    });
    expect(english.status).toBe(200);
    const en = await english.text();
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('Would you like to leave the first memorial?');
    expect(en).toContain('href="https://haomeile.rip/en/"');
    expect(en).toContain('content="en_US"');
    expect(en).toContain('hreflang="zh-CN"');
    const structured =
      /<script type="application\/ld\+json">([^]*?)<\/script>/.exec(en);
    expect(structured).not.toBeNull();
    const json = JSON.parse(structured![1]);
    expect(json).toMatchObject({
      '@type': 'WebSite',
      url: SITE + '/en/',
      inLanguage: 'en',
    });
  });

  test('challenges anonymous and invalid administrators before serving any alias or queue data', async () => {
    const { opened } = await runtime();
    for (const path of [
      '/admin',
      '/admin/',
      '/admin.html',
      '/admin/index.html',
      '/en/admin',
      '/en/admin.html',
      '/en/admin/index.html',
      '/api/admin',
      '/api/admin/queue',
    ]) {
      const response = await request(opened, path);
      expect(response.status).toBe(401);
      expect(response.headers.get('WWW-Authenticate')).toMatch(/^Basic /);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
      expect(await response.text()).not.toContain('secret_hash');
    }
    expect(
      (
        await request(opened, '/api/admin/queue', undefined, {
          Authorization: 'Basic malformed!',
        })
      ).status,
    ).toBe(401);
    expect(
      (
        await request(opened, '/api/admin/queue', undefined, {
          Authorization: 'Basic ' + btoa('runtime-admin:incorrect-password'),
        })
      ).status,
    ).toBe(401);
    const allowed = await request(opened, '/admin/index.html', undefined, {
      Authorization: AUTHORIZATION,
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toContain('审核');
    const queue = await admin(opened, '/queue');
    expect(queue.status).toBe(200);
    expect(await queue.json()).toMatchObject({
      ok: true,
      data: { items: [], counts: { new: 0, patch: 0, reported: 0 } },
    });
  });

  test('runs submission, Basic-auth moderation, atomic flowers, approved edits and withdrawal against persistent SQLite', async () => {
    const { opened, values } = await runtime();
    const verification = mockSiteverify();
    const submitted = await request(opened, '/api/tombstones', {
      ...input,
      turnstile_token: TOKEN,
    });
    expect(submitted.status).toBe(201);
    const receipt = (await submitted.json()) as {
      data: { id: string; secret: string };
    };
    const credential = receipt.data;
    expect(credential.id).toMatch(/^[A-Z2-7]{10}$/);
    expect(credential.secret).toHaveLength(43);
    expect(verification).toHaveBeenCalledTimes(1);
    expect(await stored(opened, credential.id)).toMatchObject({
      status: 'pending',
      story: originalStory,
    });
    expect((await stored(opened, credential.id))?.secret_hash).toBe(
      await hashSecret(credential.secret, PEPPER),
    );
    expect((await request(opened, '/t/' + credential.id)).status).toBe(404);
    expect(await (await request(opened, '/api/stats')).json()).toMatchObject({
      data: { total: 0 },
    });
    const queue = await admin(opened, '/queue');
    const queueText = await queue.text();
    expect(queueText).not.toContain('secret_hash');
    expect(queueText).not.toContain(credential.secret);
    expect(JSON.parse(queueText).data.items).toHaveLength(1);
    expect(
      (await admin(opened, '/tombstones/' + credential.id + '/approve', {}))
        .status,
    ).toBe(200);
    expect(await stored(opened, credential.id)).toMatchObject({
      status: 'approved',
    });
    expect(
      await opened.env.DB.prepare(
        'SELECT action,actor FROM audit_log WHERE tombstone_id=?',
      )
        .bind(credential.id)
        .first(),
    ).toEqual({ action: 'approve', actor: 'server-admin' });
    const published = await request(opened, '/en/t/' + credential.id);
    expect(published.status).toBe(200);
    const originalPage = await published.text();
    expect(originalPage).toContain('<h1 class="tomb-name">使用须知</h1>');
    expect(originalPage).toContain(originalStory);
    expect(originalPage).toContain('Verification blocked');
    expect(originalPage).toContain('User-submitted, unverified');
    expect(originalPage).toContain(
      'https://haomeile.rip/en/t/' + credential.id,
    );
    const sitemap = await (await request(opened, '/sitemap.xml')).text();
    expect(sitemap).toContain('/t/' + credential.id);
    expect(sitemap).toContain('/en/t/' + credential.id);
    const visitor = crypto.randomUUID();
    const flowers = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(opened, '/api/tombstones/' + credential.id + '/flower', {
          visitor_id: visitor,
        }),
      ),
    );
    expect(flowers.map((response) => response.status)).toEqual(
      Array(8).fill(200),
    );
    expect((await stored(opened, credential.id))?.flowers).toBe(1);
    const revised = originalStory + ' 补充：这是更新后等待审核的原文。';
    expect(
      (
        await request(opened, '/api/manage/patch', {
          ...credential,
          patch: { ...input, story: revised },
        })
      ).status,
    ).toBe(200);
    expect((await stored(opened, credential.id))?.story).toBe(originalStory);
    expect(
      JSON.parse((await stored(opened, credential.id))!.pending_patch!),
    ).toMatchObject({ story: revised });
    expect(
      await (await request(opened, '/en/t/' + credential.id)).text(),
    ).not.toContain(revised);
    expect(
      (
        await admin(
          opened,
          '/tombstones/' + credential.id + '/patch/approve',
          {},
        )
      ).status,
    ).toBe(200);
    expect(await stored(opened, credential.id)).toMatchObject({
      status: 'approved',
      story: revised,
      pending_patch: null,
    });
    expect(
      await (await request(opened, '/en/t/' + credential.id)).text(),
    ).toContain(revised);
    expect(
      await opened.env.DB.prepare(
        "SELECT COUNT(*) count FROM audit_log WHERE tombstone_id=? AND action='patch_approve'",
      )
        .bind(credential.id)
        .first('count'),
    ).toBe(1);
    expect(
      (await request(opened, '/api/manage/withdraw', credential)).status,
    ).toBe(200);
    expect(await stored(opened, credential.id)).toMatchObject({
      status: 'withdrawn',
      codename: null,
      nickname: null,
      story: null,
      epitaph: null,
      secret_hash: '',
      pending_patch: null,
      flags: null,
      flowers: 0,
    });
    for (const path of ['/t/', '/en/t/']) {
      const gone = await request(opened, path + credential.id);
      expect(gone.status).toBe(410);
      expect(gone.headers.get('Cache-Control')).toBe('no-store');
    }
    expect(
      (await request(opened, '/api/tombstones/' + credential.id)).status,
    ).toBe(404);
    expect(await (await request(opened, '/sitemap.xml')).text()).not.toContain(
      credential.id,
    );
    expect(await (await request(opened, '/api/stats')).json()).toMatchObject({
      data: { total: 0 },
    });
    expect(
      await opened.env.DB.prepare('SELECT COUNT(*) count FROM flowers').first(
        'count',
      ),
    ).toBe(0);
    opened.database.close();
    const reopened = await openRuntime(values);
    runtimes.push(reopened);
    expect(await stored(reopened, credential.id)).toMatchObject({
      status: 'withdrawn',
      story: null,
      secret_hash: '',
    });
    expect(await reopened.database.migrate(values.MIGRATIONS_ROOT)).toEqual([]);
  });

  test('enforces production Origin, JSON and privacy boundaries and refuses dummy captcha tokens', async () => {
    const { opened } = await runtime();
    const verification = mockSiteverify();
    expect(
      (
        await request(opened, '/api/tombstones', input, {
          Origin: 'https://foreign.example',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(opened, '/api/tombstones', input, {
          'Content-Type': 'text/plain',
        })
      ).status,
    ).toBe(415);
    const malformed = await opened.app.fetch(
      new Request(SITE + '/api/tombstones', {
        method: 'POST',
        headers: { Origin: SITE, 'Content-Type': 'application/json' },
        body: '{',
      }),
      opened.env,
    );
    expect(malformed.status).toBe(400);
    expect(
      (await request(opened, '/api/tombstones', { text: '字'.repeat(6000) }))
        .status,
    ).toBe(413);
    const privacy = await request(
      opened,
      '/api/tombstones',
      {
        ...input,
        story:
          'Privacy runtime test contains hello@example.com and must stay private.',
        turnstile_token: TOKEN,
      },
      { 'Accept-Language': 'en-US' },
    );
    expect(privacy.status).toBe(400);
    const message = await privacy.text();
    expect(message).toContain('email');
    expect(message).not.toContain('hello@example.com');
    expect(message).not.toMatch(/\p{Script=Han}/u);
    const dummy = await request(opened, '/api/tombstones', {
      ...input,
      turnstile_token: 'XXXX.DUMMY.TOKEN.XXXX',
    });
    expect(dummy.status).toBe(400);
    expect(await dummy.json()).toMatchObject({
      ok: false,
      error: { code: 'TURNSTILE_FAILED' },
    });
    expect(verification).toHaveBeenCalledTimes(0);
    expect(
      await opened.env.DB.prepare(
        'SELECT COUNT(*) count FROM tombstones',
      ).first('count'),
    ).toBe(0);
  });
});
