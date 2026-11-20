import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import {
  escapeXml,
  sitemapResponse,
  SITEMAP_PAGE_SIZE,
} from '../../src/worker/sitemap';
import { createCredentials } from '../../src/worker/lib/crypto';
import { publicRoutes } from '../../src/worker/routes/public';
import type { Bindings, TombStatus } from '../../src/worker/types';

const deployedAt = '2026-11-19T12:34:56.000Z';
const updatedAt = '2026-11-20T01:02:03.000Z';
function expectLanguagePair(xml: string, path: string): void {
  const zh = `https://haomeile.rip${path}`;
  const en = `https://haomeile.rip/en${path}`;
  const entries = xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
  for (const href of [zh, en]) {
    const entry = entries.find((value) => value.includes(`<loc>${href}</loc>`));
    expect(entry).toBeDefined();
    expect(entry).toContain(
      `<xhtml:link rel="alternate" hreflang="zh-CN" href="${zh}"/>`,
    );
    expect(entry).toContain(
      `<xhtml:link rel="alternate" hreflang="en" href="${en}"/>`,
    );
    expect(entry).toContain(
      `<xhtml:link rel="alternate" hreflang="x-default" href="${zh}"/>`,
    );
  }
}
const map = (path = '/sitemap.xml', build?: string) =>
  sitemapResponse(
    env.DB,
    new URL(path, 'https://untrusted-request-host.invalid'),
    build,
  );
