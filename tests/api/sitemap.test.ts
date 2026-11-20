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
    expect(xml.match(/<url>/g)).toHaveLength(7);
    expect(
      await env.DB.prepare('SELECT count(*) n FROM tombstones').first('n'),
    ).toBe(9);
  });
  it('lists the six public static routes using an actual supplied build timestamp', async () => {
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
      '/rules',
      '/privacy',
      '/about',
    ])
      expect(xml).toContain(`<loc>https://haomeile.rip${path}</loc>`);
    expect(xml.match(/<url>/g)).toHaveLength(6);
    expect(
      xml.match(
        new RegExp(
          `<lastmod>${deployedAt.replaceAll('.', '\\.')}</lastmod>`,
          'g',
        ),
      ),
    ).toHaveLength(6);
    expect(xml).not.toMatch(
      /\/submit|\/manage|\/admin|\/api\/|untrusted-request-host|priority|changefreq/,
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
    expect(xml).not.toContain('/v/antigravity');
    expect(xml).toContain(
      `<loc>https://haomeile.rip/t/AAAAAAAAAA</loc><lastmod>${updatedAt}</lastmod>`,
    );
    for (const id of ['JJJJJJJJJJ', 'KKKKKKKKKK', 'LLLLLLLLLL', 'MMMMMMMMMM'])
      expect(xml).not.toContain(id);
    expect(xml).not.toMatch(
      /secret_hash|站点地图测试示例|这段示例自述|not-a-usable-credential/,
    );
    expect(xml.match(/<url>/g)).toHaveLength(16);
  });
  it('removes a withdrawn address immediately from the next generated sitemap', async () => {
    const credential = await createCredentials(env.PEPPER);
    await insert(credential.id, 'approved', 'claude', credential.secret_hash);
    expect(await (await map())!.text()).toContain('/t/' + credential.id);
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
  it('splits more than 45000 approved records into bounded deterministic parts', async () => {
    await env.DB.prepare(
      "WITH RECURSIVE sequence(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM sequence WHERE n<=?) INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) SELECT printf('S%09d',n),'test-only-hash','分片测试示例','codex','other','2026-11-18','仅供本地站点地图分片测试使用的示例。','approved',?,?,? FROM sequence",
    )
      .bind(SITEMAP_PAGE_SIZE, updatedAt, updatedAt, updatedAt)
      .run();
    const root = await (await map('/sitemap.xml', deployedAt))!.text();
    expect(root).toContain('<sitemapindex');
    expect(root).toContain('/sitemaps/static.xml');
    expect(root).toContain('/sitemaps/tombstones-1.xml');
    expect(root).toContain('/sitemaps/tombstones-2.xml');
    expect(root).not.toContain('/t/S');
    const first = await (await map('/sitemaps/tombstones-1.xml'))!.text();
    const second = await (await map('/sitemaps/tombstones-2.xml'))!.text();
    expect(first.match(/<url>/g)).toHaveLength(SITEMAP_PAGE_SIZE);
    expect(second.match(/<url>/g)).toHaveLength(1);
    expect(first).toContain('/t/S000000001');
    expect(first).toContain('/t/S000045000');
    expect(second).toContain('/t/S000045001');
    expect(first).not.toContain('/v/codex');
    const staticXml = await (await map(
      '/sitemaps/static.xml',
      deployedAt,
    ))!.text();
    expect(staticXml).toContain('/v/codex');
    expect(staticXml).not.toContain('/t/S');
    expect(await map('/sitemaps/tombstones-3.xml')).toBeNull();
    expect(await map('/sitemaps/tombstones-0.xml')).toBeNull();
    await env.DB.prepare("DELETE FROM tombstones WHERE id='S000045001'").run();
    expect(await (await map())!.text()).toContain('<urlset');
  }, 20_000);
});
