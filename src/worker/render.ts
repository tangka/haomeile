import type { Context } from 'hono';
import type { AppEnv, PublicTombstone, Stats } from './types';
import { listTombstones, getStats, findPublicTombstone } from './lib/store';
import { LABELS, getLabels } from '../site/scripts/labels';
import {
  flowerPresentation,
  lifeLine,
  num,
  fmtDate,
  fmtMemorialNumber,
} from '../site/scripts/format';
import {
  basePath,
  localePath,
  routeLocale,
  tr,
  type Locale,
} from '../shared/i18n';
import { languageRewriter, localizeTemplate } from './localize';
import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';
import { tombPresentation } from '../shared/tomb-presentation';
import type { ReadRadarOverview } from '../shared/radar';
import { hasRadarPass } from './lib/radar-gate';
import {
  contentSecurityPolicy,
  REFERRER_POLICY,
  WEB_ANALYTICS_BEACON,
} from './security';
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
  const number = t.memorial_number
    ? `<p class="tomb-number">${e(fmtMemorialNumber(t.memorial_number))}</p>`
    : '';
  const name = detail
    ? `<h1 class="tomb-name">${e(view.codename || text('无名氏', 'Unnamed'))}</h1>`
    : `<a class="tomb-link" href="${localePath(`/t/${e(t.id)}`, locale)}"><h3 class="tomb-name">${e(view.codename || text('无名氏', 'Unnamed'))}</h3></a>`;
  const incidentDate = t.died_at
    ? `<time datetime="${e(t.died_at)}">${e(fmtDate(t.died_at, locale))}</time>`
    : text('事件日期未说明', 'Incident date not stated');
  const vendorName = e(label(labels.vendor, t.vendor));
  const eventName = e(label(labels.event_type_short, t.event_type));
  const metadata = detail
    ? `<ul class="tags"><li class="tag">${vendorName}</li><li class="tag">${eventName}</li></ul>`
    : `<p class="tomb-meta">${vendorName} · ${eventName} · ${incidentDate}</p>`;
  let lifeDetails = '';
  if (detail && view.community)
    lifeDetails = `<p class="tomb-meta">${t.died_at ? text('事件日期 ', 'Incident date ') : ''}${incidentDate}</p>`;
  else if (
    !view.community &&
    (detail || (t.born_at && t.born_precision !== 'none'))
  ) {
    const life = lifeLine(t, locale);
    lifeDetails = `<p class="tomb-life"><span class="tomb-days">${e(life.days)}</span>${detail ? `<span class="tomb-range">${e(life.range)}</span>` : ''}</p>`;
  }
  const decorations =
    detail || !view.community
      ? (deco[t.card_style] ?? deco.flower)
          .map(
            ([file, side, width, height]) =>
              `<img class="tomb-deco ${side}" src="/assets/${file}.svg" width="${width}" height="${height}" alt="">`,
          )
          .join('')
      : '';
  const provenance = view.source
    ? `<p class="tomb-source"><a href="${e(view.source)}" target="_blank" rel="noopener noreferrer nofollow">${text('查看原帖', 'Read original post')} · ${e(t.source_platform)}</a>${t.source_published_at ? ` · <time datetime="${e(t.source_published_at)}">${e(fmtDate(t.source_published_at, locale))}</time>` : ''}</p>`
    : '';
  const facts = detail
    ? `<dl class="facts"><dt>${view.community ? text('整理', 'Summary by') : text('署名', 'Posted by')}</dt><dd>${view.community ? text('号没了', 'Haomeile') : e(t.nickname || text('匿名', 'Anonymous'))}</dd><dt>${text('套餐', 'Plan')}</dt><dd>${view.community && t.plan === 'unknown' ? text('原帖未说明', 'Not stated in the source') : e(label(labels.plan, t.plan))}</dd><dt>${view.community ? text('原帖申诉状态', 'Appeal status in source') : text('申诉', 'Appeal')}</dt><dd>${view.community && t.appeal_status === 'none' ? text('原帖未说明', 'Not stated in the source') : e(label(labels.appeal_status, t.appeal_status))}</dd><dt>${view.community ? text('收录', 'Collected') : text('立碑', 'Published')}</dt><dd>${e(fmtDate(t.approved_at?.slice(0, 10), locale))}</dd></dl>`
    : '';
  const flower = flowerPresentation(t.flowers, locale);
  return `<article class="tomb" data-id="${e(t.id)}">${decorations}<div class="tomb-body stone-shape"><div class="tomb-face stone-shape">${number}${name}${lifeDetails}${metadata}${t.epitaph ? `<p class="tomb-epitaph">${e(t.epitaph)}</p>` : ''}<p class="tomb-story">${e(view.story)}</p>${provenance}${facts}<div class="tomb-foot"><button type="button" class="flower-btn" data-flower-id="${e(t.id)}" data-count="${e(t.flowers)}" aria-pressed="false" aria-label="${e(flower.ariaLabel)}"><img src="/assets/flower.svg" width="14" height="14" alt=""><span>${e(flower.label)}</span></button></div></div></div></article>`;
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
function renderTally(stats: Stats, vendor: string, locale: Locale): string {
  const { total: submitted, community_total: curated = 0 } = stats;
  const total = submitted + curated;
  if (!total) return '';

  const count = (value: number) => `<strong>${num(value, locale)}</strong>`;
  const mixed = submitted > 0 && curated > 0;
  const product = vendor ? `${escapeHtml(vendor)} ` : '';
  if (locale === 'en') {
    const submissions = `${count(submitted)} public user submission${submitted === 1 ? '' : 's'}`;
    const summaries = `${count(curated)} community summar${curated === 1 ? 'y' : 'ies'}`;
    const records = mixed
      ? `${count(total)} records, including ${summaries} and ${submissions}`
      : curated
        ? summaries
        : submissions;
    return `The ${product}memorial wall has ${records}.`;
  }

  const submissions = `${count(submitted)} 份用户投稿`;
  const summaries = `${count(curated)} 条社区整理`;
  const records = mixed
    ? `${count(total)} 条记录，其中 ${summaries}、${submissions}`
    : curated
      ? summaries
      : submissions;
  const wall = vendor ? `${product}纪念墙` : '已';
  return `${wall}收录 ${records}。`;
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
function zhEventTitle(vendorName: string, eventLabel: string): string {
  return eventLabel.startsWith('账号') || eventLabel.startsWith('组织')
    ? `${vendorName} ${eventLabel}`
    : `${vendorName} 账号${eventLabel}`;
}

interface VendorSeoConfig {
  title: { zh: string; en: string };
  description: (total: number, date: string) => { zh: string; en: string };
  intro: { zh: string; en: string };
  links: { href: string; label: { zh: string; en: string } }[];
}

const VENDOR_SEO: Record<string, VendorSeoConfig> = {
  claude: {
    title: {
      zh: 'Claude 封号与账号停用记录、申诉入口与订阅排查 · 号没了',
      en: 'Claude account bans, suspensions, appeals & billing recovery · Haomeile',
    },
    description: (total, date) => ({
      zh: `收录 Claude / Claude Code 账号停用、组织停用、身份验证卡住与申诉结果（截至 ${date} 共 ${total} 条公开记录），附 Anthropic 官方申诉入口与 Max 订阅恢复指南。`,
      en: `Public cases of Claude and Claude Code account bans, organization suspensions, ID verification and appeals (${total} records as of ${date}), with official Anthropic appeal links and billing guides.`,
    }),
    intro: {
      zh: '收录 Claude 与 Claude Code 账号停用、组织暂停、身份验证与申诉结果的公开经历。如需申诉或核对解封后的 Max 订阅，可直接查看下方官方入口与排查指南。',
      en: 'Public user submissions and community summaries covering Claude and Claude Code account bans, organization suspensions, ID verification and appeals, alongside official appeal and billing guides.',
    },
    links: [
      {
        href: '/appeal#claude',
        label: { zh: 'Claude 官方申诉入口', en: 'Official Claude appeal' },
      },
      {
        href: '/tips/claude-max-google-play-recovery',
        label: {
          zh: '解封后 Max 仍显示 Free 排查',
          en: 'Claude Max still Free after appeal',
        },
      },
      {
        href: '/tips/claude-sign-up-identity-verification',
        label: {
          zh: '注册与结账身份验证说明',
          en: 'Claude identity verification guide',
        },
      },
      {
        href: '/radar',
        label: {
          zh: '24 小时额度重置雷达',
          en: '24h quota reset radar',
        },
      },
    ],
  },
  codex: {
    title: {
      zh: 'Codex 账号停用与恢复记录、OpenAI 官方申诉入口 · 号没了',
      en: 'Codex account deactivations, appeals & recovery cases · Haomeile',
    },
    description: (total, date) => ({
      zh: `收录 OpenAI Codex 与关联 ChatGPT 账号停用、401 访问异常与申诉恢复经历（截至 ${date} 共 ${total} 条公开记录），附 OpenAI 官方申诉链接与帮助中心入口。`,
      en: `Public cases of OpenAI Codex and ChatGPT account deactivations, 401 access errors and appeal outcomes (${total} records as of ${date}), with official OpenAI appeal channels.`,
    }),
    intro: {
      zh: '收录 OpenAI Codex 与关联 ChatGPT 账号停用、401 验证异常及恢复结果的公开经历。收到停用通知时，优先使用 OpenAI 邮件内的申诉链接。',
      en: 'Public user submissions and community summaries covering OpenAI Codex and ChatGPT account deactivations, 401 access issues and appeal outcomes. Start with the appeal link in your OpenAI email notice.',
    },
    links: [
      {
        href: '/appeal#codex',
        label: {
          zh: 'Codex / OpenAI 官方申诉入口',
          en: 'Official OpenAI appeal',
        },
      },
      {
        href: '/tips/chatgpt-plus-iphone-subscription',
        label: {
          zh: 'ChatGPT Plus 与 Codex 订阅核对',
          en: 'ChatGPT Plus & Codex subscription guide',
        },
      },
      {
        href: '/radar',
        label: {
          zh: '24 小时额度重置雷达',
          en: '24h quota reset radar',
        },
      },
    ],
  },
  antigravity: {
    title: {
      zh: 'Antigravity 403、服务停用记录与官方申诉入口 · 号没了',
      en: 'Antigravity 403 errors, service suspensions & official appeals · Haomeile',
    },
    description: (total, date) => ({
      zh: `收录 Google Antigravity 403 报错、服务停用、地区限制与 Starter Quota 异常案例（截至 ${date} 共 ${total} 条公开记录），附官方申诉表单与订阅排查步骤。`,
      en: `Public cases of Google Antigravity 403 errors, service suspensions, regional limits and Starter Quota issues (${total} records as of ${date}), with the official appeal form and setup guides.`,
    }),
    intro: {
      zh: '收录 Google Antigravity 服务停用、403 权限拒绝、地区支持与付费额度异常的公开经历。个人账号停用请用受影响的 Google 账号提交官方申诉表单。',
      en: 'Public user submissions and community summaries covering Google Antigravity service suspensions, 403 permission errors, regional availability and Starter Quota issues, with official appeal links.',
    },
    links: [
      {
        href: '/appeal#antigravity',
        label: {
          zh: 'Antigravity 官方申诉与 403 说明',
          en: 'Antigravity official appeal & 403 help',
        },
      },
      {
        href: '/tips/antigravity-paid-plan-starter-quota',
        label: {
          zh: '付费后仍显示 Starter Quota 排查',
          en: 'Paid plan still showing Starter Quota',
        },
      },
      {
        href: '/tips/antigravity-first-install-google-ai-pro',
        label: {
          zh: 'Antigravity 登录与 Pro 开通核对',
          en: 'Antigravity install & Pro setup',
        },
      },
      {
        href: '/radar',
        label: {
          zh: '24 小时额度重置雷达',
          en: '24h quota reset radar',
        },
      },
    ],
  },
};

export async function servePage(
  c: Context<AppEnv>,
  readRadarOverview?: ReadRadarOverview,
): Promise<Response> {
  const url = new URL(c.req.url);
  const site = siteOrigin(c.env.SITE_ORIGIN);
  const requestedPath = basePath(url.pathname);
  // Normalize static HTML aliases internally; redirects would drop locale or edit queries.
  const radarPage = /^\/radar(?:\/index\.html|\.html)?\/?$/.test(requestedPath);
  const path = radarPage
    ? '/radar'
    : requestedPath
        .replace(/\/index\.html$/, '/')
        .replace(/\.html$/, '')
        .replace(/\/$/, '') || '/';
  const locale = routeLocale(url.pathname);
  const text = (zh: string, en: string) => (locale === 'en' ? en : zh);
  const labels = getLabels(locale);
  const pageRequest = radarPage
    ? new Request(new URL(localePath(path, locale), url), c.req.raw)
    : c.req.raw;
  const rewriter = languageRewriter(pageRequest, site)
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
  let radarAccessible = false;
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
    ].includes(path) ||
    /^\/tips\/[a-z0-9-]+$/.test(path)
  )
    assetPath = path + '/';
  if (path === '/radar') {
    c.header('Cache-Control', 'private, no-store');
    radarAccessible =
      c.env.RADAR_HUMAN_CHECK === 'false' || (await hasRadarPass(c));
    assetPath = radarAccessible ? '/radar/' : '/_templates/radar-gate/';
    const overview = radarAccessible ? readRadarOverview?.() : null;
    if (overview) {
      const formattedAt = new Intl.DateTimeFormat(
        locale === 'en' ? 'en-GB' : 'zh-CN',
        { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Singapore' },
      ).format(new Date(overview.generatedAt));
      const label = overview.stale
        ? text('最近一次预测', 'Last available forecast')
        : text('预测更新时间', 'Forecast updated');
      const subLabel = escapeHtml(
        text('未来 24 小时重置概率', '24h reset probability'),
      );
      const cards = overview.platforms.map(({ name, probability }) => {
        const pct = Math.max(0, Math.min(100, Number(probability) || 0));
        return `<li><h3>${escapeHtml(name)}</h3><strong>${probability}%</strong><div class="radar-bar" aria-hidden="true"><span style="width:${pct}%"></span></div><span class="radar-sub">${subLabel}</span></li>`;
      });
      rewriter.on('[data-ssr="radar-overview"]', {
        element: (el) => {
          el.setInnerContent(
            `<ul class="radar-forecasts" role="list">${cards.join('')}</ul><p class="radar-updated">${label} <time datetime="${escapeHtml(overview.generatedAt)}">${escapeHtml(formattedAt)} (UTC+8)</time></p>`,
            { html: true },
          );
        },
      });
      if (overview.history.length) {
        rewriter
          .on('[data-ssr="radar-history"]', {
            element: (el) => {
              el.removeAttribute('hidden');
            },
          })
          .on('[data-radar-trend]', {
            element: (el) => {
              el.setAttribute(
                'data-radar-trend',
                safeJson({
                  generatedAt: overview.generatedAt,
                  series: overview.history,
                }),
              );
            },
          });
      }
    }
  }
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
    const tally = renderTally(
      stats,
      vendor ? label(labels.vendor, vendor) : '',
      locale,
    );
    if (tally) {
      rewriter.on('[data-ssr="tally-section"]', {
        element: (el) => {
          el.removeAttribute('hidden');
        },
      });
      rewriter.on('[data-ssr="tally"]', {
        element: (el) => {
          el.setInnerContent(tally, { html: true });
        },
      });
    }
    if (stats.timeline.some((day) => day.reported > 0 || day.occurred > 0)) {
      rewriter.on('[data-ssr="timeline-section"]', {
        element: (el) => {
          el.removeAttribute('hidden');
        },
      });
      rewriter.on('[data-ssr="timeline"]', {
        element: (el) => {
          el.setInnerContent(renderTimeline(stats, locale), { html: true });
        },
      });
    }
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
      const totalRecords = stats.total + (stats.community_total || 0);
      const seo = VENDOR_SEO[vendor];
      const pageTitle = seo
        ? seo.title[locale]
        : text(
            `${name} 账号停用、封号经历 · 号没了`,
            `${name} account suspensions · Haomeile`,
          );
      const pageDescription = seo
        ? seo.description(totalRecords, stats.date)[locale]
        : text(
            `${name} 账号停用、地区限制、验证卡住等经历：共 ${totalRecords} 条公开记录，截至 ${stats.date}。`,
            `${name} account suspensions, regional restrictions and verification problems: ${totalRecords} public records as of ${stats.date}.`,
          );
      rewriter.on('[data-ssr="page-title"]', {
        element: (el) => {
          el.setInnerContent(
            text(`${name} 账号的墓碑`, `${name} account memorials`),
          );
        },
      });
      if (totalRecords > 0) {
        const [eventRows, appealRows] = await c.env.DB.batch<{
          k: string;
          n: number;
        }>([
          c.env.DB.prepare(
            "SELECT event_type k, COUNT(*) n FROM tombstones WHERE status='approved' AND vendor=? GROUP BY event_type ORDER BY n DESC",
          ).bind(vendor),
          c.env.DB.prepare(
            "SELECT appeal_status k, COUNT(*) n FROM tombstones WHERE status='approved' AND vendor=? GROUP BY appeal_status ORDER BY n DESC",
          ).bind(vendor),
        ]);
        const eventSummary = eventRows!.results
          .map((row) =>
            locale === 'en'
              ? `${label(labels.event_type_short, row.k)} (${row.n})`
              : `${label(labels.event_type_short, row.k)} ${row.n} 条`,
          )
          .join(locale === 'en' ? ', ' : '、');
        const appealSummary = appealRows!.results
          .map((row) => {
            const nameText =
              row.k === 'none'
                ? text('未说明/未申诉', 'Not stated / no appeal')
                : label(labels.appeal_status, row.k);
            return locale === 'en'
              ? `${nameText} (${row.n})`
              : `${nameText} ${row.n} 条`;
          })
          .join(locale === 'en' ? ', ' : '、');
        const summaryCopy =
          locale === 'en'
            ? `Sample breakdown (${totalRecords} public records as of ${stats.date}): Event types — ${eventSummary}. Visible appeal outcomes — ${appealSummary}.`
            : `公开样本分布（截至 ${stats.date} 共 ${totalRecords} 条，含社区整理与用户投稿）：事件类型为${eventSummary}；可见申诉状态为${appealSummary}。`;
        rewriter.on('[data-ssr="vendor-summary"]', {
          element: (el) => {
            el.removeAttribute('hidden');
            el.setInnerContent(summaryCopy);
          },
        });
      }
      if (seo) {
        rewriter.on('[data-ssr="vendor-intro"]', {
          element: (el) => {
            el.setInnerContent(seo.intro[locale]);
          },
        });
        rewriter.on('[data-ssr="vendor-links"]', {
          element: (el) => {
            el.setInnerContent(
              seo.links
                .map(
                  (item) =>
                    `<a href="${escapeHtml(localePath(item.href, locale))}">${escapeHtml(item.label[locale])}</a>`,
                )
                .join(''),
              { html: true },
            );
          },
        });
      }
      metadata(
        rewriter,
        pageTitle,
        pageDescription,
        localePath(`/v/${vendor}`, locale),
        totalRecords >= 5 ? undefined : 'noindex,follow',
        [
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: pageTitle.replace(/ · (?:号没了|Haomeile)$/, ''),
            description: pageDescription,
            url: site + localePath(`/v/${vendor}`, locale),
            inLanguage: locale === 'en' ? 'en' : 'zh-CN',
            isPartOf: {
              '@type': 'WebSite',
              name: locale === 'en' ? 'Haomeile' : '号没了',
              url: site + localePath('/', locale),
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
    const vendorLabel = label(labels.vendor, tomb.vendor);
    rewriter.on('[data-ssr="detail-related"]', {
      element: (el) => {
        const vendorHref = escapeHtml(localePath(`/v/${tomb.vendor}`, locale));
        const appealHref = escapeHtml(
          localePath(`/appeal#${tomb.vendor}`, locale),
        );
        const tipsHref = escapeHtml(localePath('/tips', locale));
        el.setInnerContent(
          `<a href="${vendorHref}">${escapeHtml(text(`更多 ${vendorLabel} 案例`, `More ${vendorLabel} cases`))}</a>` +
            `<a href="${appealHref}">${escapeHtml(text(`${vendorLabel} 官方申诉入口`, `Official ${vendorLabel} appeal`))}</a>` +
            `<a href="${tipsHref}">${escapeHtml(text('使用小技巧与排查指南', 'Tips & troubleshooting'))}</a>`,
          { html: true },
        );
      },
    });
    rewriter.on('[data-tomb-id]', {
      element: (el) => {
        el.setAttribute('data-tomb-id', tomb.id);
      },
    });
    const eventShort = label(labels.event_type_short, tomb.event_type);
    const title = text(
      `${view.codename}：${zhEventTitle(vendorLabel, eventShort)} · 号没了`,
      `${view.codename}: ${vendorLabel} — ${eventShort} · Haomeile`,
    );
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': view.community ? 'Article' : 'DiscussionForumPosting',
        headline: title.replace(/ · (?:号没了|Haomeile)$/, ''),
        text: view.story,
        url: site + localePath(path, locale),
        mainEntityOfPage: site + localePath(path, locale),
        ...(view.community
          ? { inLanguage: locale === 'en' ? 'en' : 'zh-CN' }
          : {}),
        datePublished: tomb.approved_at,
        dateModified: tomb.updated_at,
        author: {
          '@type': view.community ? 'Organization' : 'Person',
          name: view.community
            ? 'Haomeile'
            : tomb.nickname || text('匿名用户', 'Anonymous user'),
        },
        publisher: {
          '@type': 'Organization',
          name: 'Haomeile',
          url: site + '/',
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
            name: vendorLabel,
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
  const publicAnalyticsPage =
    status === 200 &&
    c.env.ENVIRONMENT === 'production' &&
    url.origin === DEFAULT_SITE_ORIGIN &&
    site === DEFAULT_SITE_ORIGIN &&
    ((path === '/radar' && radarAccessible) ||
      /^\/(?:appeal|privacy|about|tips)?$/.test(path) ||
      /^\/(?:v|t|tips)\/[^/]+$/.test(path));
  const analyticsToken = publicAnalyticsPage
    ? c.env.CLOUDFLARE_WEB_ANALYTICS_TOKEN?.trim()
    : undefined;
  const ga4MeasurementId = c.env.GA4_MEASUREMENT_ID?.trim() ?? '';
  const googleAnalytics =
    publicAnalyticsPage && /^G-[A-Z0-9]{10}$/.test(ga4MeasurementId);
  if (analyticsToken) {
    const beacon = escapeHtml(JSON.stringify({ token: analyticsToken }));
    rewriter.on('body', {
      element: (el) => {
        el.append(
          `<script defer src="${WEB_ANALYTICS_BEACON}" data-cf-beacon="${beacon}"></script>`,
          { html: true },
        );
      },
    });
  }
  if (googleAnalytics) {
    rewriter.on('head', {
      element: (el) => {
        el.append(
          `<script defer src="/assets/ga4.js" data-ga4-measurement-id="${ga4MeasurementId}"></script>`,
          { html: true },
        );
      },
    });
  }
  const webAnalytics = Boolean(analyticsToken);
  const analyticsEnabled = webAnalytics || googleAnalytics;
  if (path === '/privacy') {
    rewriter
      .on('[data-web-analytics-disclosure]', {
        element: (el) => {
          if (analyticsEnabled) el.removeAttribute('hidden');
          else el.remove();
        },
      })
      .on('[data-cloudflare-analytics-disclosure]', {
        element: (el) => {
          if (!webAnalytics) el.remove();
        },
      })
      .on('[data-ga4-disclosure]', {
        element: (el) => {
          if (!googleAnalytics) el.remove();
        },
      })
      .on('[data-web-analytics-disabled]', {
        element: (el) => {
          if (analyticsEnabled) el.remove();
        },
      });
  }
  const response = rewriter.transform(
    new Response(localizeTemplate(await asset.text(), locale, site), {
      status,
      headers: asset.headers,
    }),
  );
  response.headers.set(
    'Cache-Control',
    path === '/radar'
      ? 'private, no-store'
      : path === '/admin'
        ? 'no-store'
        : 'public, max-age=60, s-maxage=300',
  );
  if (path === '/radar') response.headers.append('Vary', 'Cookie');
  if (analyticsEnabled) {
    response.headers.set(
      'Content-Security-Policy',
      contentSecurityPolicy({ webAnalytics, googleAnalytics }),
    );
    response.headers.set('Referrer-Policy', REFERRER_POLICY);
  }
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
  const locale = routeLocale(new URL(c.req.url).pathname);
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
