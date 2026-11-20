import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/worker';
import type { Bindings } from '../../src/worker/types';
import { siteOrigin, templateSiteUrl } from '../../src/shared/site';
import { localizeTemplate } from '../../src/worker/localize';
import { sitemapResponse } from '../../src/worker/sitemap';

const origin = 'https://haomeile.tangka.online';
const shell = `<!doctype html><html lang="zh-CN"><head><title>号没了</title><meta name="description" content=""><link rel="canonical" href="https://haomeile.rip/"><meta property="og:url" content="https://haomeile.rip/"><meta property="og:image" content="https://haomeile.rip/og/default.png"><script type="application/ld+json">{"@type":"WebSite","url":"https://haomeile.rip/","inLanguage":"zh-CN","description":"使用须知"}</script></head><body><div data-ssr="tally"></div><div data-ssr="wall"></div><div data-ssr="detail"></div><a href="https://haomeile.rip/about">关于</a><a href="https://example.com/">External</a></body></html>`;
const assets = {
  async fetch() {
    return new Response(shell, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
} as unknown as Fetcher;
const bindings = {
  ...env,
  ENVIRONMENT: 'production',
  SITE_ORIGIN: origin,
  ASSETS: assets,
} as unknown as Bindings;

describe('deployment site origin', () => {
  it('accepts only configured HTTP(S) origins and rejects paths or credentials', () => {
    expect(siteOrigin()).toBe('https://haomeile.rip');
    expect(siteOrigin(origin + '/')).toBe(origin);
    expect(siteOrigin('http://127.0.0.1:8790')).toBe('http://127.0.0.1:8790');
    for (const invalid of [
      '',
      'javascript:alert(1)',
      'ftp://example.com',
      'https://user:secret@example.com/',
      'https://example.com/path',
      'https://example.com/?value=1',
      'https://example.com/#fragment',
    ])
      expect(() => siteOrigin(invalid)).toThrow();
    expect(
      templateSiteUrl('https://haomeile.rip.evil.example/', origin),
    ).toBeNull();
    expect(templateSiteUrl('https://example.com/', origin)).toBeNull();
  });

  it.each(['zh', 'en'] as const)(
    'rewrites only first-party structured template URLs for %s',
    (locale) => {
      const html = localizeTemplate(shell, locale, origin);
      const data = JSON.parse(
        /application\/ld\+json">(.*?)<\/script>/.exec(html)![1],
      );
      expect(data.url).toBe(origin + (locale === 'en' ? '/en/' : '/'));
      expect(data.inLanguage).toBe(locale === 'en' ? 'en' : 'zh-CN');
      expect(data.description).toBe(locale === 'en' ? 'Rules' : '使用须知');
      expect(html).toContain('https://example.com/');
    },
  );

  it.each(['/', '/en/submit'])(
    "uses configured origin for %s metadata instead of the request's Host",
    async (path) => {
      const response = await app.request(
        'https://untrusted-host.invalid' + path,
        {},
        bindings,
      );
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain(`rel="canonical" href="${origin}${path}"`);
      expect(html).toContain(`property="og:url" content="${origin}${path}"`);
      expect(html).toContain(
        `property="og:image" content="${origin}/og/default.png"`,
      );
      expect(html).toContain(
        `hreflang="zh-CN" href="${origin}${path.startsWith('/en/') ? '/submit' : '/'}"`,
      );
      expect(html).toContain(
        `href="${origin}${path.startsWith('/en/') ? '/en/about' : '/about'}"`,
      );
      expect(html).toContain('href="https://example.com/"');
      expect(html).not.toContain('https://haomeile.rip');
      expect(html).not.toContain('https://untrusted-host.invalid');
    },
  );

  it('uses configured origin for dynamic structured data and keeps original user text', async () => {
    await env.DB.prepare(
      "INSERT INTO tombstones (id,secret_hash,codename,nickname,vendor,event_type,died_at,story,epitaph,status,created_at,updated_at,approved_at) VALUES ('ORIGINAAAA','private','使用须知','匿名小橘','claude','verification','2026-11-18','这里什么也没有。','账号停用','approved','2026-11-18T00:00:00Z','2026-11-18T00:00:00Z','2026-11-18T00:00:00Z')",
    ).run();
    const response = await app.request(
      'https://untrusted-host.invalid/en/t/ORIGINAAAA',
      {},
      bindings,
    );
    expect(response.status).toBe(200);
    const html = await response.text();
    const data = JSON.parse(
      /application\/ld\+json">(.*?)<\/script>/.exec(html)![1],
    );
    expect(data[0].url).toBe(origin + '/en/t/ORIGINAAAA');
    expect(data[0].text).toBe('这里什么也没有。');
    expect(data[1].itemListElement[0].item).toBe(origin + '/en/');
    expect(data[1].itemListElement[1].item).toBe(origin + '/en/v/claude');
    expect(html).toContain('<h1 class="tomb-name">使用须知</h1>');
    expect(html).toContain(
      'rel="canonical" href="' + origin + '/en/t/ORIGINAAAA"',
    );
    expect(html).not.toContain('https://haomeile.rip');
  });

  it('generates sitemap language pairs at the configured origin', async () => {
    const response = await sitemapResponse(
      env.DB,
      new URL('https://untrusted-host.invalid/sitemap.xml'),
      undefined,
      origin,
    );
    const xml = await response!.text();
    expect(xml).toContain(`<loc>${origin}/</loc>`);
    expect(xml).toContain(`<loc>${origin}/en/</loc>`);
    expect(xml).toContain(`hreflang="zh-CN" href="${origin}/"`);
    expect(xml).not.toContain('https://haomeile.rip');
    expect(xml).not.toContain('https://untrusted-host.invalid');
  });

  it('accepts a submission Origin only when it matches deployment configuration', async () => {
    const request = (source: string) =>
      app.request(
        origin + '/api/tombstones',
        {
          method: 'POST',
          headers: { Origin: source, 'Content-Type': 'application/json' },
          body: '{}',
        },
        bindings,
      );
    expect((await request(origin)).status).toBe(400);
    expect((await request('https://haomeile.rip')).status).toBe(403);
    expect((await request(origin + '.evil.example')).status).toBe(403);
  });
});
