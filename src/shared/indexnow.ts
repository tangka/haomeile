import { localePath } from './i18n';
import { DEFAULT_SITE_ORIGIN, siteOrigin } from './site';

export const INDEXNOW_KEY = '054c21195d544e2ebed6055242e97091';
export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
export const WEBSUB_HUB = 'https://pubsubhubbub.appspot.com/';
export const BAIDU_PUSH_ENDPOINT = 'http://data.zz.baidu.com/urls';

const NON_LOCALIZED_PATHS = new Set(['/llms.txt', '/llms-full.txt', '/sitemap.xml']);

/** Expand relative site paths into deduplicated canonical Chinese & English URLs. */
export function expandNotificationUrls(
  paths: readonly string[],
  configuredOrigin = DEFAULT_SITE_ORIGIN,
): string[] {
  const site = siteOrigin(configuredOrigin);
  const urls = new Set<string>();
  for (const raw of paths) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    let pathname = trimmed;
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const parsed = new URL(trimmed);
        if (parsed.origin !== site) continue;
        pathname = parsed.pathname;
      } catch {
        continue;
      }
    }
    if (!pathname.startsWith('/') || pathname.startsWith('//')) continue;
    if (NON_LOCALIZED_PATHS.has(pathname)) {
      urls.add(site + pathname);
      continue;
    }
    urls.add(site + localePath(pathname, 'zh'));
    urls.add(site + localePath(pathname, 'en'));
  }
  return [...urls];
}
