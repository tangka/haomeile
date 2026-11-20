import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/worker';
import type { Bindings } from '../../src/worker/types';
import { localizeTemplate } from '../../src/worker/localize';
import { basePath, browserLocale, localePath, tr } from '../../src/shared/i18n';

const template = `<!doctype html><html lang="zh-CN"><head><title>使用须知 · 号没了</title><link rel="canonical" href="https://haomeile.rip/submit"><meta property="og:locale" content="zh_CN"></head><body><nav><a href="/">纪念墙</a><a href="/submit">立碑</a></nav><h1>使用须知</h1><div data-ssr="tally"></div><div data-ssr="wall"></div><div data-ssr="detail"></div><div data-ssr="timeline"></div><a data-ssr="more" hidden>再看 20 块</a></body></html>`;
const assets = {
  async fetch(request: Request) {
    const path = new URL(request.url).pathname;
    if (path.endsWith('.html'))
      return new Response(null, {
        status: 307,
        headers: {
          location: path.replace(/\/index\.html$/, '/').replace(/\.html$/, '/'),
        },
      });
    return new Response(template, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
} as unknown as Fetcher;
const bindings = { ...env, ASSETS: assets } as unknown as Bindings;
async function seed(id: string, status = 'approved') {
  await env.DB.prepare(
    "INSERT INTO tombstones (id,secret_hash,codename,nickname,vendor,event_type,died_at,story,epitaph,status,created_at,updated_at,approved_at) VALUES (?,'private','使用须知','匿名小橘','claude','verification','2026-11-18','这里什么也没有。','账号停用',?,'2026-11-18T00:00:00Z','2026-11-18T00:00:00Z','2026-11-18T00:00:00Z')",
  )
    .bind(id, status)
    .run();
}
describe('Chinese and English pages', () => {
  it('normalizes routes without localizing external URLs or assets', () => {
    expect(basePath('/en/submit')).toBe('/submit');
    expect(basePath('/english')).toBe('/english');
    expect(localePath('/en/submit?mode=edit', 'zh')).toBe('/submit?mode=edit');
    expect(localePath('/assets/logo.svg', 'en')).toBe('/assets/logo.svg');
    expect(localePath('//example.com/', 'en')).toBe('//example.com/');
    expect(localePath('https://example.com/', 'en')).toBe(
      'https://example.com/',
    );
  });
  it.each([
    [null, 'zh'],
    ['', 'zh'],
    ['zh-CN,zh;q=0.9,en;q=0.8', 'zh'],
    ['zh-HK', 'zh'],
    ['zh-Hant-TW', 'zh'],
    ['en-US,zh;q=0.8', 'en'],
    ['fr-FR,zh;q=0.8', 'en'],
    ['zh;q=0.2,en-US;q=0.9', 'en'],
    ['en;q=0,zh;q=0.7', 'zh'],
    ['en;q=invalid,zh;q=0.5', 'zh'],
    ['*', 'zh'],
  ])('selects browser language %s as %s', (header, expected) => {
    expect(browserLocale(header)).toBe(expected);
  });
  it.each(['/', '/submit?mode=edit', '/t/ABCDEFGH22', '/v/claude'])(
    'automatically redirects English browser visits to %s with a private varying response',
    async (path) => {
      const response = await app.request(
        'https://haomeile.rip' + path,
        { headers: { 'Accept-Language': 'en-US,en;q=0.9' } },
        bindings,
      );
      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBe('/en' + path);
      expect(response.headers.get('vary')).toBe('Accept-Language');
      expect(response.headers.get('cache-control')).toBe('private, no-store');
      expect(response.headers.has('set-cookie')).toBe(false);
    },
  );
  it('keeps Chinese browser visits in Chinese and does not redirect APIs, assets or explicit English pages', async () => {
    const response = await app.request(
      'https://haomeile.rip/submit',
      { headers: { 'Accept-Language': 'zh-HK,en;q=0.8' } },
      bindings,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('vary')).toBe('Accept-Language');
    expect(await response.text()).toContain('lang="zh-CN"');
    for (const path of [
      '/api/health',
      '/assets/flower.svg',
      '/robots.txt',
      '/en/submit',
    ]) {
      const result = await app.request(
        'https://haomeile.rip' + path,
        { headers: { 'Accept-Language': 'en-US' } },
        bindings,
      );
      expect(result.headers.has('location')).toBe(false);
    }
    expect(
      (
        await app.request(
          'https://haomeile.rip/admin',
          { headers: { 'Accept-Language': 'en-US' } },
          bindings,
        )
      ).status,
    ).toBe(403);
  });
  it('translates template text and attributes without changing enums, scripts or valid JSON', () => {
    const html = localizeTemplate(
      `<h1>使用须知</h1><input value="账号停用" aria-label="使用须知"><script>const x="使用须知";</script><script type="application/ld+json">{"@type":"WebSite","inLanguage":"zh-CN","description":"使用须知","url":"https://haomeile.rip/"}</script>`,
      'en',
    );
    expect(html).toContain('<h1>Rules</h1>');
    expect(html).toContain('value="账号停用" aria-label="Rules"');
    expect(html).toContain('const x="使用须知";');
    const json = JSON.parse(
      /application\/ld\+json">(.*?)<\/script>/.exec(html)![1],
    );
    expect(json).toMatchObject({
      inLanguage: 'en',
      description: 'Rules',
      url: 'https://haomeile.rip/en/',
    });
    expect(localizeTemplate(template, 'zh')).toBe(template);
  });
  it('serves stable English pages with correct metadata and no language selector', async () => {
    const response = await app.request(
      'https://haomeile.rip/en/submit?mode=edit',
      {},
      bindings,
    );
    expect(response.status).toBe(200);
    expect(response.headers.has('location')).toBe(false);
    const html = await response.text();
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<h1>Rules</h1>');
    expect(html).not.toContain('data-locale-switch');
    expect(html).toContain('href="/en/submit"');
    expect(html).toContain('href="https://haomeile.rip/en/submit"');
    expect(html).toContain('hreflang="zh-CN"');
    expect(html).toContain('content="en_US"');
    expect(html).not.toContain('href="/en/en/');
  });
  it.each([
    '/en/submit/index.html?mode=edit',
    '/en/submit.html?mode=edit',
    '/en/about/index.html',
  ])(
    'serves static alias %s internally without losing locale or query',
    async (path) => {
      const response = await app.request(
        'https://haomeile.rip' + path,
        {},
        bindings,
      );
      expect(response.status).toBe(200);
      expect(response.headers.has('location')).toBe(false);
      expect(await response.text()).toContain('lang="en"');
    },
  );
  it('localizes SSR labels and links while preserving every user-authored field', async () => {
    await seed('I2NAAAAAAA');
    const response = await app.request(
      'https://haomeile.rip/en/',
      {},
      bindings,
    );
    const html = await response.text();
    expect(html).toContain('href="/en/t/I2NAAAAAAA"');
    expect(html).toContain('User-submitted, unverified');
    expect(html).toContain('Verification blocked');
    expect(html).toContain('<h3 class="tomb-name">使用须知</h3>');
    expect(html).toContain('<p class="tomb-story">这里什么也没有。</p>');
    expect(html).toContain('<p class="tomb-epitaph">账号停用</p>');
    expect(html).toContain('public memorials');
    const detail = await (
      await app.request('https://haomeile.rip/en/t/I2NAAAAAAA', {}, bindings)
    ).text();
    expect(detail).toContain('匿名小橘');
    expect(detail).toContain('<h1 class="tomb-name">使用须知</h1>');
    expect(detail).toContain('https://haomeile.rip/en/t/I2NAAAAAAA');
    const json = JSON.parse(
      /application\/ld\+json">(.*?)<\/script>/.exec(detail)![1],
    );
    expect(json[0].text).toBe('这里什么也没有。');
    expect(json[0]).not.toHaveProperty('inLanguage');
  });
  it('keeps the Chinese default and localizes English error pages', async () => {
    const chinese = await (
      await app.request('https://haomeile.rip/', {}, bindings)
    ).text();
    expect(chinese).toContain('<html lang="zh-CN">');
    expect(chinese).toContain('这里还很安静');
    const empty = await (
      await app.request('https://haomeile.rip/en/', {}, bindings)
    ).text();
    expect(empty).toContain('Would you like to leave the first memorial?');
    await seed('WITHDRAAAA', 'withdrawn');
    const gone = await app.request(
      'https://haomeile.rip/en/t/WITHDRAAAA',
      {},
      bindings,
    );
    expect(gone.status).toBe(410);
    expect(await gone.text()).toContain('This memorial has been withdrawn');
    expect(
      (
        await app.request(
          'https://haomeile.rip/en/_templates/tomb/',
          {},
          bindings,
        )
      ).status,
    ).toBe(404);
  });
  it('protects every English admin alias and localizes API errors without changing public data', async () => {
    for (const path of [
      '/en/admin',
      '/en/admin/',
      '/en/admin/index.html',
      '/en/admin.html',
    ]) {
      const response = await app.request(
        'https://haomeile.rip' + path,
        {},
        bindings,
      );
      expect(response.status).toBe(403);
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toContain(
        'Authenticate as the site administrator first.',
      );
    }
    const response = await app.request(
      'https://haomeile.rip/api/tombstones',
      {
        method: 'POST',
        headers: {
          Origin: 'https://haomeile.rip',
          'Content-Type': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        body: '{}',
      },
      bindings,
    );
    expect(response.status).toBe(400);
    const raw = await response.text();
    expect(raw).not.toMatch(/[\u4e00-\u9fff]/);
    const missing = await app.request(
      'https://haomeile.rip/api/nothing',
      { headers: { 'Accept-Language': 'en' } },
      bindings,
    );
    expect(await missing.text()).toContain('This endpoint does not exist.');
    expect(tr('请先通过站长身份验证。', 'en')).toBe(
      'Authenticate as the site administrator first.',
    );
  });
});
