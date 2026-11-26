import { VENDORS } from './types';
import { SUPPORTED_VENDOR_FILTER } from './lib/store';
import { isThinCommunity } from '../shared/community';
import { localePath } from '../shared/i18n';
import { TIP_PATHS } from '../shared/tips';
import { isValidReportMonth, REPORT_MIN_RECORDS } from './report';

import { DEFAULT_SITE_ORIGIN, siteOrigin } from '../shared/site';
const NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
// Each tombstone produces two localized URLs, with room for static/product pages.
export const SITEMAP_PAGE_SIZE = 22_500;
const STATIC_PATHS = [
  '/',
  '/epitaph',
  '/appeal',
  '/tips',
  '/radar',
  '/privacy',
  '/about',
  ...TIP_PATHS,
];
interface SitemapEntry {
  path: string;
  modified?: string | null;
}
interface TombEntry {
  id: string;
  updated_at: string;
  origin: string;
  story: string | null;
}

export function escapeXml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]!,
  );
}
function lastmod(value?: string | null): string {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z)?$/.test(value)
  )
    return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `<lastmod>${escapeXml(value)}</lastmod>`;
}
function urlset(entries: SitemapEntry[], site: string): string {
  const urls = entries
    .map((entry) => {
      const zh = escapeXml(site + localePath(entry.path, 'zh'));
      const en = escapeXml(site + localePath(entry.path, 'en'));
      const alternates = `<xhtml:link rel="alternate" hreflang="zh-CN" href="${zh}"/><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="x-default" href="${zh}"/>`;
      return [zh, en]
        .map(
          (href) =>
            `<url><loc>${href}</loc>${lastmod(entry.modified)}${alternates}</url>`,
        )
        .join('');
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="${NAMESPACE}" xmlns:xhtml="${XHTML_NAMESPACE}">${urls}</urlset>`;
}
function xmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

// The caller supplies the timestamp from version/build metadata. When it is unknown,
// omit a static lastmod rather than inventing a deployment date at request time.
export async function sitemapResponse(
  db: D1Database,
  url: URL,
  deployedAt?: string,
  configuredOrigin = DEFAULT_SITE_ORIGIN,
): Promise<Response | null> {
  const site = siteOrigin(configuredOrigin);
  const path = url.pathname;
  const root = path === '/sitemap.xml',
    staticMap = path === '/sitemaps/static.xml';
  const part = /^\/sitemaps\/tombstones-([1-9]\d{0,8})\.xml$/.exec(path);
  if (!root && !staticMap && !part) return null;

  const metadata = await db.batch<{
    total?: number;
    vendor?: string;
    month?: string;
    n?: number;
    modified?: string;
  }>([
    db.prepare(
      `SELECT COUNT(*) total FROM tombstones WHERE status='approved' AND ${SUPPORTED_VENDOR_FILTER}`,
    ),
    db.prepare(
      `SELECT vendor,COUNT(*) n,MAX(updated_at) modified FROM tombstones WHERE status='approved' AND ${SUPPORTED_VENDOR_FILTER} GROUP BY vendor HAVING COUNT(*)>=5`,
    ),
    db.prepare(
      `SELECT strftime('%Y-%m', datetime(approved_at, '+8 hours')) month,COUNT(*) n,MAX(updated_at) modified FROM tombstones WHERE status='approved' AND approved_at IS NOT NULL AND ${SUPPORTED_VENDOR_FILTER} GROUP BY month HAVING COUNT(*)>=${REPORT_MIN_RECORDS} ORDER BY month DESC`,
    ),
  ]);
  const count = Number(metadata[0]!.results[0]?.total || 0);
  const vendors = new Map(
    metadata[1]!.results.map((row) => [row.vendor, row.modified]),
  );
  const reportMonths = (metadata[2]?.results ?? []).filter(
    (row): row is { month: string; modified?: string } =>
      typeof row.month === 'string' && isValidReportMonth(row.month),
  );
  const staticEntries: SitemapEntry[] = [
    ...STATIC_PATHS.map((path) => ({ path, modified: deployedAt })),
    ...VENDORS.filter((vendor) => vendors.has(vendor)).map((vendor) => ({
      path: '/v/' + vendor,
      modified: vendors.get(vendor),
    })),
    ...reportMonths.map(({ month, modified }) => ({
      path: '/report/' + month,
      modified,
    })),
  ];
  if (staticMap) return xmlResponse(urlset(staticEntries, site));
  if (root && count > SITEMAP_PAGE_SIZE) {
    const children = [
      '/sitemaps/static.xml',
      ...Array.from(
        { length: Math.ceil(count / SITEMAP_PAGE_SIZE) },
        (_, index) => `/sitemaps/tombstones-${index + 1}.xml`,
      ),
    ];
    return xmlResponse(
      `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="${NAMESPACE}">${children.map((path) => `<sitemap><loc>${escapeXml(site + path)}</loc></sitemap>`).join('')}</sitemapindex>`,
    );
  }
  const page = part ? Number(part[1]) : 1;
  if (part && page > Math.ceil(count / SITEMAP_PAGE_SIZE)) return null;
  const { results } = await db
    .prepare(
      `SELECT id,updated_at,origin,story FROM tombstones WHERE status='approved' AND ${SUPPORTED_VENDOR_FILTER} ORDER BY id LIMIT ? OFFSET ?`,
    )
    .bind(SITEMAP_PAGE_SIZE, (page - 1) * SITEMAP_PAGE_SIZE)
    .all<TombEntry>();
  const tombEntries = results
    .filter((row) => !isThinCommunity(row))
    .map((row) => ({
      path: '/t/' + encodeURIComponent(row.id),
      modified: row.updated_at,
    }));
  return xmlResponse(
    urlset(root ? [...staticEntries, ...tombEntries] : tombEntries, site),
  );
}
