import type { Context } from 'hono';
import type { AppEnv, PublicTombstone, Stats } from './types';
import { listTombstones, getStats, findPublicTombstone } from './lib/store';
import { LABELS } from '../site/scripts/labels';
import { lifeLine, num, fmtDate } from '../site/scripts/format';
const SITE = 'https://haomeile.rip';
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]!,
  );
export const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, '\\u003c');
const label = (labels: Record<string, string>, key: string) =>
  labels[key] ?? key;
const deco: Record<string, [string, string, number, number][]> = {
  flower: [
    ['flower', 'l', 20, 20],
    ['flower', 'r', 20, 20],
  ],
  cloud: [['cloud', 'r', 24, 11]],
  star: [
    ['star', 'l', 20, 14],
    ['star', 'r', 20, 14],
  ],
};
export function renderTomb(t: PublicTombstone, detail = false): string {
  const e = escapeHtml;
  const life = lifeLine(t);
  const name = detail
    ? `<h1 class="tomb-name">${e(t.codename || '无名氏')}</h1>`
    : `<a class="tomb-link" href="/t/${e(t.id)}"><h3 class="tomb-name">${e(t.codename || '无名氏')}</h3></a>`;
  const facts = detail
    ? `<dl class="facts"><dt>署名</dt><dd>${e(t.nickname || '匿名')}</dd><dt>套餐</dt><dd>${e(label(LABELS.plan, t.plan))}</dd><dt>申诉</dt><dd>${e(label(LABELS.appeal_status, t.appeal_status))}</dd><dt>立碑</dt><dd>${e(fmtDate(t.approved_at?.slice(0, 10)))}</dd></dl>`
    : '';
  return `<article class="tomb" data-id="${e(t.id)}">${(deco[t.card_style] ?? deco.flower).map(([name, side, width, height]) => `<img class="tomb-deco ${side}" src="/assets/${name}.svg" width="${width}" height="${height}" alt="">`).join('')}<div class="tomb-body stone-shape"><div class="tomb-face stone-shape">${name}<p class="tomb-life"><span class="tomb-days">${e(life.days)}</span><span class="tomb-range">${e(life.range)}</span></p><ul class="tags"><li class="tag">${e(label(LABELS.vendor, t.vendor))}</li><li class="tag">${e(label(LABELS.event_type_short, t.event_type))}</li></ul>${t.epitaph ? `<p class="tomb-epitaph">${e(t.epitaph)}</p>` : ''}<p class="tomb-story">${e(t.story)}</p>${facts}<div class="tomb-foot"><span class="tomb-unverified">用户自述，未经核实</span><button type="button" class="flower-btn" data-flower-id="${e(t.id)}" aria-pressed="false" aria-label="献花 ${num(t.flowers)}，为这块碑献一朵花"><img src="/assets/flower.svg" width="14" height="14" alt=""><span>献花 ${num(t.flowers)}</span></button></div></div></div></article>`;
}
export function renderBars(
  rows: [string, number][],
  labels: Record<string, string>,
): string {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return `<ul class="bars">${rows.map(([key, n]) => `<li><span>${escapeHtml(label(labels, key))}</span><span class="bar" style="width:${n === 0 ? 0 : Math.max(2, Math.round((n / max) * 100))}%"></span><span class="n">${num(n)}</span></li>`).join('')}</ul>`;
}
export function renderTimeline(stats: Stats): string {
  const max = Math.max(
    1,
    ...stats.timeline.flatMap((day) => [day.reported, day.occurred]),
  );
  const line = (key: 'reported' | 'occurred') =>
    stats.timeline
      .map((day, i) => `${20 + (i * 720) / 29},${130 - (day[key] * 110) / max}`)
      .join(' ');
  return `<figure style="margin:0;padding-top:20px;padding-bottom:20px"><figcaption>近 30 天 · 上报日期与事件日期</figcaption><svg viewBox="0 0 760 170" role="img" aria-label="近30天按上报日期与事件发生日期统计，具体数值见下方表格" style="width:100%;height:auto"><path d="M20 20V130H740" fill="none" stroke="currentColor"/><polyline points="${line('reported')}" fill="none" stroke="var(--mum)" stroke-width="3"/><polyline points="${line('occurred')}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/><text x="20" y="158" fill="currentColor" font-size="13">${escapeHtml(stats.timeline[0]?.date)}</text><text x="740" y="158" text-anchor="end" fill="currentColor" font-size="13">${escapeHtml(stats.date)}</text></svg><p class="hint">实线：上报数；虚线：事件发生数。只统计当前公开墓碑。</p><details><summary>查看每日数据</summary><div style="overflow:auto"><table><thead><tr><th>日期</th><th>上报数</th><th>事件发生数</th></tr></thead><tbody>${stats.timeline.map((d) => `<tr><th scope="row">${escapeHtml(d.date)}</th><td>${d.reported}</td><td>${d.occurred}</td></tr>`).join('')}</tbody></table></div></details></figure>`;
}
function filters(
  url: URL,
  kind: 'vendor' | 'event',
  vendorPage?: string,
): string {
  const labels = kind === 'vendor' ? LABELS.vendor : LABELS.event_type_short;
  const current =
    kind === 'vendor'
      ? vendorPage || url.searchParams.get('vendor') || ''
      : url.searchParams.get('event') || '';
  return [['', '全部'], ...Object.entries(labels)]
    .map(([key, value]) => {
      const next = new URL(url);
      next.searchParams.delete('cursor');
      if (kind === 'vendor') {
        next.pathname = key ? `/v/${key}` : '/';
        next.searchParams.delete('vendor');
      } else if (key) next.searchParams.set('event', key);
      else next.searchParams.delete('event');
      return `<a class="chip" href="${escapeHtml(next.pathname + next.search)}" aria-current="${String(key === current)}" data-value="${escapeHtml(key)}">${escapeHtml(value)}</a>`;
    })
    .join('');
}
function metadata(
  rewriter: HTMLRewriter,
  title: string,
  description: string,
  path: string,
  robots = 'index,follow,max-image-preview:large',
  jsonLd?: object[],
) {
  rewriter.on('title', {
    element: (el) => {
      el.setInnerContent(title);
    },
  });
  const attrs: [string, string, string][] = [
    ['meta[name="description"]', 'content', description],
    ['meta[name="robots"]', 'content', robots],
    ['link[rel="canonical"]', 'href', SITE + path],
    ['meta[property="og:title"]', 'content', title],
    ['meta[property="og:description"]', 'content', description],
    ['meta[property="og:url"]', 'content', SITE + path],
  ];
  for (const [selector, attribute, value] of attrs)
    rewriter.on(selector, {
      element: (el) => {
        el.setAttribute(attribute, value);
      },
    });
  if (jsonLd) {
    rewriter.on('script[type="application/ld+json"]', {
      element: (el) => {
        el.remove();
      },
    });
    rewriter.on('head', {
      element: (el) => {
        el.append(
          `<script type="application/ld+json">${safeJson(jsonLd)}</script>`,
          { html: true },
        );
      },
    });
  }
}
export async function servePage(c: Context<AppEnv>): Promise<Response> {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const rewriter = new HTMLRewriter()
    .on('[data-turnstile-sitekey]', {
      element: (el) => {
        el.setAttribute('data-turnstile-sitekey', c.env.TURNSTILE_SITE_KEY);
      },
    })
    .on('meta[name="turnstile-site-key"]', {
      element: (el) => {
        el.setAttribute('content', c.env.TURNSTILE_SITE_KEY);
      },
    });
  let assetPath = url.pathname;
  // Fetch directory assets internally so their canonical redirects cannot drop form query parameters.
  if (
    [
      '/submit',
      '/manage',
      '/epitaph',
      '/appeal',
      '/rules',
      '/privacy',
      '/about',
      '/admin',
    ].includes(path)
  )
    assetPath = path + '/';
  if (path === '/' || path.startsWith('/v/')) {
    const vendor = path.startsWith('/v/')
      ? path.slice(3)
      : url.searchParams.get('vendor') || undefined;
    if (vendor && !Object.hasOwn(LABELS.vendor, vendor))
      return serveMissing(c, 404);
    const [page, stats] = await Promise.all([
      listTombstones(c.env.DB, {
        vendor,
        event: url.searchParams.get('event') || undefined,
        cursor: url.searchParams.get('cursor') || undefined,
      }),
      getStats(c.env.DB, vendor),
    ]);
    assetPath = path.startsWith('/v/') ? '/_templates/vendor/' : '/';
    const [year, month, day] = stats.date.split('-').map(Number);
    const scope = vendor ? `${label(LABELS.vendor, vendor)} 账号的` : '';
    const tally = `截至 <time datetime="${stats.date}">${year} 年 ${month} 月 ${day} 日</time>，号没了共有 <strong>${num(stats.total)}</strong> 块${escapeHtml(scope)}公开墓碑。今天新立 <strong>${num(stats.today)}</strong> 块，近 7 天 <strong>${num(stats.last7)}</strong> 块。`;
    rewriter.on('[data-ssr="tally"]', {
      element: (el) => {
        el.setInnerContent(tally, { html: true });
      },
    });
    rewriter.on('[data-ssr="bars-vendor"]', {
      element: (el) => {
        el.setInnerContent(renderBars(stats.by_vendor, LABELS.vendor), {
          html: true,
        });
      },
    });
    rewriter.on('[data-ssr="bars-event"]', {
      element: (el) => {
        el.setInnerContent(
          renderBars(stats.by_event, LABELS.event_type_short),
          { html: true },
        );
      },
    });
    rewriter.on('[data-ssr="timeline"]', {
      element: (el) => {
        el.setInnerContent(renderTimeline(stats), { html: true });
      },
    });
    rewriter.on('[data-ssr="wall"]', {
      element: (el) => {
        const empty =
          vendor || url.searchParams.get('event')
            ? '<div class="empty"><p>这个分类下还没有碑。</p><a class="btn" href="/">看全部</a></div>'
            : '<div class="empty"><p>这里还很安静。第一块碑，要不要由你来立？</p><a class="btn btn-primary" href="/submit">立一块碑</a></div>';
        el.setInnerContent(
          page.items.length
            ? page.items.map((t) => renderTomb(t)).join('')
            : empty,
          { html: true },
        );
      },
    });
    rewriter.on('[data-ssr="more"]', {
      element: (el) => {
        if (!page.next_cursor) {
          el.setAttribute('hidden', '');
          return;
        }
        const next = new URL(url);
        next.searchParams.set('cursor', page.next_cursor);
        el.setAttribute('href', next.pathname + next.search);
        el.removeAttribute('hidden');
      },
    });
    rewriter.on('[data-ssr="filters-vendor"]', {
      element: (el) => {
        el.append(
          filters(url, 'vendor', path.startsWith('/v/') ? vendor : undefined),
          { html: true },
        );
      },
    });
    rewriter.on('[data-ssr="filters-event"]', {
      element: (el) => {
        el.append(
          filters(url, 'event', path.startsWith('/v/') ? vendor : undefined),
          { html: true },
        );
      },
    });
    if (path.startsWith('/v/') && vendor) {
      const name = label(LABELS.vendor, vendor);
      rewriter.on('[data-ssr="page-title"]', {
        element: (el) => {
          el.setInnerContent(`${name} 账号的墓碑`);
        },
      });
      metadata(
        rewriter,
        `${name} 账号停用、封号经历 · 号没了`,
        `号没了上用户自述的 ${name} 账号停用、地区限制、验证卡住等经历，共 ${stats.total} 块公开墓碑，截至 ${stats.date}。内容未经核实，与 ${name} 官方无关。`,
        `/v/${vendor}`,
        stats.total >= 5 ? undefined : 'noindex,follow',
        [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '纪念墙', item: SITE },
              { '@type': 'ListItem', position: 2, name },
            ],
          },
        ],
      );
    } else if (vendor)
      rewriter.on('link[rel="canonical"]', {
        element: (el) => {
          el.setAttribute('href', `${SITE}/v/${vendor}`);
        },
      });
  } else if (path.startsWith('/t/')) {
    const id = path.slice(3);
    const tomb = await findPublicTombstone(c.env.DB, id);
    if (!tomb) {
      const row = await c.env.DB.prepare(
        'SELECT status FROM tombstones WHERE id=?',
      )
        .bind(id)
        .first<{
          status: string;
        }>();
      return serveMissing(c, row?.status === 'withdrawn' ? 410 : 404);
    }
    assetPath = '/_templates/tomb/';
    rewriter.on('[data-ssr="detail"]', {
      element: (el) => {
        el.setInnerContent(renderTomb(tomb, true), { html: true });
      },
    });
    rewriter.on('[data-tomb-id]', {
      element: (el) => {
        el.setAttribute('data-tomb-id', tomb.id);
      },
    });
    const title = `${tomb.codename}：${label(LABELS.vendor, tomb.vendor)} 账号${label(LABELS.event_type_short, tomb.event_type)} · 号没了`;
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: title.replace(' · 号没了', ''),
        text: tomb.story,
        url: SITE + path,
        datePublished: tomb.approved_at,
        dateModified: tomb.updated_at,
        inLanguage: 'zh-CN',
        author: { '@type': 'Person', name: tomb.nickname || '匿名用户' },
        interactionStatistic: {
          '@type': 'InteractionCounter',
          interactionType: 'https://schema.org/LikeAction',
          userInteractionCount: tomb.flowers,
        },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '纪念墙', item: SITE },
          {
            '@type': 'ListItem',
            position: 2,
            name: label(LABELS.vendor, tomb.vendor),
            item: `${SITE}/v/${tomb.vendor}`,
          },
          { '@type': 'ListItem', position: 3, name: tomb.codename },
        ],
      },
    ];
    metadata(
      rewriter,
      title,
      `用户自述：${Array.from(tomb.story || '')
        .slice(0, 60)
        .join('')}…… 本站未核实。`,
      path,
      'index,follow,noarchive,max-image-preview:large',
      jsonLd,
    );
    rewriter.on('meta[property="og:type"]', {
      element: (el) => {
        el.setAttribute('content', 'article');
      },
    });
    rewriter.on('head', {
      element: (el) => {
        el.append(
          `<meta property="article:published_time" content="${escapeHtml(tomb.approved_at)}"><meta property="article:modified_time" content="${escapeHtml(tomb.updated_at)}">`,
          { html: true },
        );
      },
    });
  } else if (path.startsWith('/_templates')) return serveMissing(c, 404);
  const asset = await c.env.ASSETS.fetch(
    new Request(new URL(assetPath, url), c.req.raw),
  );
  if (asset.status === 404) return serveMissing(c, 404);
  if (!asset.headers.get('Content-Type')?.includes('text/html')) return asset;
  const status = asset.status;
  const response = rewriter.transform(
    new Response(asset.body, { status, headers: asset.headers }),
  );
  response.headers.set(
    'Cache-Control',
    path === '/admin' ? 'no-store' : 'public, max-age=60, s-maxage=300',
  );
  return response;
}
async function serveMissing(
  c: Context<AppEnv>,
  status: 404 | 410,
): Promise<Response> {
  const url = new URL('/404.html', c.req.url);
  let asset = await c.env.ASSETS.fetch(new Request(url));
  if (!asset.ok)
    asset = await c.env.ASSETS.fetch(new Request(new URL('/404/', c.req.url)));
  const rewriter = new HTMLRewriter();
  if (status === 410)
    rewriter
      .on('h1', {
        element: (el) => {
          el.setInnerContent('这块碑已经撤回了');
        },
      })
      .on('title', {
        element: (el) => {
          el.setInnerContent('这块碑已经撤回了 · 号没了');
        },
      });
  const response = rewriter.transform(
    new Response(asset.body, { status, headers: asset.headers }),
  );
  response.headers.set('X-Robots-Tag', 'noindex');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
