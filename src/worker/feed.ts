import { localePath, type Locale } from '../shared/i18n';
import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';
import { TIP_ARTICLES, tipSeoTitle } from '../shared/tips';
import { tombPresentation } from '../shared/tomb-presentation';
import type { ReadRadarOverview } from '../shared/radar';
import { getLabels } from '../site/scripts/labels';
import { listTombstones } from './lib/store';
import { escapeXml } from './sitemap';
import { WEBSUB_HUB } from '../shared/indexnow';

interface FeedEntry {
  id: string;
  url: string;
  title: string;
  summary: string;
  updated: string;
  published?: string;
}

function isoDate(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

export async function feedResponse(
  db: D1Database,
  locale: Locale,
  configuredOrigin = DEFAULT_SITE_ORIGIN,
  readRadarOverview?: ReadRadarOverview,
): Promise<Response> {
  const site = siteOrigin(configuredOrigin);
  const labels = getLabels(locale);
  const feedPath = locale === 'en' ? '/en/feed.xml' : '/feed.xml';
  const feedUrl = site + feedPath;
  const homeUrl = site + localePath('/', locale);
  const fallbackTime = new Date().toISOString();

  const { items } = await listTombstones(db, {});
  const entries: FeedEntry[] = [];

  const radar = readRadarOverview?.();
  if (radar) {
    const summary = radar.platforms
      .map((p) => `${p.name}: ${p.probability}%`)
      .join(' · ');
    entries.push({
      id: `${site}${localePath('/radar', locale)}#${radar.generatedAt}`,
      url: site + localePath('/radar', locale),
      title:
        locale === 'en'
          ? 'Reset Radar — Unofficial 24h Quota Reset Estimate'
          : '重置雷达 — 未来 24 小时额度重置估计（非官方）',
      summary:
        locale === 'en'
          ? `Latest unofficial 24-hour quota reset estimates: ${summary}. Free email alerts available above 80%.`
          : `最新未来 24 小时额度重置的非官方估计：${summary}。支持超过 80% 时免费邮件提醒。`,
      updated: isoDate(radar.generatedAt, fallbackTime),
    });
  }

  for (const tip of TIP_ARTICLES) {
    const url = site + localePath(`/tips/${tip.slug}`, locale);
    const published = isoDate(tip.sourcePublishedAt, fallbackTime);
    entries.push({
      id: url,
      url,
      title: tipSeoTitle(tip, locale),
      summary: tip.summary[locale],
      updated: published,
      published,
    });
  }

  for (const tomb of items) {
    const view = tombPresentation(tomb, locale);
    const url = site + localePath(`/t/${tomb.id}`, locale);
    const vendorName = labels.vendor[tomb.vendor] ?? tomb.vendor;
    const eventName = labels.event_type_short[tomb.event_type] ?? tomb.event_type;
    const updated = isoDate(tomb.updated_at || tomb.approved_at, fallbackTime);
    const published = isoDate(tomb.approved_at, updated);
    entries.push({
      id: url,
      url,
      title:
        locale === 'en'
          ? `${view.codename} (${vendorName} — ${eventName})`
          : `${view.codename}（${vendorName} · ${eventName}）`,
      summary: view.story,
      updated,
      published,
    });
  }

  entries.sort((a, b) => b.updated.localeCompare(a.updated));
  const top = entries.slice(0, 40);
  const feedUpdated = top[0]?.updated || fallbackTime;

  const feedTitle =
    locale === 'en'
      ? 'Haomeile — AI Account Bans, Appeals & Reset Radar'
      : '号没了 — Claude、Codex、Antigravity 封号记录、排查指南与重置雷达';
  const feedSubtitle =
    locale === 'en'
      ? 'Latest account suspension stories, official appeal guides, subscription troubleshooting and Reset Radar forecasts.'
      : '最新收录的 AI 账号停用与申诉经历、实用排查指南及 24 小时额度重置概率更新。';

  const xmlEntries = top
    .map((entry) => {
      const published = entry.published
        ? `<published>${escapeXml(entry.published)}</published>`
        : '';
      return `<entry><id>${escapeXml(entry.id)}</id><title>${escapeXml(entry.title)}</title><link rel="alternate" href="${escapeXml(entry.url)}"/><updated>${escapeXml(entry.updated)}</updated>${published}<summary type="text">${escapeXml(entry.summary)}</summary></entry>`;
    })
    .join('');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${locale === 'en' ? 'en' : 'zh-CN'}">` +
    `<id>${escapeXml(feedUrl)}</id>` +
    `<title>${escapeXml(feedTitle)}</title>` +
    `<subtitle>${escapeXml(feedSubtitle)}</subtitle>` +
    `<updated>${escapeXml(feedUpdated)}</updated>` +
    `<link rel="self" type="application/atom+xml" href="${escapeXml(feedUrl)}"/>` +
    `<link rel="alternate" type="text/html" href="${escapeXml(homeUrl)}"/>` +
    `<link rel="hub" href="${escapeXml(WEBSUB_HUB)}"/>` +
    `<author><name>Haomeile</name></author>` +
    xmlEntries +
    `</feed>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
