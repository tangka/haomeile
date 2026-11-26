import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { app } from '../../src/worker';
import type { Bindings } from '../../src/worker/types';

function createAssetsEnv(): Bindings {
  const templates: Record<string, string> = {
    '/_templates/report/': `<!doctype html><html lang="zh-CN"><head><title>月度数据报告 · 号没了</title><meta name="description" content="desc"><meta name="robots" content="index,follow"><link rel="canonical" href="https://haomeile.rip/"><meta property="og:type" content="article"><meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:url" content="https://haomeile.rip/"><meta property="og:locale" content="zh_CN"><meta property="og:site_name" content="号没了"></head><body><h1 data-ssr="report-title">月度数据报告</h1><p data-ssr="report-lead"></p><div data-ssr="report-body"></div></body></html>`,
    '/404.html': `<!doctype html><html lang="zh-CN"><head><title>这里什么也没有 · 号没了</title></head><body><h1>这里什么也没有</h1></body></html>`,
  };
  return {
    ...(env as unknown as Bindings),
    ASSETS: {
      fetch: async (input: RequestInfo | URL) => {
        const pathname = new URL(
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url,
        ).pathname;
        const html = templates[pathname];
        if (!html) return new Response('Not found', { status: 404 });
        return new Response(html, {
          status: pathname === '/404.html' ? 404 : 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      },
    } as Fetcher,
  };
}

async function seedRecord(
  id: string,
  vendor: 'claude' | 'codex' | 'antigravity',
  eventType: string,
  appealStatus: string,
  origin: 'submission' | 'community',
  story: string,
  approvedAt = '2026-11-20T01:02:03.000Z',
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO tombstones (id,secret_hash,codename,vendor,event_type,died_at,story,appeal_status,origin,status,created_at,updated_at,approved_at)
     VALUES (?,'hash','报告示例',?,?,'2026-11-19',?,?,?,'approved',?,?,?)`,
  )
    .bind(
      id,
      vendor,
      eventType,
      story,
      appealStatus,
      origin,
      approvedAt,
      approvedAt,
      approvedAt,
    )
    .run();
}

describe('monthly data report (/report/:yyyy-mm)', () => {
  it('returns 404 for malformed or empty months', async () => {
    const bindings = createAssetsEnv();
    for (const path of ['/report/not-a-month', '/report/2026-13', '/report/2026-01']) {
      const res = await app.request(path, {}, bindings);
      expect(res.status).toBe(404);
    }
  });

  it('renders bilingual report with Article + BreadcrumbList JSON-LD, feeds, and llms-full', async () => {
    const bindings = createAssetsEnv();
    await seedRecord(
      'REPTAAAAA2',
      'claude',
      'org_suspended',
      'restored',
      'community',
      '原帖作者说，页面提示 Your organization has been disabled，提交复核后恢复。',
    );
    await seedRecord(
      'REPTBBBBB2',
      'antigravity',
      'suspended',
      'pending',
      'community',
      '原帖作者说，桌面端返回 403 且提示服务停用，已经提交申诉表单。',
    );
    await seedRecord(
      'REPTCCCCC2',
      'codex',
      'suspended',
      'none',
      'submission',
      '客户端返回 401 报错，随后网页端也提示账号停用。',
    );
    await seedRecord(
      'REPTDDDDD2',
      'antigravity',
      'billing',
      'none',
      'community',
      '原帖作者说，付费后客户端依然显示 Starter Quota。',
    );

    // Below 5 records: still renders 200 but marked noindex,follow
    const thinRes = await app.request('/report/2026-11', {}, bindings);
    expect(thinRes.status).toBe(200);
    const thinHtml = await thinRes.text();
    expect(thinHtml).toContain('content="noindex,follow"');

    // Reach 5 records -> indexable + included in feeds & llms-full
    await seedRecord(
      'REPTEEEEE2',
      'claude',
      'verification',
      'rejected',
      'community',
      '原帖作者说，结账时弹出身份验证窗口，提交护照后收到驳回通知。',
    );

    const zhRes = await app.request('/report/2026-11', {}, bindings);
    expect(zhRes.status).toBe(200);
    const zhHtml = await zhRes.text();
    expect(zhHtml).toContain('content="index,follow,max-image-preview:large"');
    expect(zhHtml).toContain('2026 年 11 月月度数据报告');
    expect(zhHtml).toContain('Your organization has been disabled');
    expect(zhHtml).toContain('403 (permission / access denied)');
    expect(zhHtml).toContain('Starter Quota');
    expect(zhHtml).toContain('https://haomeile.rip/#org');
    expect(zhHtml).toContain('"@type":"Article"');
    expect(zhHtml).not.toContain('FAQPage');
    expect(zhHtml).not.toContain('HowTo');
    expect(zhHtml).not.toContain('封号率');

    const enRes = await app.request('/en/report/2026-11', {}, bindings);
    expect(enRes.status).toBe(200);
    const enHtml = await enRes.text();
    expect(enHtml).toContain('November 2026 Monthly Data Report');
    expect(enHtml).toContain('https://haomeile.rip/en/report/2026-11');
    // Strip JSON-LD script and Chinese brand token before checking for stray Han characters
    const visibleEn = enHtml
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replaceAll('号没了', '');
    expect(visibleEn).not.toMatch(/\p{Script=Han}/u);

    const feedRes = await app.request('/feed.xml', {}, bindings);
    expect(await feedRes.text()).toContain('https://haomeile.rip/report/2026-11');

    const enFeedRes = await app.request('/en/feed.xml', {}, bindings);
    expect(await enFeedRes.text()).toContain(
      'https://haomeile.rip/en/report/2026-11',
    );

    const llmsRes = await app.request('/llms-full.txt', {}, bindings);
    const llmsText = await llmsRes.text();
    expect(llmsText).toContain('## Monthly Data Reports');
    expect(llmsText).toContain('https://haomeile.rip/report/2026-11');
  });
});
