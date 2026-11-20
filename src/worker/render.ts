import type { Context } from 'hono';
import type { AppEnv, PublicTombstone, Stats } from './types';
import { listTombstones, getStats, findPublicTombstone } from './lib/store';
import { LABELS, getLabels } from '../site/scripts/labels';
import { lifeLine, num, fmtDate } from '../site/scripts/format';
import {
  basePath,
  localePath,
  requestLocale,
  tr,
  type Locale,
} from '../shared/i18n';
import { languageRewriter, localizeTemplate } from './localize';
import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';
import { tombPresentation } from '../shared/tomb-presentation';
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
export function renderTomb(
  t: PublicTombstone,
  detail = false,
  locale: Locale = 'zh',
): string {
  const labels = getLabels(locale);
  const text = (zh: string, en: string) => (locale === 'en' ? en : zh);
  const e = escapeHtml;
  const view = tombPresentation(t, locale);
  const life = view.community
    ? {
        days: text('社区公开记录', 'Public community record'),
        range: t.died_at
          ? text('事件日期 ', 'Incident date ') + fmtDate(t.died_at, locale)
          : text('事件日期未说明', 'Incident date not stated'),
      }
    : lifeLine(t, locale);
  const name = detail
    ? `<h1 class="tomb-name">${e(view.codename || text('无名氏', 'Unnamed'))}</h1>`
    : `<a class="tomb-link" href="${localePath(`/t/${e(t.id)}`, locale)}"><h3 class="tomb-name">${e(view.codename || text('无名氏', 'Unnamed'))}</h3></a>`;
  const provenance = view.source
    ? `<p class="tomb-source"><a href="${e(view.source)}" target="_blank" rel="noopener noreferrer nofollow">${text('查看原帖', 'Read original post')} · ${e(t.source_platform)}</a>${t.source_published_at ? ` · <time datetime="${e(t.source_published_at)}">${e(fmtDate(t.source_published_at, locale))}</time>` : ''}</p>`
    : '';
  const facts = detail
    ? `<dl class="facts"><dt>${view.community ? text('整理', 'Summary by') : text('署名', 'Posted by')}</dt><dd>${view.community ? text('号没了', 'Haomeile') : e(t.nickname || text('匿名', 'Anonymous'))}</dd><dt>${text('套餐', 'Plan')}</dt><dd>${view.community && t.plan === 'unknown' ? text('原帖未说明', 'Not stated in the source') : e(label(labels.plan, t.plan))}</dd><dt>${view.community ? text('原帖申诉状态', 'Appeal status in source') : text('申诉', 'Appeal')}</dt><dd>${view.community && t.appeal_status === 'none' ? text('原帖未说明', 'Not stated in the source') : e(label(labels.appeal_status, t.appeal_status))}</dd><dt>${view.community ? text('收录', 'Collected') : text('立碑', 'Published')}</dt><dd>${e(fmtDate(t.approved_at?.slice(0, 10), locale))}</dd></dl>`
    : '';
  return `<article class="tomb" data-id="${e(t.id)}">${(deco[t.card_style] ?? deco.flower).map(([name, side, width, height]) => `<img class="tomb-deco ${side}" src="/assets/${name}.svg" width="${width}" height="${height}" alt="">`).join('')}<div class="tomb-body stone-shape"><div class="tomb-face stone-shape">${name}<p class="tomb-life"><span class="tomb-days">${e(life.days)}</span><span class="tomb-range">${e(life.range)}</span></p><ul class="tags"><li class="tag">${e(label(labels.vendor, t.vendor))}</li><li class="tag">${e(label(labels.event_type_short, t.event_type))}</li></ul>${t.epitaph ? `<p class="tomb-epitaph">${e(t.epitaph)}</p>` : ''}<p class="tomb-story">${e(view.story)}</p>${provenance}${facts}<div class="tomb-foot"><button type="button" class="flower-btn" data-flower-id="${e(t.id)}" aria-pressed="false" aria-label="${text(`献花 ${num(t.flowers)}，为这块碑献一朵花`, `Flowers ${num(t.flowers, locale)}. Leave a flower for this memorial`)}"><img src="/assets/flower.svg" width="14" height="14" alt=""><span>${text('献花', 'Flowers')} ${num(t.flowers, locale)}</span></button></div></div></div></article>`;
}
export function renderTimeline(stats: Stats, locale: Locale = 'zh'): string {
  const text = (zh: string, en: string) => (locale === 'en' ? en : zh);
  const max = Math.max(
    1,
    ...stats.timeline.flatMap((day) => [day.reported, day.occurred]),
  );
  const line = (key: 'reported' | 'occurred') =>
    stats.timeline
      .map((day, i) => `${20 + (i * 720) / 29},${130 - (day[key] * 110) / max}`)
      .join(' ');
  return `<figure style="margin:0;padding-top:20px;padding-bottom:20px"><figcaption>${text('近 30 天 · 上报日期与事件日期', 'Last 30 days · reported and event dates')}</figcaption><svg viewBox="0 0 760 170" role="img" aria-label="${text('近30天按上报日期与事件发生日期统计', 'Reports and events over the last 30 days.')}" style="width:100%;height:auto"><path d="M20 20V130H740" fill="none" stroke="currentColor"/><polyline points="${line('reported')}" fill="none" stroke="var(--mum)" stroke-width="3"/><polyline points="${line('occurred')}" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/><text x="20" y="158" fill="currentColor" font-size="13">${escapeHtml(stats.timeline[0]?.date)}</text><text x="740" y="158" text-anchor="end" fill="currentColor" font-size="13">${escapeHtml(stats.date)}</text></svg><p class="hint">${text('实线：上报数；虚线：事件发生数。', 'Solid line: reports. Dashed line: events.')}</p></figure>`;
}
function metadata(
  rewriter: HTMLRewriter,
  title: string,
  description: string,
  path: string,
  robots = 'index,follow,max-image-preview:large',
  jsonLd?: object[],
  site = DEFAULT_SITE_ORIGIN,
) {
  rewriter.on('title', {
    element: (el) => {
      el.setInnerContent(title);
    },
  });
  const attrs: [string, string, string][] = [
    ['meta[name="description"]', 'content', description],
    ['meta[name="robots"]', 'content', robots],
    ['link[rel="canonical"]', 'href', site + path],
    ['meta[property="og:title"]', 'content', title],
    ['meta[property="og:description"]', 'content', description],
    ['meta[property="og:url"]', 'content', site + path],
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
  const site = siteOrigin(c.env.SITE_ORIGIN);
  const requestedPath = basePath(url.pathname);
  // Normalize static HTML aliases internally; redirects would drop locale or edit queries.
  const path =
    requestedPath
      .replace(/\/index\.html$/, '/')
      .replace(/\.html$/, '')
      .replace(/\/$/, '') || '/';
  const locale = requestLocale(c.req.raw);
  const text = (zh: string, en: string) => (locale === 'en' ? en : zh);
  const labels = getLabels(locale);
  const rewriter = languageRewriter(c.req.raw, site)
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
  let assetPath = requestedPath;
  // Fetch directory assets internally so their canonical redirects cannot drop form query parameters.
  if (
    [
      '/submit',
      '/manage',
      '/epitaph',
      '/appeal',
      '/tips',
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
    const scope = vendor ? `${label(labels.vendor, vendor)} 账号的` : '';
    const englishDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeZone: 'UTC',
    }).format(new Date(stats.date + 'T00:00:00Z'));
    const tally = `截至 <time datetime="${stats.date}">${year} 年 ${month} 月 ${day} 日</time>，本站共有 <strong>${num(stats.total)}</strong> 份${escapeHtml(scope)}用户投稿。今天上报 <strong>${num(stats.today)}</strong> 份，近 7 天 <strong>${num(stats.last7)}</strong> 份。`;
    const localizedTally =
      locale === 'en'
        ? `As of <time datetime="${stats.date}">${englishDate}</time>, Haomeile has <strong>${num(stats.total, locale)}</strong> public user ${vendor ? escapeHtml(label(labels.vendor, vendor)) + ' ' : ''}submissions. <strong>${num(stats.today, locale)}</strong> submitted today; <strong>${num(stats.last7, locale)}</strong> in the last 7 days.`
        : tally;
    rewriter.on('[data-ssr="tally"]', {
      element: (el) => {
        el.setInnerContent(localizedTally, { html: true });
      },
    });
    rewriter.on('[data-ssr="community-tally"]', {
      element: (el) => {
        el.setInnerContent(
          text(
            `社区整理 <strong>${num(stats.community_total || 0)}</strong> 条。`,
            `Community summaries: <strong>${num(stats.community_total || 0, locale)}</strong>.`,
          ),
          { html: true },
        );
      },
    });
    rewriter.on('[data-ssr="timeline"]', {
      element: (el) => {
        el.setInnerContent(renderTimeline(stats, locale), { html: true });
      },
    });
    rewriter.on('[data-ssr="wall"]', {
      element: (el) => {
        const empty =
          vendor || url.searchParams.get('event')
            ? `<div class="empty"><p>${text('这个分类下还没有碑。', 'No memorials here yet.')}</p><a class="btn" href="${localePath('/', locale)}">${text('看全部', 'View all')}</a></div>`
            : `<div class="empty"><p>${text('这里还很安静。第一块碑，要不要由你来立？', 'It is quiet here. Would you like to leave the first memorial?')}</p><a class="btn btn-primary" href="${localePath('/submit', locale)}">${text('立一块碑', 'Create a memorial')}</a></div>`;
        el.setInnerContent(
          page.items.length
            ? page.items.map((t) => renderTomb(t, false, locale)).join('')
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
    if (path.startsWith('/v/') && vendor) {
      const name = label(labels.vendor, vendor);
      rewriter.on('[data-ssr="page-title"]', {
        element: (el) => {
          el.setInnerContent(
            text(`${name} 账号的墓碑`, `${name} account memorials`),
          );
        },
      });
      metadata(
        rewriter,
        text(
          `${name} 账号停用、封号经历 · 号没了`,
          `${name} account suspensions · Haomeile`,
        ),
        text(
          `${name} 账号停用、地区限制、验证卡住等经历：${stats.total} 份用户投稿，${stats.community_total || 0} 条社区整理，截至 ${stats.date}。`,
          `${name} account suspensions, regional restrictions and verification problems: ${stats.total} user submissions and ${stats.community_total || 0} public community case summaries as of ${stats.date}.`,
        ),
        localePath(`/v/${vendor}`, locale),
        stats.total + (stats.community_total || 0) >= 5
          ? undefined
          : 'noindex,follow',
        [
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: text('纪念墙', 'Memorial wall'),
                item: site + localePath('/', locale),
              },
              { '@type': 'ListItem', position: 2, name },
            ],
          },
        ],
        site,
      );
    } else if (vendor)
      rewriter.on('link[rel="canonical"]', {
        element: (el) => {
          el.setAttribute(
            'href',
            `${site}${localePath(`/v/${vendor}`, locale)}`,
          );
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
    const view = tombPresentation(tomb, locale);
    assetPath = '/_templates/tomb/';
    rewriter.on('[data-ssr="detail"]', {
      element: (el) => {
        el.setInnerContent(renderTomb(tomb, true, locale), { html: true });
      },
    });
    rewriter.on('[data-tomb-id]', {
      element: (el) => {
        el.setAttribute('data-tomb-id', tomb.id);
      },
    });
    const title = text(
      `${view.codename}：${label(labels.vendor, tomb.vendor)} 账号${label(labels.event_type_short, tomb.event_type)} · 号没了`,
      `${view.codename}: ${label(labels.vendor, tomb.vendor)} — ${label(labels.event_type_short, tomb.event_type)} · Haomeile`,
    );
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': view.community ? 'Article' : 'DiscussionForumPosting',
        headline: title.replace(/ · (?:号没了|Haomeile)$/, ''),
        text: view.story,
        url: site + localePath(path, locale),
        datePublished: tomb.approved_at,
        dateModified: tomb.updated_at,
        author: {
          '@type': view.community ? 'Organization' : 'Person',
          name: view.community
            ? 'Haomeile'
            : tomb.nickname || text('匿名用户', 'Anonymous user'),
        },
        ...(view.source
          ? { citation: view.source, isBasedOn: view.source }
          : {}),
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
          {
            '@type': 'ListItem',
            position: 1,
            name: text('纪念墙', 'Memorial wall'),
            item: site + localePath('/', locale),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: label(labels.vendor, tomb.vendor),
            item: site + localePath(`/v/${tomb.vendor}`, locale),
          },
          { '@type': 'ListItem', position: 3, name: view.codename },
        ],
      },
    ];
    metadata(
      rewriter,
      title,
      text(
        `${view.community ? '社区整理' : '用户投稿'}：${Array.from(
          view.story || '',
        )
          .slice(0, 60)
          .join('')}……`,
        `${view.community ? 'Community summary' : 'User submission'}: ${Array.from(
          view.story || '',
        )
          .slice(0, 120)
          .join('')}…`,
      ),
      localePath(path, locale),
      'index,follow,noarchive,max-image-preview:large',
      jsonLd,
      site,
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
  const assetUrl = new URL(url);
  assetUrl.pathname = assetPath;
  const asset = await c.env.ASSETS.fetch(new Request(assetUrl, c.req.raw));
  if (asset.status === 404) return serveMissing(c, 404);
  if (!asset.headers.get('Content-Type')?.includes('text/html')) return asset;
  const status = asset.status;
  const response = rewriter.transform(
    new Response(localizeTemplate(await asset.text(), locale, site), {
      status,
      headers: asset.headers,
    }),
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
  const site = siteOrigin(c.env.SITE_ORIGIN);
  const url = new URL('/404.html', c.req.url);
  let asset = await c.env.ASSETS.fetch(new Request(url));
  if (!asset.ok)
    asset = await c.env.ASSETS.fetch(new Request(new URL('/404/', c.req.url)));
  const locale = requestLocale(c.req.raw);
  const rewriter = languageRewriter(c.req.raw, site);
  if (status === 410)
    rewriter
      .on('h1', {
        element: (el) => {
          el.setInnerContent(tr('这块碑已经撤回了', locale));
        },
      })
      .on('title', {
        element: (el) => {
          el.setInnerContent(tr('这块碑已经撤回了 · 号没了', locale));
        },
      });
  const response = rewriter.transform(
    new Response(localizeTemplate(await asset.text(), locale, site), {
      status,
      headers: asset.headers,
    }),
  );
  response.headers.set('X-Robots-Tag', 'noindex');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
