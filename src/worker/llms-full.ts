import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';
import { APPEAL_GUIDES } from '../shared/appeals';
import { TIP_ARTICLES, tipLinkHref, tipSeoTitle } from '../shared/tips';
import { tombPresentation } from '../shared/tomb-presentation';
import type { ReadRadarOverview } from '../shared/radar';
import { LABELS } from '../site/scripts/labels';
import { listTombstones, SUPPORTED_VENDOR_FILTER } from './lib/store';

export async function llmsFullResponse(
  db: D1Database,
  configuredOrigin = DEFAULT_SITE_ORIGIN,
  readRadarOverview?: ReadRadarOverview,
): Promise<Response> {
  const site = siteOrigin(configuredOrigin);
  const [recentPage, countRows] = await Promise.all([
    listTombstones(db, {}),
    db.batch<{ vendor: string; event_type: string; appeal_status: string; n: number }>([
      db.prepare(
        `SELECT vendor, event_type, appeal_status, COUNT(*) n FROM tombstones WHERE status='approved' AND ${SUPPORTED_VENDOR_FILTER} GROUP BY vendor, event_type, appeal_status`,
      ),
    ]),
  ]);

  const byVendor = new Map<string, number>();
  for (const row of countRows[0]!.results) {
    byVendor.set(row.vendor, (byVendor.get(row.vendor) ?? 0) + Number(row.n));
  }

  const lines: string[] = [
    '# 号没了 (Haomeile) — Complete Site Knowledge Base',
    '',
    `> Source: ${site}/ (Chinese) and ${site}/en/ (English)`,
    `> Sitemap: ${site}/sitemap.xml | Atom Feeds: ${site}/feed.xml , ${site}/en/feed.xml`,
    '',
    'Haomeile documents firsthand Claude, Codex, and Antigravity account suspensions, 403/verification issues, official appeal channels, subscription troubleshooting guides, and 24-hour extra quota reset probability forecasts (Reset Radar).',
    '',
  ];

  const radar = readRadarOverview?.();
  if (radar) {
    lines.push('## Live Reset Radar (24-Hour Extra Quota Reset Forecast)');
    lines.push(`- URL: ${site}/radar (EN: ${site}/en/radar)`);
    lines.push(`- Updated: ${radar.generatedAt}`);
    for (const p of radar.platforms) {
      lines.push(`- ${p.name}: ${p.probability}%`);
    }
    lines.push(
      '- Free email alerts: users can opt in on /radar to receive a one-time alert per high-probability episode (> 80%) per selected platform.',
    );
    lines.push('');
  }

  lines.push('## Official Appeal Channels & Product Appeal Guides');
  lines.push(`- Overview: ${site}/appeal (EN: ${site}/en/appeal)`);
  for (const guide of APPEAL_GUIDES) {
    lines.push(
      `- ${guide.name} appeal guide: ${site}${guide.path} (EN: ${site}/en${guide.path})`,
    );
    lines.push(
      `  - Official appeal URL: ${guide.appealUrl} | Official help: ${guide.helpUrl}`,
    );
    lines.push(`  - Summary (ZH): ${guide.lead.zh}`);
    lines.push(`  - Summary (EN): ${guide.lead.en}`);
  }
  lines.push('');

  lines.push('## Public Case Counts by Product');
  for (const vendor of ['claude', 'codex', 'antigravity'] as const) {
    const name = LABELS.vendor[vendor];
    const count = byVendor.get(vendor) ?? 0;
    lines.push(
      `- ${name}: ${count} public records — ${site}/v/${vendor} (EN: ${site}/en/v/${vendor})`,
    );
  }
  lines.push('');

  lines.push('## Practical Troubleshooting & Subscription Guides');
  const sortedTips = [...TIP_ARTICLES].sort((a, b) =>
    b.sourcePublishedAt.localeCompare(a.sourcePublishedAt),
  );
  for (const tip of sortedTips) {
    lines.push(`### ${tipSeoTitle(tip, 'zh')} / ${tipSeoTitle(tip, 'en')}`);
    lines.push(`- URL: ${site}/tips/${tip.slug} (EN: ${site}/en/tips/${tip.slug})`);
    lines.push(
      `- Source: ${tip.source} (${tip.sourceAuthor}, ${tip.sourcePublishedAt.slice(0, 10)})`,
    );
    lines.push(`- Summary (ZH): ${tip.summary.zh}`);
    lines.push(`- Summary (EN): ${tip.summary.en}`);
    const officialLinks = tip.steps
      .map((s) => (s.link ? tipLinkHref(s.link.href, 'en') : null))
      .filter((href): href is string => Boolean(href));
    if (officialLinks.length) {
      lines.push(`- Official references: ${officialLinks.join(', ')}`);
    }
    lines.push('');
  }

  lines.push('## Latest Public Account Suspension Cases');
  for (const tomb of recentPage.items.slice(0, 15)) {
    const zh = tombPresentation(tomb, 'zh');
    const en = tombPresentation(tomb, 'en');
    const vendorName = LABELS.vendor[tomb.vendor] ?? tomb.vendor;
    const eventName = LABELS.event_type_short[tomb.event_type] ?? tomb.event_type;
    lines.push(`- [${zh.codename}](${site}/t/${tomb.id}) (${vendorName} · ${eventName}${tomb.source_published_at ? ` · ${tomb.source_published_at}` : ''})`);
    lines.push(`  - ZH: ${zh.story}`);
    if (en.story !== zh.story) lines.push(`  - EN: ${en.story}`);
    if (zh.source) lines.push(`  - Original post: ${zh.source}`);
  }
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
