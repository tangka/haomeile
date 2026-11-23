import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { openRuntime } from '../../src/server';
import { hashSecret } from '../../src/worker/lib/crypto';
import { decodeHtml } from '../../src/worker/localize';
import type { TombstoneRow } from '../../src/worker/types';

const SITE = 'https://haomeile.rip';
const PEPPER = 'runtime-test-only-pepper-never-used-by-a-deployment';
const PASSWORD = 'runtime-test-only-administrator-password-32-plus';
const TOKEN = 'runtime-production-like-non-dummy-token';
const MEASUREMENT_ID = 'G-AB12CD34EF';
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

async function runtime(
  analyticsToken?: string,
  ga4MeasurementId?: string,
  radarApiKey?: string,
  radarHumanCheck?: string,
) {
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
    CLOUDFLARE_WEB_ANALYTICS_TOKEN: analyticsToken,
    GA4_MEASUREMENT_ID: ga4MeasurementId,
    RADAR_OVERVIEW_API_KEY: radarApiKey,
    RADAR_HUMAN_CHECK: radarHumanCheck,
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
  for (const item of runtimes) item.radar?.stop();
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
  test('serves the entire Radar page only after verifying a short-lived browser pass', async () => {
    const key = 'fictional-integration-key-for-isolated-runtime-tests';
    const generatedAt = new Date().toISOString();
    const respond = async (...[target, options]: Parameters<typeof fetch>) => {
      if (
        String(target) ===
        'https://challenges.cloudflare.com/turnstile/v0/siteverify'
      ) {
        const token = (options?.body as URLSearchParams).get('response');
        return Response.json({
          success: true,
          action: token === TOKEN ? 'radar_gate' : 'submit',
          hostname: 'haomeile.rip',
        });
      }
      return Response.json({
        generatedAt,
        diagnostics: 'private-upstream-diagnostics',
        platforms: [
          {
            id: 'codex',
            name: '<script>untrusted-name</script>',
            probability: 17.8,
          },
          {
            id: 'claude',
            probability: 0,
            judgementReason: 'private-judgement',
          },
          { id: 'antigravity', probability: 63.6 },
          { id: 'grok', probability: 42 },
        ],
      });
    };
    const fetchMock = spyOn(globalThis, 'fetch').mockImplementation(
      Object.assign(respond, { preconnect() {} }),
    );
    fetchSpies.push(fetchMock);
    const { opened } = await runtime(
      'radar-analytics-test-token',
      MEASUREMENT_ID,
      key,
    );
    expect(opened.radar!.read()).toBeNull();
    opened.radar!.start();
    opened.radar!.start();
    await Bun.sleep(0);

    const [
      anonymous,
      forged,
      alias,
      localizedAlias,
      direct,
      gateTemplate,
      home,
    ] = await Promise.all([
      request(opened, '/radar?url=https://example.invalid', undefined, {
        Authorization: 'Bearer visitor-credential',
      }),
      request(opened, '/en/radar', undefined, {
        Cookie: '__Host-haomeile_radar=forged',
      }),
      request(opened, '/radar.html/'),
      request(opened, '/en/radar/index.html/'),
      request(opened, '/api/radar'),
      request(opened, '/en/_templates/radar-gate/index.html'),
      request(opened, '/'),
    ]);
    expect(direct.status).toBe(404);
    expect(gateTemplate.status).toBe(404);
    expect(await gateTemplate.text()).not.toContain('data-radar-verify');
    expect(home.status).toBe(200);
    const homeHtml = await home.text();
    expect(homeHtml).toContain('这里还很安静');
    expect(homeHtml).not.toContain('data-radar-verify');
    const gates = [anonymous, forged, alias, localizedAlias] as const;
    for (const [index, response] of gates.entries()) {
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('vary')).toContain('Cookie');
      const html = await response.text();
      expect(html).toContain('data-radar-verify');
      const canonical = index % 2 === 0 ? '/radar' : '/en/radar';
      expect(html).toContain(`rel="canonical" href="${SITE}${canonical}"`);
      expect(html).not.toMatch(
        /data-ssr="radar-overview"|reset-radar-qr|<strong>18%|data-ga4-measurement-id|data-cf-beacon/,
      );
    }
    expect(
      (
        await request(opened, '/api/radar/verify', {
          turnstile_token: 'wrong-action',
        })
      ).status,
    ).toBe(400);
    const verified = await request(opened, '/api/radar/verify', {
      turnstile_token: TOKEN,
    });
    expect(verified.status).toBe(200);
    const replayed = await request(opened, '/api/radar/verify', {
      turnstile_token: TOKEN,
    });
    expect(replayed.status).toBe(400);
    expect(replayed.headers.has('set-cookie')).toBe(false);
    const cookie = verified.headers.get('set-cookie')!;
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=(Lax|Strict)/i);
    expect(cookie).toMatch(/Max-Age=900/i);
    const headers = { Cookie: cookie.split(';')[0] };
    const otherNetwork = await request(opened, '/radar', undefined, {
      ...headers,
      'CF-Connecting-IP': '198.51.100.19',
    });
    const otherNetworkHtml = await otherNetwork.text();
    expect(otherNetworkHtml).toContain('data-radar-verify');
    expect(otherNetworkHtml).not.toMatch(/reset-radar-qr|<strong>18%/);
    const [zh, en] = await Promise.all([
      request(opened, '/radar', undefined, headers),
      request(opened, '/en/radar/index.html', undefined, headers),
    ]);
    for (const response of [zh, en]) {
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.get('vary')).toContain('Cookie');
      const html = await response.text();
      expect(html).not.toContain('reset-radar-qr.jpg');
      expect(html).toContain(`data-ga4-measurement-id="${MEASUREMENT_ID}"`);
      expect(html).toContain('<h3>Codex</h3><strong>18%</strong>');
      expect(html).toContain('<h3>Claude Code</h3><strong>0%</strong>');
      expect(html).toContain('<h3>Antigravity</h3><strong>64%</strong>');
      expect(html).toContain(`datetime="${generatedAt}"`);
      expect(html).not.toMatch(
        /fictional-integration|api\.tangka\.online|visitor-credential|untrusted-name|private-upstream|private-judgement|<h3>Grok|data-radar-verify/,
      );
    }

    const { opened: noRadar } = await runtime();
    const lockedBeforeData = await request(noRadar, '/radar');
    const lockedBeforeDataHtml = await lockedBeforeData.text();
    expect(lockedBeforeDataHtml).toContain('data-radar-verify');
    expect(lockedBeforeDataHtml).not.toMatch(
      /data-ssr="radar-overview"|reset-radar-qr/,
    );
    const passedWithoutData = await request(noRadar, '/api/radar/verify', {
      turnstile_token: TOKEN,
    });
    expect(passedWithoutData.status).toBe(200);
    const openWithoutData = await request(noRadar, '/radar', undefined, {
      Cookie: passedWithoutData.headers.get('set-cookie')!.split(';')[0],
    });
    const openWithoutDataHtml = await openWithoutData.text();
    expect(openWithoutDataHtml).not.toContain('reset-radar-qr.jpg');
    expect(openWithoutDataHtml).toContain('暂未获取到额度重置预测。');
    expect(openWithoutDataHtml).not.toContain('data-radar-verify');

    expect(
      fetchMock.mock.calls.filter(([target]) =>
        String(target).startsWith('https://api.tangka.online/'),
      ),
    ).toHaveLength(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.tangka.online/radar-api/integrations/haomeile/overview',
    );
    const options = fetchMock.mock.calls[0][1];
    expect(options?.headers).toEqual({
      Accept: 'application/json',
      Authorization: `Bearer ${key}`,
    });
    expect(options?.redirect).toBe('error');
  });

  test('serves Radar and its analytics anonymously only when its human check is disabled', async () => {
    const key = 'fictional-integration-key-for-isolated-runtime-tests';
    const now = Date.now();
    const generatedAt = new Date(now).toISOString();
    const previousAt = new Date(now - 30 * 60_000).toISOString();
    const fetchMock = spyOn(globalThis, 'fetch').mockImplementation(
      Object.assign(
        async (target: Parameters<typeof fetch>[0]) => {
          expect(String(target)).toBe(
            'https://api.tangka.online/radar-api/integrations/haomeile/overview',
          );
          return Response.json({
            generatedAt,
            platforms: [{ id: 'antigravity', probability: 63.6 }],
            probabilityHistory24h: {
              codex: [{ timestamp: generatedAt, probability: 0 }],
              claude: [{ timestamp: generatedAt, probability: 33 }],
              antigravity: [
                { timestamp: generatedAt, probability: 63.6 },
                { timestamp: previousAt, probability: 62.1 },
                { timestamp: previousAt, probability: 62.4 },
                { timestamp: previousAt, probability: 101 },
                {
                  timestamp: new Date(now + 60_000).toISOString(),
                  probability: 50,
                },
                {
                  timestamp: new Date(now - 25 * 60 * 60_000).toISOString(),
                  probability: 10,
                },
              ],
              grok: [{ timestamp: generatedAt, probability: 97 }],
            },
          });
        },
        { preconnect() {} },
      ),
    );
    fetchSpies.push(fetchMock);
    const { opened } = await runtime(
      'radar-analytics-test-token',
      MEASUREMENT_ID,
      key,
      'false',
    );
    opened.radar!.start();
    await Bun.sleep(0);

    for (const path of ['/radar', '/en/radar/index.html']) {
      const response = await request(opened, path);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.has('set-cookie')).toBe(false);
      const html = await response.text();
      expect(html).toContain('<h3>Antigravity</h3><strong>64%</strong>');
      const trendSection = html.match(
        /<section[^>]*data-ssr="radar-history"[^>]*>/,
      )?.[0];
      expect(trendSection).toBeDefined();
      expect(trendSection).not.toContain('hidden');
      const trend = html.match(/data-radar-trend="([^"]+)"/)?.[1];
      expect(trend).toBeDefined();
      expect(JSON.parse(decodeHtml(trend!))).toEqual({
        generatedAt,
        series: [
          {
            id: 'codex',
            name: 'Codex',
            points: [{ time: now, probability: 0 }],
          },
          {
            id: 'claude',
            name: 'Claude Code',
            points: [{ time: now, probability: 33 }],
          },
          {
            id: 'antigravity',
            name: 'Antigravity',
            points: [
              { time: Date.parse(previousAt), probability: 62.4 },
              { time: now, probability: 63.6 },
            ],
          },
        ],
      });
      expect(html).not.toMatch(
        /data-radar-verify|fictional-integration|api\.tangka\.online/,
      );
      expect(html.match(/data-cf-beacon=/g)).toHaveLength(1);
      expect(html.match(/data-ga4-measurement-id=/g)).toHaveLength(1);
      expect(html).toContain(`data-ga4-measurement-id="${MEASUREMENT_ID}"`);
    }

    const verify = await request(opened, '/api/radar/verify', {
      turnstile_token: TOKEN,
    });
    expect(verify.status).toBe(404);
    expect(verify.headers.has('set-cookie')).toBe(false);
    expect((await request(opened, '/api/radar')).status).toBe(404);
    const submission = await request(opened, '/api/tombstones', input);
    expect(submission.status).toBe(400);
    expect(await submission.json()).toMatchObject({
      error: { code: 'TURNSTILE_FAILED' },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('renders Chinese and English routes with valid metadata, language switch links, and native rewritten HTML', async () => {
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
    expect(zh).not.toContain('static.cloudflareinsights.com');
    expect(zh).toContain('data-locale-switch');
    expect(zh).toContain('href="/en/"');
    const directChinese = await request(opened, '/submit?mode=edit', undefined, {
      'Accept-Language': 'en-US,en;q=0.9',
    });
    expect(directChinese.status).toBe(200);
    expect(directChinese.headers.has('Location')).toBe(false);
    expect(await directChinese.text()).toContain('<html lang="zh-CN">');
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
    expect(en).toContain('data-locale-switch');
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

  test('loads configured analytics on public reading pages only', async () => {
    const token = '0123456789abcdef0123456789abcdef';
    const beacon = 'https://static.cloudflareinsights.com/beacon.min.js';
    const { opened } = await runtime(token, MEASUREMENT_ID);
    for (const path of ['/', '/en/', '/tips', '/privacy', '/en/privacy']) {
      const response = await request(opened, path);
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html.match(/data-cf-beacon=/g)).toHaveLength(1);
      expect(html).toContain(`src="${beacon}"`);
      expect(html).toContain(token);
      expect(html.match(/data-ga4-measurement-id=/g)).toHaveLength(1);
      expect(html).toContain(`data-ga4-measurement-id="${MEASUREMENT_ID}"`);
      if (path === '/privacy') {
        expect(html).toContain('公开浏览页面使用 Google Analytics 4');
      }
      if (path === '/en/privacy') {
        expect(html).toContain('Public pages use Cloudflare Web Analytics');
        expect(html).toContain('Public pages use Google Analytics 4');
        expect(html).toContain('uses first-party cookies');
        expect(html).not.toContain('data-web-analytics-disabled');
      }
      const policy = response.headers.get('Content-Security-Policy') || '';
      expect(policy).toContain(beacon);
      expect(policy).toContain('https://cloudflareinsights.com');
      expect(policy).toContain('https://www.googletagmanager.com/gtag/');
      expect(policy).toContain('https://*.google-analytics.com');
      expect(policy.match(/(?:^|; )script-src [^;]*/)?.[0]).not.toContain(
        'unsafe-inline',
      );
      expect(policy).not.toContain('doubleclick');
      expect(response.headers.get('Referrer-Policy')).toBe(
        'strict-origin-when-cross-origin',
      );
    }

    for (const path of [
      '/submit',
      '/en/submit?mode=edit',
      '/epitaph',
      '/manage',
      '/admin',
      '/api/health',
      '/not-a-page',
    ]) {
      const response = await request(opened, path, undefined, {
        Authorization: AUTHORIZATION,
      });
      const html = await response.text();
      expect(html).not.toContain('data-cf-beacon');
      expect(html).not.toContain('data-ga4-measurement-id');
      const policy = response.headers.get('Content-Security-Policy') || '';
      expect(policy).not.toContain(beacon);
      expect(policy).not.toContain('googletagmanager.com');
      expect(policy).not.toContain('google-analytics.com');
    }

    const development = {
      ...opened,
      env: { ...opened.env, ENVIRONMENT: 'development' },
    };
    const local = await request(development, '/');
    const localHtml = await local.text();
    expect(localHtml).not.toContain('data-cf-beacon');
    expect(localHtml).not.toContain('data-ga4-measurement-id');
    const localPrivacy = await request(development, '/en/privacy');
    const localPrivacyHtml = await localPrivacy.text();
    expect(localPrivacyHtml).not.toContain(
      'Public pages use Cloudflare Web Analytics',
    );
    expect(localPrivacyHtml).not.toContain('Public pages use Google Analytics 4');
    expect(localPrivacyHtml).toContain('data-web-analytics-disabled');
  });

  test('validates the GA4 ID independently of Cloudflare Web Analytics', async () => {
    const { opened } = await runtime(undefined, MEASUREMENT_ID);
    const ga4Only = await request(opened, '/en/privacy');
    const ga4OnlyHtml = await ga4Only.text();
    expect(ga4OnlyHtml).toContain('data-ga4-measurement-id');
    expect(ga4OnlyHtml).toContain('Public pages use Google Analytics 4');
    expect(ga4OnlyHtml).not.toContain('data-cf-beacon');
    expect(ga4OnlyHtml).not.toContain(
      'Public pages use Cloudflare Web Analytics',
    );

    const malformed = {
      ...opened,
      env: {
        ...opened.env,
        CLOUDFLARE_WEB_ANALYTICS_TOKEN: '0123456789abcdef0123456789abcdef',
        GA4_MEASUREMENT_ID: `${MEASUREMENT_ID}"><script>`,
      },
    };
    const cloudflareOnly = await request(malformed, '/en/privacy');
    const cloudflareOnlyHtml = await cloudflareOnly.text();
    expect(cloudflareOnlyHtml).toContain('data-cf-beacon');
    expect(cloudflareOnlyHtml).toContain(
      'Public pages use Cloudflare Web Analytics',
    );
    expect(cloudflareOnlyHtml).not.toContain('data-ga4-measurement-id');
    expect(cloudflareOnlyHtml).not.toContain('Public pages use Google Analytics 4');
    expect(cloudflareOnly.headers.get('Content-Security-Policy')).not.toContain(
      'googletagmanager.com',
    );
  });

  test('queues one GA4 page view with sanitized URL, referrer, and title', async () => {
    const { opened } = await runtime(undefined, MEASUREMENT_ID);
    const response = await request(opened, '/assets/ga4.js');
    expect(response.ok).toBe(true);
    const window = { dataLayer: [] as IArguments[] };
    const scripts: { src: string }[] = [];
    runInNewContext(await response.text(), {
      window,
      URL,
      location: new URL(`${SITE}/t/ABC?hidden=secret#fragment`),
      document: {
        currentScript: { dataset: { ga4MeasurementId: MEASUREMENT_ID } },
        title: 'User-supplied title',
        referrer: `${SITE}/manage?hidden=secret#fragment`,
        createElement: () => ({}),
        head: { append: (script: { src: string }) => scripts.push(script) },
      },
    });
    const commands = window.dataLayer.map((entry) => Array.from(entry));
    expect(commands[0]).toEqual([
      'consent',
      'default',
      {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      },
    ]);
    expect(commands[2]).toEqual([
      'config',
      MEASUREMENT_ID,
      {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_location: `${SITE}/t/ABC`,
        page_referrer: SITE,
        page_title: '/t/ABC',
      },
    ]);
    expect(commands.filter(([command]) => command === 'event')).toEqual([
      ['event', 'page_view'],
    ]);
    expect(scripts.map(({ src }) => src)).toEqual([
      `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`,
    ]);
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
    expect(originalPage).toContain('class="flower-btn"');
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
