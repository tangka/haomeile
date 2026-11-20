import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/worker';
import type { Bindings } from '../../src/worker/types';
const shell = `<!doctype html><html><head><title>号没了</title><meta name="description" content=""><meta name="robots" content="index,follow"><link rel="canonical" href="https://haomeile.rip/"><meta property="og:title" content=""><meta property="og:description" content=""><meta property="og:url" content=""><meta property="og:type" content="website"><meta name="turnstile-site-key" content=""></head><body><h1 data-ssr="page-title">这里什么也没有</h1><p data-ssr="tally"></p><div data-ssr="wall"></div><div data-ssr="detail" data-tomb-id=""></div><a data-ssr="more" hidden>再看 20 块</a><div data-ssr="timeline"></div></body></html>`;
const assets = {
  async fetch(request: Request) {
    if (new URL(request.url).pathname === '/submit')
      return new Response(null, {
        status: 307,
        headers: { location: '/submit/' },
      });
    if (new URL(request.url).pathname === '/image.png')
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { 'content-type': 'image/png' },
      });
    return new Response(shell, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  },
} as unknown as Fetcher;
const bindings = { ...env, ASSETS: assets } as unknown as Bindings;
async function seed(
  id: string,
  status = 'approved',
  story = '这是一段只存在于测试数据库的示例内容。',
  vendor = 'claude',
) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,status,created_at,updated_at,approved_at) VALUES (?,'private-hash','渲染测试示例',?,'verification','2026-11-18',?,?,?,?,?)",
  )
    .bind(id, vendor, story, status, now, now, now)
    .run();
}
describe('Worker renders Astro templates on the server', () => {
  it.each([
    ['codex', 'Codex'],
    ['antigravity', 'Antigravity'],
  ])(
    'renders the %s product landing page with its actual name',
    async (vendor, name) => {
      await seed('PRODUCTAAA', 'approved', undefined, vendor);
      const response = await app.request(
        'https://haomeile.rip/v/' + vendor,
        {},
        bindings,
      );
      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain(name + ' 账号的墓碑');
      expect(html).toContain('href="https://haomeile.rip/v/' + vendor + '"');
      expect(html).toContain('/t/PRODUCTAAA');
    },
  );
  it('hides unsupported historical rows and rejects their product landing pages', async () => {
    await seed('LEGACYAAAA', 'approved', undefined, 'grok');
    const response = await app.request('https://haomeile.rip/', {}, bindings);
    const html = await response.text();
    for (const product of [
      'chatgpt',
      'gemini',
      'grok',
      'deepseek',
      'kimi',
      'qwen',
      'doubao',
      'other',
    ]) {
      expect(html).not.toContain('href="/v/' + product + '"');
      expect(
        (await app.request('https://haomeile.rip/v/' + product, {}, bindings))
          .status,
      ).toBe(404);
    }
    expect(html).not.toContain('/t/LEGACYAAAA');
    expect(
      (await app.request('https://haomeile.rip/t/LEGACYAAAA', {}, bindings))
        .status,
    ).toBe(404);
  });
  it('serves the edit form without a redirect that loses its query string', async () => {
    const response = await app.request(
      'https://haomeile.rip/submit?mode=edit',
      {},
      bindings,
    );
    expect(response.status).toBe(200);
    expect(response.headers.has('location')).toBe(false);
  });
  it('starts with an empty wall and injects the configured challenge key', async () => {
    const response = await app.request('https://haomeile.rip/', {}, bindings);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('这里还很安静。第一块碑，要不要由你来立？');
    expect(html).toContain('<strong>0</strong>');
    expect(html).toContain('content="1x00000000000000000000AA"');
  });
  it('includes first page and real pagination without requiring JavaScript', async () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTU')
      await seed('AAAAAAA' + letter + 'AA');
    await seed('PENDINGAAA', 'pending');
    const response = await app.request('https://haomeile.rip/', {}, bindings);
    const html = await response.text();
    expect((html.match(/class="tomb" /g) || []).length).toBe(20);
    expect(html).toMatch(/href="\/[?]cursor=/);
    expect(html).not.toContain('private-hash');
    expect(html).not.toContain('/t/PENDINGAAA');
    const cursor = /href="\/\?cursor=([^"]+)"/.exec(html)![1];
    const second = await app.request(
      'https://haomeile.rip/?cursor=' + cursor,
      {},
      bindings,
    );
    expect((await second.text()).match(/class="tomb" /g)).toHaveLength(1);
  });
  it('escapes user text and serializes structured data without script injection', async () => {
    await seed(
      'RENDERAAAA',
      'approved',
      '测试示例 </script><script>alert(1)</script> 的经过。',
    );
    const response = await app.request(
      'https://haomeile.rip/t/RENDERAAAA',
      {},
      bindings,
    );
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    let scriptElements = 0;
    await new HTMLRewriter()
      .on('script', {
        element() {
          scriptElements++;
        },
      })
      .transform(new Response(html))
      .text();
    expect(scriptElements).toBe(1);
    expect(html).toContain('\\u003c/script>');
    const raw =
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
        html,
      )![1]!;
    expect(JSON.parse(raw)[0].text).toContain('</script>');
    expect(html).toContain('https://haomeile.rip/t/RENDERAAAA');
  });
  it('returns 410 for withdrawn and 404 for unpublished or internal templates', async () => {
    await seed('WITHDRAWAA', 'withdrawn');
    await seed('HIDDENAAAA', 'hidden');
    await seed('PENDINGAAA', 'pending');
    expect(
      (await app.request('https://haomeile.rip/t/WITHDRAWAA', {}, bindings))
        .status,
    ).toBe(410);
    for (const path of [
      '/t/HIDDENAAAA',
      '/t/PENDINGAAA',
      '/t/AAAAAAAAAA',
      '/_templates/tomb/',
      '/v/demo_orange',
    ])
      expect(
        (await app.request('https://haomeile.rip' + path, {}, bindings)).status,
      ).toBe(404);
  });
  it('renders vendor pages conservatively and keeps binary assets untouched', async () => {
    await seed('VENDORAAAA');
    const html = await (
      await app.request('https://haomeile.rip/v/claude', {}, bindings)
    ).text();
    expect(html).toContain('Claude 账号的墓碑');
    expect(html).toContain('content="noindex,follow"');
    expect(html).toContain('href="https://haomeile.rip/v/claude"');
    const image = await app.request(
      'https://haomeile.rip/image.png',
      {},
      bindings,
    );
    expect([...new Uint8Array(await image.arrayBuffer())]).toEqual([
      137, 80, 78, 71,
    ]);
  });
});
