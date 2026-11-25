import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/worker';
import type { Bindings } from '../../src/worker/types';
const shell = `<!doctype html><html><head><title>号没了</title><meta name="description" content=""><meta name="robots" content="index,follow"><link rel="canonical" href="https://haomeile.rip/"><meta property="og:title" content=""><meta property="og:description" content=""><meta property="og:url" content=""><meta property="og:type" content="website"><meta name="turnstile-site-key" content=""></head><body><h1 data-ssr="page-title">这里什么也没有</h1><section data-ssr="vendor-answer" hidden></section><section data-ssr="tally-section" hidden><p data-ssr="tally"></p></section><div data-ssr="wall"></div><div data-ssr="detail" data-tomb-id=""></div><section data-ssr="next-steps"></section><a data-ssr="more" hidden>再看 20 块</a><section data-ssr="timeline-section" hidden><div data-ssr="timeline"></div></section></body></html>`;
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
  it('attributes bilingual community summaries without translating user submissions', async () => {
    await seed('COMMUNITYA', 'approved', '公开原帖的中文编辑摘要。');
    await env.DB.prepare(
      `UPDATE tombstones SET origin='community',source_url=?,source_platform='GitHub',source_published_at='2026-06-10',codename_en=?,story_en=?,died_at='',appeal_status='restored' WHERE id='COMMUNITYA'`,
    )
      .bind(
        'https://github.com/anthropics/claude-code/issues/67069',
        'An editorial title',
        'An editor summary with <untrusted> source text.',
      )
      .run();
    const english = await (
      await app.request('https://haomeile.rip/en/t/COMMUNITYA', {}, bindings)
    ).text();
    expect(english).toContain('An editorial title');
    expect(english).toContain('An editor summary with &lt;untrusted&gt;');
    expect(english).not.toContain('公开原帖的中文编辑摘要。');
    expect(english).not.toContain('class="tomb-origin"');
    expect(english).toContain('Incident date not stated');
    expect(english).toContain('Read original post · GitHub');
    expect(english).toContain('rel="noopener noreferrer nofollow"');
    expect(english).toContain('2026-06-10');
    expect(english).toContain('Restored');
    const structured = JSON.parse(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
        english,
      )![1],
    )[0];
    expect(structured['@type']).toBe('Article');
    expect(structured.author).toEqual({
      '@type': 'Organization',
      name: 'Haomeile',
    });
    expect(structured.citation).toBe(
      'https://github.com/anthropics/claude-code/issues/67069',
    );
    const chinese = await (
      await app.request('https://haomeile.rip/t/COMMUNITYA', {}, bindings)
    ).text();
    expect(chinese).toContain('公开原帖的中文编辑摘要。');
    expect(chinese).toContain('查看原帖');
    expect(chinese).toContain(
      '本站根据 GitHub 原帖（2026-06-10）整理，非原文作者撰写。',
    );
    const based = JSON.parse(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
        chinese,
      )![1],
    )[0];
    expect(based.author.name).toBe('号没了');
    expect(based.isBasedOn).toEqual({
      '@type': 'CreativeWork',
      url: 'https://github.com/anthropics/claude-code/issues/67069',
      datePublished: '2026-06-10',
    });
    expect(chinese).toContain('content="noindex,follow"');

    await seed(
      'SUSPENDEDA',
      'approved',
      '账号被停用后的申诉过程记录。',
      'claude',
    );
    await env.DB.prepare(
      "UPDATE tombstones SET event_type='suspended' WHERE id='SUSPENDEDA'",
    ).run();
    const suspendedHtml = await (
      await app.request('https://haomeile.rip/t/SUSPENDEDA', {}, bindings)
    ).text();
    expect(suspendedHtml).toContain('：Claude 账号停用 · 号没了');
    expect(suspendedHtml).not.toContain('账号账号停用');

    await seed('USERSTORYA', 'approved', '这段用户自述不应自动翻译。');
    await env.DB.prepare(
      "UPDATE tombstones SET story_en='Must not be shown' WHERE id='USERSTORYA'",
    ).run();
    const original = await (
      await app.request('https://haomeile.rip/en/t/USERSTORYA', {}, bindings)
    ).text();
    expect(original).toContain('这段用户自述不应自动翻译。');
    expect(original).not.toContain('Must not be shown');
    expect(original).toContain('class="flower-btn"');
  });
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
      expect(html).toContain(
        vendor === 'codex'
          ? 'Codex 或 ChatGPT 账号被停用，怎么办？'
          : name + ' 提示 403 或服务停用，怎么办？',
      );
      expect(html).toContain('href="https://haomeile.rip/v/' + vendor + '"');
      expect(html).toContain('/t/PRODUCTAAA');
    },
  );
  it('points every record to what to do next and to similar records', async () => {
    for (const id of ['NEXTAAAAAA', 'NEXTBBBBBB', 'NEXTCCCCCC', 'NEXTDDDDDD'])
      await seed(id, 'approved', undefined, 'antigravity');
    await seed('NEXTEEEEEE', 'hidden', undefined, 'antigravity');
    await seed('NEXTFFFFFF', 'approved', undefined, 'claude');
    const section = (html: string) =>
      /<section data-ssr="next-steps">([\s\S]*?)<\/section>/.exec(html)![1];
    const zh = section(
      await (
        await app.request('https://haomeile.rip/t/NEXTAAAAAA', {}, bindings)
      ).text(),
    );
    expect(zh.match(/href="\/t\//g)).toHaveLength(3);
    expect(zh).not.toMatch(/NEXTAAAAAA|NEXTEEEEEE|NEXTFFFFFF/);
    expect(zh).toContain('href="/v/antigravity#answer"');
    expect(zh).toContain('href="/appeal#antigravity"');
    expect(zh).toContain('/tips/antigravity-paid-plan-starter-quota');
    const en = section(
      await (
        await app.request('https://haomeile.rip/en/t/NEXTAAAAAA', {}, bindings)
      ).text(),
    );
    expect(en).toContain('Similar records');
    expect(en).toContain('href="/en/v/antigravity"');
  });
  it('answers the vendor question first and only lists timeline posts that are still public', async () => {
    const add = async (id: string, status: string, source: string) => {
      await seed(id, status, undefined, 'antigravity');
      await env.DB.prepare(
        "UPDATE tombstones SET origin='community',source_url=? WHERE id=?",
      )
        .bind(source, id)
        .run();
    };
    await add(
      'TIMELINEAA',
      'approved',
      'https://discuss.ai.google.dev/t/203618',
    );
    await add('TIMELINEBB', 'hidden', 'https://discuss.ai.google.dev/t/203919');
    const page = async (path: string) =>
      (await app.request('https://haomeile.rip' + path, {}, bindings)).text();

    const zh = await page('/v/antigravity');
    expect(zh).toContain('Antigravity 提示 403 或服务停用，怎么办？');
    expect(zh).toContain('href="https://forms.gle/hGzM9MEUv2azZsrb9"');
    expect(zh).toContain('href="/t/TIMELINEAA"');
    expect(zh).not.toContain('/t/TIMELINEBB');
    expect(zh).not.toContain('discuss.ai.google.dev/t/203919');
    expect(zh).toContain('与任何 AI 厂商无隶属关系');

    const en = await page('/en/v/antigravity');
    expect(en).toContain('href="/en/t/TIMELINEAA"');
    expect(en).toContain('href="/en/tips/antigravity-paid-plan-starter-quota"');
    expect(en).not.toContain('别人等了多久');
    // One post is not enough to summarise.
    expect(zh).not.toContain('最后可见时仍未恢复');

    for (const [index, post] of [
      'https://discuss.ai.google.dev/t/202508',
      'https://discuss.ai.google.dev/t/202911',
      'https://discuss.ai.google.dev/t/204136',
      'https://discuss.ai.google.dev/t/205018',
    ].entries())
      await add('TIMELINEC' + 'DEFG'[index], 'approved', post);
    expect(await page('/v/antigravity')).toContain(
      '截至 2026-11-25，下面 5 条里：1 条恢复访问（含只恢复部分账号），1 条恢复后又停用，3 条最后可见时仍未恢复。',
    );
    expect(await page('/en/v/antigravity')).toContain(
      'As of 2026-11-25, of the 5 posts below: 1 regained access',
    );

    const claude = await page('/v/claude');
    expect(claude).toContain('ANTHROPIC_API_KEY');
    expect(claude).not.toContain('id="wait"');
    const codex = await page('/v/codex');
    expect(codex).toContain('https://openai.com/form/appeal/');
    expect(codex).toContain('不要填完整卡号或安全码');
  });
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
    expect(html).toContain('data-ssr="tally-section" hidden');
    expect(html).toContain('data-ssr="timeline-section" hidden');
    expect(html).toContain('content="1x00000000000000000000AA"');
  });
  it('includes first page and real pagination without requiring JavaScript', async () => {
    for (const letter of 'ABCDEFGHIJKLMNOPQRSTU')
      await seed('AAAAAAA' + letter + 'AA');
    await seed('PENDINGAAA', 'pending');
    const response = await app.request('https://haomeile.rip/', {}, bindings);
    const html = await response.text();
    expect((html.match(/class="tomb" /g) || []).length).toBe(20);
    expect(html).toContain(
      'data-ssr="tally">已收录 <strong>21</strong> 份用户投稿。',
    );
    expect(html).toContain('<section data-ssr="timeline-section">');
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
    expect(html).toContain('Claude 账号或组织被停用，怎么办？');
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
