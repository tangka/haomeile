import { localePath, type Locale } from '../shared/i18n';
import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';
import { TIP_ARTICLES } from '../shared/tips';
import { tombPresentation } from '../shared/tomb-presentation';
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
): Promise<Response> {
  const site = siteOrigin(configuredOrigin);
  const labels = getLabels(locale);
  const feedPath = locale === 'en' ? '/en/feed.xml' : '/feed.xml';
  const feedUrl = site + feedPath;
  const homeUrl = site + localePath('/', locale);
  const fallbackTime = new Date().toISOString();

  const { items } = await listTombstones(db, {});
  const entries: FeedEntry[] = [];

  for (const tip of TIP_ARTICLES) {
    const url = site + localePath(`/tips/${tip.slug}`, locale);
    const published = isoDate(tip.publishedAt, fallbackTime);
    entries.push({
      id: url,
      url,
      title: tip.heading[locale],
      summary: tip.summary[locale],
      updated: isoDate(tip.modifiedAt, published),
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
      ? 'Haomeile — AI Account Bans, Appeals & Guides'
      : '号没了 — Claude、Codex、Antigravity 封号记录与排查指南';
  const feedSubtitle =
    locale === 'en'
      ? 'Latest account suspension stories, official appeal guides and subscription troubleshooting.'
      : '最新收录的 AI 账号停用与申诉经历和实用排查指南。';

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