async function insert(
  id: string,
  status: TombStatus = 'approved',
  vendor = 'claude',
  secretHash = 'not-a-usable-credential',
): Promise<void> {
  await env.DB.prepare(
    "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) VALUES (?,?,'站点地图测试示例',?,'verification','2026-11-18','这段示例自述与凭据都不应该出现在站点地图中。',?,?,?,?)",
  )
    .bind(
      id,
      secretHash,
      vendor,
      status,
      updatedAt,
      updatedAt,
      status === 'approved' ? updatedAt : null,
    )
    .run();
}
describe('dynamic sitemap', () => {
  it('never lists retained unsupported products or their historical tombstones', async () => {
    await insert('SUPPORTEDA', 'approved', 'codex');
    for (const [index, product] of [
      'chatgpt',
      'gemini',
      'grok',
      'deepseek',
      'kimi',
      'qwen',
      'doubao',
      'other',
    ].entries()) {
      await insert(
        'LEGACYAAA' + String.fromCharCode(65 + index),
        'approved',
        product,
      );
    }
    const xml = await (await map())!.text();
    expect(xml).toContain('/t/SUPPORTEDA');
    expect(xml).not.toContain('/t/LEGACY');
    expectLanguagePair(xml, '/t/SUPPORTEDA');
    expect(xml.match(/<url>/g)).toHaveLength(14);
    expect(
      await env.DB.prepare('SELECT count(*) n FROM tombstones').first('n'),
    ).toBe(9);
  });
  it('lists both languages of the six public static routes with reciprocal alternates and build timestamps', async () => {
    const response = (await map('/sitemap.xml', deployedAt))!;
    expect(response.headers.get('content-type')).toBe(
      'application/xml; charset=utf-8',
    );
    expect(response.headers.get('cache-control')).toBe('public, max-age=300');
    const xml = await response.text();
    for (const path of [
      '/',
      '/epitaph',
      '/appeal',
      '/tips',
      '/privacy',
      '/about',
    ])
      expectLanguagePair(xml, path);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml.match(/<url>/g)).toHaveLength(12);
    expect(xml.match(/<xhtml:link /g)).toHaveLength(36);
    expect(
      xml.match(
        new RegExp(
          `<lastmod>${deployedAt.replaceAll('.', '\\.')}</lastmod>`,
          'g',
        ),
      ),
    ).toHaveLength(12);
    expect(xml).not.toMatch(
      /\/submit|\/rules|\/manage|\/admin|\/api\/|untrusted-request-host|priority|changefreq/,
    );
    expect(await (await map())!.text()).not.toContain('<lastmod>');
    expect(await map('/not-a-sitemap')).toBeNull();
  });
  it('includes approved tombstones only, with vendor pages at five visible records', async () => {
    for (const id of [
      'AAAAAAAAAA',
      'BBBBBBBBBB',
      'CCCCCCCCCC',
      'DDDDDDDDDD',
      'EEEEEEEEEE',
    ])
      await insert(id);
    for (const id of ['FFFFFFFFFF', 'GGGGGGGGGG', 'HHHHHHHHHH', 'IIIIIIIIII'])
      await insert(id, 'approved', 'antigravity');
    for (const [id, status] of [
      ['JJJJJJJJJJ', 'pending'],
      ['KKKKKKKKKK', 'hidden'],
      ['LLLLLLLLLL', 'rejected'],
      ['MMMMMMMMMM', 'withdrawn'],
    ] as const)
      await insert(id, status);
    const xml = await (await map('/sitemap.xml', deployedAt))!.text();
    expect(xml).toContain('<loc>https://haomeile.rip/v/claude</loc>');
    expectLanguagePair(xml, '/v/claude');
    expect(xml).not.toContain('/v/antigravity');
    expect(xml).toContain(
      `<loc>https://haomeile.rip/t/AAAAAAAAAA</loc><lastmod>${updatedAt}</lastmod>`,
    );
    expectLanguagePair(xml, '/t/AAAAAAAAAA');
    expect(xml).toContain(
      `<loc>https://haomeile.rip/en/t/AAAAAAAAAA</loc><lastmod>${updatedAt}</lastmod>`,
    );
    for (const id of ['JJJJJJJJJJ', 'KKKKKKKKKK', 'LLLLLLLLLL', 'MMMMMMMMMM'])
      expect(xml).not.toContain(id);
    expect(xml).not.toMatch(
      /secret_hash|站点地图测试示例|这段示例自述|not-a-usable-credential/,
    );
    expect(xml.match(/<url>/g)).toHaveLength(32);
  });
  it('removes a withdrawn address immediately from the next generated sitemap', async () => {
    const credential = await createCredentials(env.PEPPER);
    await insert(credential.id, 'approved', 'claude', credential.secret_hash);
    expectLanguagePair(await (await map())!.text(), '/t/' + credential.id);
    const withdrawn = await publicRoutes.request(
      '/manage/withdraw',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'CF-Connecting-IP': '203.0.113.17',
        },
        body: JSON.stringify({ id: credential.id, secret: credential.secret }),
      },
      env as unknown as Bindings,
    );
    expect(withdrawn.status).toBe(200);
    expect(await (await map())!.text()).not.toContain('/t/' + credential.id);
  });
  it('escapes XML and never reflects malformed timestamp values', async () => {
    expect(escapeXml('a&<b>"\'')).toBe('a&amp;&lt;b&gt;&quot;&apos;');
    const xml = await (await map('/sitemap.xml', 'bad<timestamp>'))!.text();
    expect(xml).not.toContain('bad');
    expect(xml).not.toContain('<lastmod>');
  });
  it('splits after 22500 records to keep bilingual URL sets below 50000 entries', async () => {
    // Simulate the count boundary with sparse page samples, without a huge fixture.
    let total = SITEMAP_PAGE_SIZE + 1;
    const pages: number[][] = [];
    const db = {
      batch: async () => [
        { results: [{ total }] },
        {
          results: ['claude', 'codex', 'antigravity'].map((vendor) => ({
            vendor,
            modified: updatedAt,
          })),
        },
      ],
      prepare: () => {
        let offset = 0;
        const statement = {
          bind: (limit: number, start: number) => {
            pages.push([limit, start]);
            offset = start;
            return statement;
          },
          all: async () => ({
            results: (offset === 0
              ? ['S000000001', 'S000022500']
              : ['S000022501']
            ).map((id) => ({ id, updated_at: updatedAt })),
          }),
        };
        return statement;
      },
    } as unknown as D1Database;
    const boundaryMap = (path = '/sitemap.xml') =>
      sitemapResponse(db, new URL(path, 'https://haomeile.rip'), deployedAt);
    expect(SITEMAP_PAGE_SIZE).toBe(22_500);
    expect(SITEMAP_PAGE_SIZE * 2 + 18).toBeLessThan(50_000);
    const root = await (await boundaryMap())!.text();
    expect(root).toContain('<sitemapindex');
    expect(root).toContain('/sitemaps/static.xml');
    expect(root).toContain('/sitemaps/tombstones-1.xml');
    expect(root).toContain('/sitemaps/tombstones-2.xml');
    expect(root).not.toContain('/t/S');
    expect(pages).toHaveLength(0);
    const first = await (await boundaryMap(
      '/sitemaps/tombstones-1.xml',
    ))!.text();
    const second = await (await boundaryMap(
      '/sitemaps/tombstones-2.xml',
    ))!.text();
    expect(pages).toEqual([
      [SITEMAP_PAGE_SIZE, 0],
      [SITEMAP_PAGE_SIZE, SITEMAP_PAGE_SIZE],
    ]);
    expectLanguagePair(first, '/t/S000000001');
    expectLanguagePair(first, '/t/S000022500');
    expectLanguagePair(second, '/t/S000022501');
    expect(first.match(/<url>/g)).toHaveLength(4);
    expect(second.match(/<url>/g)).toHaveLength(2);
    expect(first).not.toContain('/v/codex');
    const staticXml = await (await boundaryMap('/sitemaps/static.xml'))!.text();
    expectLanguagePair(staticXml, '/v/codex');
    expect(staticXml.match(/<url>/g)).toHaveLength(18);
    expect(staticXml).not.toContain('/t/S');
    expect(await boundaryMap('/sitemaps/tombstones-3.xml')).toBeNull();
    expect(await boundaryMap('/sitemaps/tombstones-0.xml')).toBeNull();
    total = SITEMAP_PAGE_SIZE;
    const unsplit = await (await boundaryMap())!.text();
    expect(unsplit).toContain('<urlset');
    expect(unsplit).not.toContain('<sitemapindex');
    expectLanguagePair(unsplit, '/t/S000022500');
  });
});
